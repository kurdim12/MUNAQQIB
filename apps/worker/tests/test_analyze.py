"""Analyzer tests (CLAUDE.md §12.2). The LLM façade is stubbed, so these run
fully offline — no network, no API keys. Asserts the AnalyzerBrief contract, the
JSON-from-prose parsing, and the cost discipline (< 1.0 JOD/doc)."""
import json

from models.schemas import OrgProfile
from pipeline.analyze import (
    BUDGET_JOD,
    MAX_DOC_CHARS,
    _extract_json,
    analyze_document,
    estimate_cost_usd,
    extract_text,
    usd_to_jod,
)

PASS1 = {
    "tender_title": "إنشاء مدرسة في إربد",
    "entity": "وزارة الأشغال العامة",
    "key_dates": [{"label": "آخر موعد للتقديم", "date": "2026-07-15", "page": 3}],
    "bid_bond": "5000 دينار",
    "bond_page": 4,
    "performance_bond": "10%",
    "required_classification": "أبنية - الدرجة الثالثة",
    "classification_page": 2,
    "doc_price_jod": 150.0,
    "scope_summary_ar": "إنشاء مبنى مدرسي من ثلاثة طوابق.",
    "boq_present": True,
    "submission_requirements": ["شهادة التصنيف", "كفالة دخول العطاء"],
}
PASS2 = {
    "eligibility": "مؤهل",
    "eligibility_reasoning_ar": "تصنيف المنشأة يطابق المطلوب.",
    "risk_flags": ["مهلة قصيرة"],
    "confidence": 0.82,
}


def _fake_complete(slot, system, user, max_tokens=2048):
    # pass1 returns fenced JSON (LLMs often do); pass2 returns bare JSON.
    if slot == "pass1":
        return "```json\n" + json.dumps(PASS1, ensure_ascii=False) + "\n```"
    return json.dumps(PASS2, ensure_ascii=False)


def _contractor():
    return OrgProfile(
        name="مقاول",
        sector="contracting",
        classification_fields=["أبنية"],
        classification_grade=3,
    )


def test_extract_text_plain():
    text, pages = extract_text("نص تجريبي".encode("utf-8"), "text/plain")
    assert "تجريبي" in text and pages == 1


def test_extract_json_handles_fences_and_prose():
    assert _extract_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert _extract_json('قبل {"b": 2} بعد') == {"b": 2}


def test_analyze_document_builds_brief():
    tender = {"title": "عطاء", "entity": "جهة", "doc_price_jod": None}
    res = analyze_document("نص الكرّاسة", 5, tender, _contractor(), complete_fn=_fake_complete)

    assert res.status == "done"
    assert res.pages == 5
    brief = res.brief
    assert brief.eligibility == "مؤهل"
    assert brief.tender_title == "إنشاء مدرسة في إربد"
    assert brief.doc_price_jod == 150.0
    assert brief.key_dates[0].page == 3
    assert "مهلة قصيرة" in brief.risk_flags
    assert 0.0 <= brief.confidence <= 1.0


def test_cost_stays_under_budget_even_at_max_input():
    # Saturate the input cap and a generous output; worst-case must stay < 1 JOD.
    big_in = "ا" * MAX_DOC_CHARS
    big_out = "x" * 8000
    cost_usd = estimate_cost_usd(big_in, big_out, big_in, big_out)
    assert usd_to_jod(cost_usd) < BUDGET_JOD


def test_unknown_eligibility_falls_back_to_review():
    def bad_pass2(slot, system, user, max_tokens=2048):
        if slot == "pass1":
            return json.dumps(PASS1, ensure_ascii=False)
        return json.dumps({**PASS2, "eligibility": "ربما"}, ensure_ascii=False)

    res = analyze_document("نص", 1, {"title": "ع", "entity": "ج"}, _contractor(), complete_fn=bad_pass2)
    assert res.status == "done"
    assert res.brief.eligibility == "يتطلب مراجعة"


def test_failure_is_captured_not_raised():
    def boom(slot, system, user, max_tokens=2048):
        raise RuntimeError("model down")

    res = analyze_document("نص", 2, {"title": "ع", "entity": "ج"}, _contractor(), complete_fn=boom)
    assert res.status == "failed" and res.brief is None and res.error
