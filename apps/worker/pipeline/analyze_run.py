"""Analyzer producer (Layer 11) — drains the `analyses` queue.

The web app enqueues a row (`status='queued'`) when a user hits "تشغيل محرّك
الذكاء" on an Opportunity Report. This stage is the other half: it claims queued
rows, fetches the tender's document, runs the two-pass `analyze_document`, and
writes the result back in place so the report flips from war-room to a real
brief. Run daily after the digest (or on demand):

    python -m pipeline.run analyze            # drain the queue (default cap)
    python -m pipeline.run analyze --limit 3

Document fetch reuses the scraper anti-fragility (CLAUDE.md §7): direct GET, and
for hosts that bot-wall datacenter IPs (GTD) a reader-proxy fallback. A real PDF
كرّاسة is parsed with pypdf; a gov detail/announcement page degrades to its clean
text. Cost stays bounded by the analyzer's own input caps (< 1 JOD/doc).
"""
from __future__ import annotations

import logging
import re

import httpx

from config import settings
from db import claim_queued_analyses, get_org_profile, update_analysis
from models.schemas import OrgProfile

from .analyze import analyze_document, extract_text

logger = logging.getLogger(__name__)

# Below this, a 200 is a bot-wall shell, not a document (mirrors gtd.py).
_BOT_WALL_MAX_BYTES = 2000
_HEADERS = {
    "User-Agent": settings.scraper_user_agent,
    "Accept-Language": "ar,en;q=0.8",
}


def fetch_doc_text(url: str) -> tuple[str, int]:
    """Return (text, pages) for a tender document URL.

    PDF → pypdf via `extract_text`. HTML gov page → clean text, fetched through
    the reader proxy when a direct GET is empty/bot-walled. Returns ("", 0) when
    nothing usable comes back (caller marks the analysis failed)."""
    try:
        with httpx.Client(headers=_HEADERS, timeout=45, follow_redirects=True) as c:
            resp = c.get(url)
        ctype = resp.headers.get("content-type", "").lower()
        body = resp.content or b""

        if "pdf" in ctype or url.lower().endswith(".pdf"):
            text, pages = extract_text(body, "application/pdf")
            if text.strip():
                return text, pages

        html = resp.text or ""
        if _is_bot_walled(html):
            html = _fetch_via_reader(url) or html
        text = _html_to_text(html)
        return text, (1 if text else 0)
    except httpx.HTTPError as exc:
        logger.warning("[analyze] fetch failed for %s: %s", url, exc)
        return "", 0


def _is_bot_walled(html: str) -> bool:
    return len(html or "") < _BOT_WALL_MAX_BYTES


def _fetch_via_reader(url: str) -> str | None:
    """Fetch a page's text through the reader proxy (markdown mode = clean text)."""
    proxy = (settings.scraper_reader_proxy or "").strip()
    if not proxy:
        return None
    try:
        with httpx.Client(headers=_HEADERS, timeout=45, follow_redirects=True) as c:
            resp = c.get(proxy + url)
        return resp.text or None
    except httpx.HTTPError as exc:
        logger.warning("[analyze] reader proxy failed for %s: %s", url, exc)
        return None


def _html_to_text(html: str) -> str:
    """Strip markup to readable text. The reader proxy already returns markdown;
    this also handles a raw-HTML direct fetch."""
    if not html:
        return ""
    if "<" not in html:  # already markdown/plain (reader proxy default)
        return html.strip()
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    return re.sub(r"\n{3,}", "\n\n", soup.get_text("\n", strip=True))


def _analyze_one(row: dict, *, complete_fn=None) -> str:
    """Analyze a single claimed row; returns its final status."""
    analysis_id = row["analysis_id"]
    tender = {
        "title": row.get("tender_title") or "",
        "entity": row.get("tender_entity") or "",
    }
    url = row.get("tender_url") or ""

    profile = get_org_profile(row["org_id"]) if row.get("org_id") else None
    if profile is None:
        profile = OrgProfile(name="—", sector="contracting")

    text, pages = fetch_doc_text(url)
    if not text.strip():
        update_analysis(analysis_id, "failed", None, 0, 0.0, file_path=url)
        logger.warning("[analyze] %s: no document text at %s", analysis_id, url)
        return "failed"

    kwargs = {"complete_fn": complete_fn} if complete_fn is not None else {}
    result = analyze_document(text, pages, tender, profile, **kwargs)
    update_analysis(
        analysis_id, result.status, result.brief, result.pages,
        result.cost_usd, file_path=url,
    )
    logger.info(
        "[analyze] %s → %s (pages=%d, cost=$%.4f)",
        analysis_id, result.status, result.pages, result.cost_usd,
    )
    return result.status


def run_analyze(limit: int = 5, *, complete_fn=None) -> dict[str, int]:
    """Drain up to `limit` queued analyses. Returns a {status: count} tally."""
    rows = claim_queued_analyses(limit)
    tally: dict[str, int] = {}
    if not rows:
        logger.info("[analyze] queue empty")
        return tally
    logger.info("[analyze] draining %d queued analyses", len(rows))
    for row in rows:
        try:
            status = _analyze_one(row, complete_fn=complete_fn)
        except Exception as exc:  # noqa: BLE001 — one bad doc must not stop the drain
            logger.error("[analyze] %s crashed: %s", row.get("analysis_id"), exc)
            update_analysis(row["analysis_id"], "failed", None, 0, 0.0)
            status = "failed"
        tally[status] = tally.get(status, 0) + 1
    return tally
