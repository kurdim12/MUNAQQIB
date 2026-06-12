"""JONEPS scraper — Jordan National e-Procurement System (CLAUDE.md §6.4).

JONEPS is a Korean-built e-GP system (Nexweb/JSP, `*.do` endpoints). The public
"Opened" tender-invitation list is a plain GET:

    https://joneps.gov.jo/ep/invt/selectListTendInvitAL.do?searchTendStatusCd=Opened

Each results row carries an `onclick="fn_goDetail(tendNo, tendSeq, '', tendCategCd,
'', ..., ..., tendTypeCd1)"` and six cells:
    [0] tender no (e.g. 2026001840-01)   [1] title (ar)   [2] buyer entity
    [3] type (أشغال/لوازم/خدمات/استشارية) [4] publish date  [5] secondary date

Parser written against the committed fixture `fixtures/joneps_opened_listing.html`
(rule §3 — never invent selectors). The two date columns sit one day apart across
all rows, so neither is the submission deadline; the real closing date lives on the
detail page (`closing_at_raw` left None until detail enrichment — better no deadline
than a wrong one). Tested offline in tests/test_joneps.py against the fixture.
"""
from __future__ import annotations

import logging
import re

from bs4 import BeautifulSoup

from models.schemas import RawTender

from .base import BaseScraper, FetchResult

logger = logging.getLogger(__name__)

LISTING_URL = (
    "https://joneps.gov.jo/ep/invt/selectListTendInvitAL.do?searchTendStatusCd=Opened"
)

# fn_goDetail('2026001840','01','','EP1312','','EP0061','EP0021','EP0015')
#               tendNo      seq        cat                          type
_GO_DETAIL = re.compile(
    r"fn_goDetail\(\s*'(\d+)'\s*,\s*'(\w+)'\s*,\s*'[^']*'\s*,\s*'([^']*)'"
    r"\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'([^']*)'"
)


class JonepsScraper(BaseScraper):
    source_id = "joneps"
    base_url = LISTING_URL

    def parse(self, result: FetchResult) -> list[RawTender]:
        return self._parse_results(result.html, result.url)

    def _parse_results(self, html: str, url: str) -> list[RawTender]:
        soup = BeautifulSoup(html, "lxml")
        rows: list[RawTender] = []
        seen: set[str] = set()

        for tr in soup.find_all("tr"):
            anchor = tr.find("a", onclick=lambda v: bool(v) and "fn_goDetail(" in v)
            if not anchor:
                continue
            m = _GO_DETAIL.search(anchor["onclick"])
            if not m:
                continue
            tend_no, seq = m.group(1), m.group(2)
            ref = f"{tend_no}-{seq}"
            if ref in seen:  # number + title cells both carry fn_goDetail — one row
                continue

            tds = tr.find_all("td")
            if len(tds) < 5:
                continue

            def cell(i: int) -> str:
                return re.sub(r"\s+", " ", tds[i].get_text(" ", strip=True)) if i < len(tds) else ""

            title_a = tds[1].find("a")
            title_text = (
                re.sub(r"\s+", " ", title_a.get_text(" ", strip=True)) if title_a else cell(1)
            )
            if not title_text:
                continue

            seen.add(ref)
            rows.append(
                RawTender(
                    source_id=self.source_id,
                    source_ref=ref,  # tender number, e.g. 2026001840-01
                    title=title_text,
                    entity=cell(2) or None,
                    category=cell(3) or None,
                    published_at_raw=cell(4) or None,
                    closing_at_raw=None,  # on the detail page (see module docstring)
                    # The deep detail link 500s without a portal session, so we link
                    # to the public "Opened" list (the tender number locates it).
                    url=LISTING_URL,
                )
            )

        logger.info("[joneps] parsed %d tenders from listing", len(rows))
        return rows


def _snapshot_cli() -> None:
    """`python -m pipeline.scrapers.joneps --snapshot` — fetch + save a fixture."""
    s = JonepsScraper()
    res = s.fetch(s.base_url)
    path = s.snapshot(res, label="opened_listing")
    print(f"HTTP {res.status_code}, {len(res.html)} bytes → {path}")


if __name__ == "__main__":
    import sys

    if "--snapshot" in sys.argv:
        _snapshot_cli()
    else:
        for r in JonepsScraper().run():
            print(r.model_dump())
