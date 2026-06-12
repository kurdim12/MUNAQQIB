"""Arabic text normalization + RawTender → Tender normalization (CLAUDE.md §6.5).

`norm_ar()` is the single source of truth for Arabic comparison: it is used by
the matcher's keyword pass and by the dedupe hash, so any change here must be
covered by the golden tests in `tests/test_normalize.py`.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import date, datetime, timezone

from models.schemas import RawTender, Tender

# Arabic-Indic and Eastern Arabic-Indic digits → ASCII.
_DIGIT_MAP = {ord(c): str(i % 10) for i, c in enumerate("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹")}

# Tashkeel (harakat) + tatweel to strip.
_TASHKEEL = "".join(
    [
        "ؐ", "ؑ", "ؒ", "ؓ", "ؔ", "ؕ",
        "ً", "ٌ", "ٍ", "َ", "ُ", "ِ",
        "ّ", "ْ", "ٓ", "ٔ", "ٕ", "ٖ",
        "ـ",  # tatweel ـ
    ]
)
_TASHKEEL_RE = re.compile(f"[{_TASHKEEL}]")

# Letter unifications per spec (CLAUDE.md §6.5): alef variants → ا, teh-marbuta
# → ه, alef-maqsura → ي. Standalone/seated hamza (ء/ؤ/ئ) is intentionally left
# intact — the spec does not fold it, and the golden tests pin this behavior.
_LETTER_MAP = {
    "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا",
    "ة": "ه",
    "ى": "ي",
}
_LETTER_TABLE = {ord(k): v for k, v in _LETTER_MAP.items()}

_WS_RE = re.compile(r"\s+")


def norm_ar(text: str | None) -> str:
    """Normalize Arabic text for comparison.

    Steps (order matters):
      1. Unicode NFKC (collapse presentation forms, normalize widths).
      2. Strip tashkeel + tatweel.
      3. Map Arabic-Indic digits → ASCII.
      4. Unify alef/teh-marbuta/alef-maqsura/hamza variants.
      5. Lowercase latin, collapse whitespace, trim.
    """
    if not text:
        return ""
    text = unicodedata.normalize("NFKC", text)
    text = _TASHKEEL_RE.sub("", text)
    text = text.translate(_DIGIT_MAP)
    text = text.translate(_LETTER_TABLE)
    text = text.lower()
    text = _WS_RE.sub(" ", text).strip()
    return text


def to_ascii_digits(text: str | None) -> str:
    """Map Arabic-Indic digits to ASCII without touching anything else."""
    if not text:
        return ""
    return text.translate(_DIGIT_MAP)


# ---------------------------------------------------------------------------
# Date / money parsing for source rows
# ---------------------------------------------------------------------------
_DATE_RE = re.compile(r"(\d{1,4})\s*[/\-\.]\s*(\d{1,2})\s*[/\-\.]\s*(\d{1,4})")
_MONEY_RE = re.compile(r"\d+(?:\.\d+)?")


def parse_date(raw: str | None) -> date | None:
    """Best-effort date parse from a source string. Handles Arabic-Indic digits
    and dd/mm/yyyy or yyyy/mm/dd ordering. Returns None on failure (never raises)."""
    if not raw:
        return None
    m = _DATE_RE.search(to_ascii_digits(raw))
    if not m:
        return None
    a, b, c = (int(x) for x in m.groups())
    # Disambiguate ordering by which field looks like a 4-digit year.
    if a > 31:  # yyyy/mm/dd
        year, month, day = a, b, c
    else:  # dd/mm/yyyy
        day, month, year = a, b, c
    if year < 100:
        year += 2000
    try:
        return date(year, month, day)
    except ValueError:
        return None


def parse_datetime_utc(raw: str | None) -> datetime | None:
    """Parse a closing date into a tz-aware UTC datetime. Tenders close at
    end-of-day Amman if no time is given; we store the date at 00:00 UTC and let
    the closing sweep / display layer apply Amman semantics (DECISIONS.md)."""
    d = parse_date(raw)
    if d is None:
        return None
    return datetime(d.year, d.month, d.day, tzinfo=timezone.utc)


def parse_money_jod(raw: str | None) -> float | None:
    if not raw:
        return None
    # Map Arabic-Indic digits, the Arabic decimal separator (٫ U+066B) → '.',
    # and drop thousands separators.
    cleaned = to_ascii_digits(raw).replace("٫", ".").replace("٬", "").replace(",", "")
    m = _MONEY_RE.search(cleaned)
    return float(m.group(0)) if m else None


def normalize_tender(raw: RawTender) -> Tender:
    """RawTender → Tender. Pure: no DB, no network. Hash is computed in dedupe."""
    return Tender(
        source_id=raw.source_id,
        source_ref=raw.source_ref,
        title=_WS_RE.sub(" ", (raw.title or "").strip()),
        entity=(raw.entity or None),
        category=(raw.category or None),
        governorate=(raw.governorate or None),
        published_at=parse_date(raw.published_at_raw),
        closing_at=parse_datetime_utc(raw.closing_at_raw),
        site_visit_at=parse_datetime_utc(raw.site_visit_at_raw),
        doc_price_jod=parse_money_jod(raw.doc_price_raw),
        url=raw.url,
        raw_html_path=raw.raw_html_path,
    )
