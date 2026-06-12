"""GTD scraper — Government Tenders Directorate, "مناقصات قيد الطرح" (CLAUDE.md §6.3).

FIXTURE-FIRST (rule §3): the deterministic parser below must be written against a
real HTML snapshot saved under apps/worker/fixtures/. As of bootstrap the source
is unreachable from the build container (empty 54-byte stub) — see DECISIONS.md —
so `_parse_listing` is a flagged TODO and `run()` degrades to the LLM fallback
extractor until a fixture exists.

To capture a fixture once a network path exists:
    python -m pipeline.scrapers.gtd --snapshot
then inspect fixtures/gtd_listing_*.html, fill _parse_listing, and add a parser
unit test in tests/ that runs against the committed fixture (never the live site).
"""
from __future__ import annotations

import logging

from bs4 import BeautifulSoup

from models.schemas import RawTender

from .base import BaseScraper, FetchResult

logger = logging.getLogger(__name__)

# TODO(fixture): the open-tenders listing path. Confirm against a real snapshot.
LISTING_URL = "https://gtd.gov.jo/Ar/List/مناقصات_قيد_الطرح"


class GtdScraper(BaseScraper):
    source_id = "gtd"
    base_url = LISTING_URL

    def parse(self, result: FetchResult) -> list[RawTender]:
        return self._parse_listing(result.html, result.url)

    def _parse_listing(self, html: str, url: str) -> list[RawTender]:
        """TODO(fixture): write deterministic selectors against a saved snapshot.

        Expected unified fields (see SOURCES.md): title · entity (الجهة) ·
        published_at · closing_at · site_visit_at · doc_price_jod (ثمن النسخة) ·
        source_ref (رقم المناقصة) · detail URL.

        Until a fixture confirms the DOM, return [] so run() falls back to the LLM
        extractor. Do NOT invent selectors here (hard rule §3).
        """
        soup = BeautifulSoup(html, "lxml")  # noqa: F841 — ready for the real parser
        logger.info(
            "[gtd] deterministic parser not yet written against a fixture; "
            "deferring to LLM fallback."
        )
        return []


def _snapshot_cli() -> None:
    """`python -m pipeline.scrapers.gtd --snapshot` — fetch + save a fixture."""
    s = GtdScraper()
    res = s.fetch(s.base_url)
    path = s.snapshot(res, label="listing")
    print(f"HTTP {res.status_code}, {len(res.html)} bytes → {path}")


if __name__ == "__main__":
    import sys

    if "--snapshot" in sys.argv:
        _snapshot_cli()
    else:
        for r in GtdScraper().run():
            print(r.model_dump())
