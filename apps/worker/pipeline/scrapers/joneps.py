"""JONEPS scraper — Jordan National e-Procurement System (CLAUDE.md §6.4).

JONEPS is a Korean-built e-GP system (ASP/JSP). The public tender-invitation
search is a form POST with `__doPostBack`-style paging params. Replicate the
search POST with httpx; use Playwright only if blocked.

FIXTURE-FIRST (rule §3): the deterministic parser must be written against a real
results snapshot under apps/worker/fixtures/. As of bootstrap the source returns
HTTP 403 to the bot UA from the build container (see DECISIONS.md), so the POST
body + `_parse_results` are flagged TODOs and run() degrades to the LLM fallback.

To capture a fixture once a network path exists:
    python -m pipeline.scrapers.joneps --snapshot
then record the form fields/paging params in SOURCES.md, fill _parse_results, and
add a parser unit test against the committed fixture.
"""
from __future__ import annotations

import logging

from bs4 import BeautifulSoup

from models.schemas import RawTender

from .base import BaseScraper, FetchResult

logger = logging.getLogger(__name__)

# TODO(fixture): the public tender-invitation search results URL + POST body.
SEARCH_URL = "https://www.joneps.gov.jo/Tender/PublicTenderList"


class JonepsScraper(BaseScraper):
    source_id = "joneps"
    base_url = SEARCH_URL

    # TODO(fixture): the search POST form fields once confirmed against a snapshot.
    SEARCH_FORM: dict[str, str] = {}

    def run(self) -> list[RawTender]:  # override: JONEPS search is a POST
        method = "POST" if self.SEARCH_FORM else "GET"
        result = self.fetch(self.base_url, method=method, data=self.SEARCH_FORM or None)
        snap_path = self.snapshot(result, label="results")
        rows: list[RawTender] = []
        try:
            rows = self._parse_results(result.html, result.url)
        except Exception as exc:  # noqa: BLE001
            logger.error("[joneps] parser raised: %s", exc)
        if result.status_code == 200 and not rows:
            logger.warning("[joneps] HTTP 200 but 0 rows; trying LLM fallback.")
            rows = self._llm_fallback(result)
        for r in rows:
            r.raw_html_path = snap_path
        return rows

    def parse(self, result: FetchResult) -> list[RawTender]:
        return self._parse_results(result.html, result.url)

    def _parse_results(self, html: str, url: str) -> list[RawTender]:
        """TODO(fixture): deterministic selectors against a saved results snapshot.

        Until a fixture confirms the DOM/paging, return [] so run() falls back to
        the LLM extractor. Do NOT invent selectors (hard rule §3)."""
        soup = BeautifulSoup(html, "lxml")  # noqa: F841 — ready for the real parser
        logger.info(
            "[joneps] deterministic parser not yet written against a fixture; "
            "deferring to LLM fallback."
        )
        return []


def _snapshot_cli() -> None:
    s = JonepsScraper()
    method = "POST" if s.SEARCH_FORM else "GET"
    res = s.fetch(s.base_url, method=method, data=s.SEARCH_FORM or None)
    path = s.snapshot(res, label="results")
    print(f"HTTP {res.status_code}, {len(res.html)} bytes → {path}")


if __name__ == "__main__":
    import sys

    if "--snapshot" in sys.argv:
        _snapshot_cli()
    else:
        for r in JonepsScraper().run():
            print(r.model_dump())
