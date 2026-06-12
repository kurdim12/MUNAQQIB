"""Asia/Amman time helpers. Storage is UTC; display is Amman (DECISIONS.md)."""
from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

AMMAN = ZoneInfo("Asia/Amman")

# Arabic month names for digest display.
_AR_MONTHS = [
    "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
    "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول",
]


def now_amman() -> datetime:
    return datetime.now(AMMAN)


def to_amman(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(AMMAN)


def fmt_date_ar(dt: datetime) -> str:
    """e.g. '12 حزيران 2026' (rendered dir=ltr by the email)."""
    a = to_amman(dt)
    return f"{a.day} {_AR_MONTHS[a.month - 1]} {a.year}"


def days_left(closing: datetime, ref: datetime | None = None) -> int:
    """Whole days from `ref` (default now, Amman) to the closing date."""
    ref = ref or now_amman()
    return (to_amman(closing).date() - to_amman(ref).date()).days
