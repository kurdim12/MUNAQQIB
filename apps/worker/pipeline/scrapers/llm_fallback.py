"""LLM extraction fallback (CLAUDE.md §7).

When a deterministic parser yields 0 rows from an HTTP-200 page, pipe the visible
text through the configured cheap model with a fixed JSON schema so the pipeline
degrades gracefully while the parser is repaired. Hard cap: 20 calls/day/source.

Worst-case cost: ~6k input + ~1k output tokens on a DeepSeek-class model
(~$0.27/M in, ~$1.10/M out) ⇒ ≈ $0.0027/call ⇒ ≤ $0.054/day/source at the cap.
Negligible, and it never touches client documents — listings are public pages.
"""
from __future__ import annotations

import json
import logging
import re
from datetime import date

from models.schemas import RawTender

logger = logging.getLogger(__name__)

# In-process daily counter. Persisted accounting belongs in the `sources` table;
# this guard is the cheap backstop against a runaway loop within one process.
_calls_today: dict[str, int] = {}
_counter_date = date.today()
DAILY_CAP = 20

_SYSTEM = (
    "أنت مستخرج بيانات. من نص صفحة عطاءات حكومية، استخرج صفوف العطاءات فقط. "
    "أعد JSON صالحاً حصراً بالشكل: "
    '{"tenders":[{"title":"","entity":"","closing_at_raw":"","published_at_raw":"",'
    '"doc_price_raw":"","source_ref":"","url":""}]}. '
    "لا تخمّن: أي حقل غير موجود اتركه فارغاً. لا تضف أي نص خارج JSON."
)

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def _visible_text(html: str, limit: int = 16000) -> str:
    """Cheap HTML→text. Avoids a BeautifulSoup dependency on the fallback path."""
    text = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", html)
    text = _TAG_RE.sub(" ", text)
    text = _WS_RE.sub(" ", text).strip()
    return text[:limit]


def _check_cap(source_id: str) -> bool:
    global _counter_date
    today = date.today()
    if today != _counter_date:
        _calls_today.clear()
        _counter_date = today
    if _calls_today.get(source_id, 0) >= DAILY_CAP:
        logger.error("[%s] LLM fallback daily cap (%d) reached.", source_id, DAILY_CAP)
        return False
    _calls_today[source_id] = _calls_today.get(source_id, 0) + 1
    return True


def extract_rows(source_id: str, html: str, source_url: str) -> list[RawTender]:
    if not _check_cap(source_id):
        return []
    from llm_client import complete  # lazy import

    try:
        raw = complete("fallback", _SYSTEM, _visible_text(html), max_tokens=4096)
    except Exception as exc:  # noqa: BLE001
        logger.error("[%s] LLM fallback call failed: %s", source_id, exc)
        return []

    # Be tolerant of a code fence around the JSON.
    raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("[%s] LLM fallback returned non-JSON.", source_id)
        return []

    rows: list[RawTender] = []
    for item in data.get("tenders", []):
        title = (item.get("title") or "").strip()
        if not title:
            continue
        rows.append(
            RawTender(
                source_id=source_id,
                source_ref=item.get("source_ref") or None,
                title=title,
                entity=item.get("entity") or None,
                published_at_raw=item.get("published_at_raw") or None,
                closing_at_raw=item.get("closing_at_raw") or None,
                doc_price_raw=item.get("doc_price_raw") or None,
                url=item.get("url") or source_url,
            )
        )
    logger.info("[%s] LLM fallback extracted %d rows.", source_id, len(rows))
    return rows
