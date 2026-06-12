"""Digest rendering tests (CLAUDE.md §10.1)."""
from datetime import datetime, timedelta, timezone

from models.schemas import OrgProfile, Tender
from pipeline.digest import DigestItem, build_digest


def _org():
    return OrgProfile(
        name="مقاول",
        sector="contracting",
        classification_fields=["أبنية"],
        digest_emails=["partner@example.com"],
    )


def _item(title, days_to_close, price=50.0, score=0.7):
    closing = datetime.now(timezone.utc) + timedelta(days=days_to_close)
    t = Tender(
        source_id="gtd",
        title=title,
        entity="وزارة الأشغال",
        doc_price_jod=price,
        url="https://gtd.gov.jo/x",
        closing_at=closing,
    )
    return DigestItem(tender=t, score=score)


def test_digest_subject_and_count():
    items = [_item("إنشاء مدرسة", 10), _item("تعبيد طريق", 5)]
    d = build_digest(items, _org(), "https://app.example")
    assert d.n == 2
    assert "2 عطاءات" in d.subject
    assert "🏗️" in d.subject


def test_closing_soon_block_appears_within_72h():
    items = [_item("عطاء عاجل", 1)]
    d = build_digest(items, _org(), "https://app.example")
    assert "تغلق خلال ٧٢ ساعة" in d.html


def test_no_closing_soon_block_when_far_out():
    items = [_item("عطاء بعيد", 20)]
    d = build_digest(items, _org(), "https://app.example")
    assert "تغلق خلال ٧٢ ساعة" not in d.html


def test_rtl_and_unsubscribe_present():
    d = build_digest([_item("إنشاء مدرسة", 10)], _org(), "https://app.example")
    assert 'dir="rtl"' in d.html
    assert "إلغاء الاشتراك" in d.html
    assert 'dir="auto"' in d.html  # titles
    assert 'dir="ltr"' in d.html   # dates/prices


def test_items_sorted_by_score_desc():
    items = [_item("منخفض", 10, score=0.6), _item("مرتفع", 10, score=0.95)]
    d = build_digest(items, _org(), "https://app.example")
    assert d.html.index("مرتفع") < d.html.index("منخفض")


def test_plaintext_fallback_lists_urls():
    d = build_digest([_item("إنشاء مدرسة", 10)], _org(), "https://app.example")
    assert "https://gtd.gov.jo/x" in d.text
