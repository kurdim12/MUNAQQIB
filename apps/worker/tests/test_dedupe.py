"""Dedupe / hashing tests (CLAUDE.md §6.5)."""
from datetime import datetime, timezone

from models.schemas import Tender
from pipeline.dedupe import dedupe, tender_hash


def _t(title, entity="وزارة الأشغال", closing=(2026, 6, 30)):
    return Tender(
        source_id="gtd",
        title=title,
        entity=entity,
        url="https://gtd.gov.jo/x",
        closing_at=datetime(*closing, tzinfo=timezone.utc),
    )


def test_hash_stable_across_cosmetic_variants():
    # Same tender, different tashkeel / alef form / digit script → same hash.
    a = _t("إنشاء مَدرسة رقم ١٢")
    b = _t("انشاء مدرسة رقم 12")
    assert tender_hash(a) == tender_hash(b)


def test_hash_differs_on_entity():
    a = _t("بناء", entity="وزارة الأشغال")
    b = _t("بناء", entity="أمانة عمان")
    assert tender_hash(a) != tender_hash(b)


def test_hash_differs_on_closing_date():
    a = _t("بناء", closing=(2026, 6, 30))
    b = _t("بناء", closing=(2026, 7, 1))
    assert tender_hash(a) != tender_hash(b)


def test_dedupe_keeps_first_and_assigns_hash():
    a = _t("إنشاء مدرسة")
    b = _t("انشاء مدرسة")  # duplicate of a after normalization
    c = _t("تعبيد طريق")
    out = dedupe([a, b, c])
    assert len(out) == 2
    assert all(t.hash for t in out)
    assert out[0].hash == tender_hash(a)
