"""Analyzer producer tests (Layer 11) — fully offline.

The LLM is injected (`complete_fn`), the document fetch and DB writes are
monkeypatched, so the drain logic is exercised without network or API keys."""
import pipeline.analyze_run as ar
from models.schemas import OrgProfile


# --- stubs ------------------------------------------------------------------
def _stub_complete(slot, system, user, **kw):
    if slot == "pass1":
        return (
            '{"tender_title":"صيانة الطريق","entity":"دائرة العطاءات الحكومية",'
            '"key_dates":[{"label":"إيداع العروض","date":"2026-06-15","page":1}],'
            '"bid_bond":"5%","scope_summary_ar":"صيانة طريق",'
            '"submission_requirements":["تصنيف أشغال"],"boq_present":true}'
        )
    return (
        '{"eligibility":"مؤهل","eligibility_reasoning_ar":"التصنيف مطابق",'
        '"risk_flags":[],"confidence":0.82}'
    )


def _profile(_org_id):
    return OrgProfile(
        org_id="demo_org_v1", name="مقاول", sector="contracting",
        classification_fields=["أشغال إنشائية"],
    )


def _patch_common(monkeypatch, *, text="نص الكرّاسة لأغراض الاختبار " * 40):
    monkeypatch.setattr(ar, "get_org_profile", _profile)
    monkeypatch.setattr(ar, "fetch_doc_text", lambda url: (text, 3))
    saved = {}
    monkeypatch.setattr(
        ar, "update_analysis",
        lambda aid, status, brief, pages, cost, file_path=None: saved.update(
            {"id": aid, "status": status, "brief": brief, "pages": pages, "cost": cost}
        ),
    )
    return saved


def test_drains_and_persists_done(monkeypatch):
    saved = _patch_common(monkeypatch)
    monkeypatch.setattr(
        ar, "claim_queued_analyses",
        lambda limit: [{
            "analysis_id": "a1", "org_id": "demo_org_v1", "tender_id": "gtd_52-2026",
            "tender_title": "صيانة الطريق", "tender_entity": "GTD",
            "tender_url": "https://gtd.gov.jo/x",
        }],
    )
    tally = ar.run_analyze(limit=5, complete_fn=_stub_complete)
    assert tally == {"done": 1}
    assert saved["status"] == "done"
    assert saved["brief"].eligibility == "مؤهل"
    assert saved["cost"] > 0  # cost computed and persisted


def test_unfetchable_doc_marked_failed(monkeypatch):
    saved = _patch_common(monkeypatch, text="")  # fetch returns no text
    monkeypatch.setattr(
        ar, "claim_queued_analyses",
        lambda limit: [{
            "analysis_id": "a2", "org_id": "demo_org_v1", "tender_id": "t2",
            "tender_title": "x", "tender_entity": "y", "tender_url": "https://x/404",
        }],
    )
    tally = ar.run_analyze(limit=5, complete_fn=_stub_complete)
    assert tally == {"failed": 1}
    assert saved["status"] == "failed"
    assert saved["brief"] is None


def test_empty_queue_is_noop(monkeypatch):
    monkeypatch.setattr(ar, "claim_queued_analyses", lambda limit: [])
    assert ar.run_analyze(limit=5, complete_fn=_stub_complete) == {}


def test_html_to_text_strips_markup():
    out = ar._html_to_text("<html><body><h1>عنوان</h1><script>x()</script><p>نص</p></body></html>")
    assert "عنوان" in out and "نص" in out and "x()" not in out


def test_html_to_text_passes_markdown_through():
    assert ar._html_to_text("# عنوان\n\nنص عادي") == "# عنوان\n\nنص عادي"
