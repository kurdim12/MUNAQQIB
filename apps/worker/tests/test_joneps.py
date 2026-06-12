"""JONEPS parser tests — run against the committed real snapshot
fixtures/joneps_opened_listing.html (rule §3: never the live site)."""
from pathlib import Path

from pipeline.scrapers.base import FetchResult
from pipeline.scrapers.joneps import JonepsScraper

FIXTURE = Path(__file__).resolve().parent.parent / "fixtures" / "joneps_opened_listing.html"


def _rows():
    html = FIXTURE.read_text(encoding="utf-8")
    res = FetchResult(url="https://joneps.gov.jo/", status_code=200, html=html)
    return JonepsScraper().parse(res)


def test_parses_all_open_tenders():
    rows = _rows()
    assert len(rows) == 10  # the committed snapshot holds 10 open tenders


def test_row_fields_are_populated():
    rows = _rows()
    by_ref = {r.source_ref: r for r in rows}
    assert "2026001840-01" in by_ref
    r = by_ref["2026001840-01"]
    assert "المغطس" in r.title  # Arabic title extracted
    assert r.entity and "الأشغال" in r.entity
    assert r.category == "أشغال"
    assert r.published_at_raw == "08/06/2026"
    assert r.source_id == "joneps"
    assert "selectListTendInvitAL" in r.url  # links to the working Opened list
    # closing date is on the detail page, deliberately not guessed from the listing
    assert r.closing_at_raw is None


def test_refs_unique_despite_dual_anchors():
    rows = _rows()
    refs = [r.source_ref for r in rows]
    assert len(refs) == len(set(refs))  # number + title both carry fn_goDetail
