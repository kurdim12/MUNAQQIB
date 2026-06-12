"""Matcher tests (CLAUDE.md §6.6, §16). Run keyword-only — no embedding model
needed in CI; the matcher renormalizes weights when embeddings are absent."""
from datetime import datetime, timezone

from models.schemas import OrgProfile, Tender
from pipeline.dedupe import tender_hash
from pipeline.match import THRESHOLD, match_one


def _tender(title, category=None, governorate=None):
    t = Tender(
        source_id="gtd",
        title=title,
        entity="وزارة الأشغال",
        category=category,
        governorate=governorate,
        url="https://gtd.gov.jo/x",
        closing_at=datetime(2026, 6, 30, tzinfo=timezone.utc),
    )
    t.hash = tender_hash(t)
    return t


def _contractor():
    return OrgProfile(
        name="مقاول",
        sector="contracting",
        classification_fields=["أبنية", "طرق"],
        classification_grade=3,
        include_keywords=["مدرسة"],
        exclude_keywords=["استشارات"],
        governorates=[],
    )


def test_strong_keyword_match_passes_threshold():
    org = _contractor()
    res = match_one(_tender("إنشاء مدرسة في عمان"), org)
    assert res.matched
    assert res.score >= THRESHOLD
    assert res.reasons["keyword"] > 0


def test_field_lexicon_hit_matches_without_explicit_keyword():
    org = _contractor()
    # 'تعبيد طريق' is in the طرق lexicon, not in include_keywords.
    res = match_one(_tender("أعمال تعبيد طريق رئيسي"), org)
    assert res.reasons["keyword"] > 0
    assert res.matched


def test_exclude_keyword_blocks_match():
    org = _contractor()
    res = match_one(_tender("استشارات هندسية لمدرسة"), org)
    assert not res.matched
    assert res.score == 0.0
    assert res.reasons.get("excluded") == 1.0


def test_irrelevant_tender_does_not_match():
    org = _contractor()
    res = match_one(_tender("توريد أدوية ومستلزمات طبية"), org)
    assert not res.matched


def test_embedding_sentinel_when_unavailable():
    org = _contractor()
    res = match_one(_tender("إنشاء مدرسة"), org)
    # In CI without the model, embedding term is dropped → sentinel -1.0.
    assert "embedding" in res.reasons


def test_governorate_filter_excludes_other_region():
    org = OrgProfile(
        name="مقاول",
        sector="contracting",
        classification_fields=["أبنية"],
        governorates=["عمان"],
    )
    in_amman = match_one(_tender("إنشاء مبنى", category="أبنية", governorate="عمان"), org)
    in_irbid = match_one(_tender("إنشاء مبنى", category="أبنية", governorate="إربد"), org)
    assert in_amman.score > in_irbid.score
