"""GTD parser tests — run against the committed real snapshot
fixtures/gtd_tenders_underoffering.html (rule §3: never the live site).

The fixture is the reader-proxy HTML of gtd.gov.jo's "Tenders Under Offering"
list, captured because GTD bot-walls non-Jordanian datacenter IPs."""
from pathlib import Path

from pipeline.scrapers.base import FetchResult
from pipeline.scrapers.gtd import GtdScraper, LISTING_URL

FIXTURE = (
    Path(__file__).resolve().parent.parent
    / "fixtures"
    / "gtd_tenders_underoffering.html"
)


def _rows():
    html = FIXTURE.read_text(encoding="utf-8")
    res = FetchResult(url=LISTING_URL, status_code=200, html=html)
    return GtdScraper().parse(res)


def test_parses_all_open_tenders():
    rows = _rows()
    assert len(rows) == 6  # the committed snapshot holds 6 tenders under offering


def test_works_tender_fields_are_populated():
    rows = _rows()
    by_ref = {r.source_ref: r for r in rows}
    assert "52/2026" in by_ref
    r = by_ref["52/2026"]
    assert "صيانة الطريق" in r.title  # road-maintenance works title extracted
    assert r.entity == "دائرة العطاءات الحكومية"
    assert r.published_at_raw == "2026/06/02"
    assert r.closing_at_raw == "2026/06/15"  # تاريخ الايداع = submission deadline
    assert r.source_id == "gtd"
    assert r.url.startswith("https://gtd.gov.jo/Ar/tendersunderofferingdetails/")


def test_refs_unique():
    rows = _rows()
    refs = [r.source_ref for r in rows]
    assert len(refs) == len(set(refs))


def test_bot_wall_detection():
    # The 54-byte empty shell GTD serves to datacenter IPs must be flagged.
    shell = FetchResult(url=LISTING_URL, status_code=200, html="<html></html>")
    assert GtdScraper._is_bot_walled(shell) is True
    real = FetchResult(
        url=LISTING_URL,
        status_code=200,
        html="<a href='/Ar/tendersunderofferingdetails/x'>التفاصيل</a>" + "x" * 5000,
    )
    assert GtdScraper._is_bot_walled(real) is False
