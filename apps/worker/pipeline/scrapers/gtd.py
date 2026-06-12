"""GTD scraper — Government Tenders Department / دائرة العطاءات الحكومية.

GTD (`gtd.gov.jo`) is the central authority for government **works** tenders —
roads, schools, infrastructure, supervision — i.e. exactly a heavy-civil
contractor's hunting ground, and the single most valuable complement to JONEPS.

The public "Tenders Under Offering" list is a plain page:

    https://gtd.gov.jo/AR/modules/tendersunderoffering

Each results `<tr>` carries nine cells (header row, in order):
    [0] رقم العطاء (number, e.g. 53/2026)   [1] اسم العطاء (title, ar)
    [2] تاريخ الطرح (publish date)           [3] تاريخ الايداع (submission deadline)
    [4] الوثائق  [5] المرفقات  [6] الملاحق   [7] الاعلان (announcement PDF)
    [8] التفاصيل (detail link → /Ar/tendersunderofferingdetails/<slug>)

**Anti-fragility note (the reason this file exists):** GTD bot-walls requests
from non-Jordanian datacenter IPs — our honest UA receives a 54-byte empty
shell (HTTP 200), so a direct fetch from any cloud host yields zero rows. When
the direct fetch comes back suspiciously small, `fetch()` falls back to a public
reader proxy (`settings.scraper_reader_proxy`) that retrieves the page
server-side and returns its HTML. The committed fixture
`fixtures/gtd_tenders_underoffering.html` is the proxy's HTML for the live page
(rule §3 — parse against the exact bytes we saw); the structural parser keys on
the detail anchor + td positions, so it reads both the proxy HTML and a direct
Jordanian-IP fetch. Tested offline in tests/test_gtd.py against the fixture.
"""
from __future__ import annotations

import logging
import re
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from config import settings
from models.schemas import RawTender

from .base import BaseScraper, FetchResult

logger = logging.getLogger(__name__)

SITE_ROOT = "https://gtd.gov.jo"
LISTING_URL = "https://gtd.gov.jo/AR/modules/tendersunderoffering"

# Below this size a 200 is the bot-wall empty shell (the real list is ~250 KB).
_BOT_WALL_MAX_BYTES = 2000
_DETAIL_MARKER = "tendersunderofferingdetails"


class GtdScraper(BaseScraper):
    source_id = "gtd"
    base_url = LISTING_URL

    # -- fetch with reader-proxy fallback for the IP bot-wall ----------------
    def fetch(self, url: str, *args, **kwargs) -> FetchResult:
        result = super().fetch(url, *args, **kwargs)
        if self._is_bot_walled(result):
            proxied = self._fetch_via_reader(url)
            if proxied is not None:
                logger.info("[gtd] direct fetch bot-walled; used reader proxy")
                return proxied
        return result

    @staticmethod
    def _is_bot_walled(result: FetchResult) -> bool:
        body = result.html or ""
        return _DETAIL_MARKER not in body and len(body) < _BOT_WALL_MAX_BYTES

    def _fetch_via_reader(self, url: str) -> FetchResult | None:
        proxy = (settings.scraper_reader_proxy or "").strip()
        if not proxy:
            return None
        proxy_url = proxy + url  # e.g. https://r.jina.ai/https://gtd.gov.jo/...
        try:
            self._throttle()
            with httpx.Client(
                headers={**self.headers, "X-Return-Format": "html"},
                timeout=45,
                follow_redirects=True,
            ) as client:
                resp = client.get(proxy_url)
            # Report the canonical URL, not the proxy, so links resolve correctly.
            return FetchResult(url=url, status_code=resp.status_code, html=resp.text)
        except httpx.HTTPError as exc:
            logger.warning("[gtd] reader proxy failed: %s", exc)
            return None

    # -- parse ---------------------------------------------------------------
    def parse(self, result: FetchResult) -> list[RawTender]:
        soup = BeautifulSoup(result.html, "lxml")
        rows: list[RawTender] = []
        seen: set[str] = set()

        for anchor in soup.find_all(
            "a", href=lambda h: bool(h) and _DETAIL_MARKER in h
        ):
            tr = anchor.find_parent("tr")
            if tr is None:
                continue
            tds = tr.find_all("td")
            if len(tds) < 4:
                continue

            def cell(i: int, _tds=tds) -> str:
                return (
                    re.sub(r"\s+", " ", _tds[i].get_text(" ", strip=True))
                    if i < len(_tds)
                    else ""
                )

            number = cell(0)
            title = cell(1)
            if not title or not number:
                continue
            if number in seen:
                continue
            seen.add(number)

            detail_url = urljoin(SITE_ROOT, anchor["href"])
            rows.append(
                RawTender(
                    source_id=self.source_id,
                    source_ref=number,  # central tender no., e.g. 53/2026
                    title=title,
                    entity="دائرة العطاءات الحكومية",
                    category=None,  # GTD lists works/supervision; inferred downstream
                    published_at_raw=cell(2) or None,
                    closing_at_raw=cell(3) or None,  # تاريخ الايداع = submission deadline
                    url=detail_url,
                )
            )

        logger.info("[gtd] parsed %d tenders from listing", len(rows))
        return rows


def _snapshot_cli() -> None:
    """`python -m pipeline.scrapers.gtd --snapshot` — fetch + save a fixture."""
    s = GtdScraper()
    res = s.fetch(s.base_url)
    path = s.snapshot(res, label="tenders_underoffering")
    print(f"HTTP {res.status_code}, {len(res.html)} bytes → {path}")


if __name__ == "__main__":
    import sys

    if "--snapshot" in sys.argv:
        _snapshot_cli()
    else:
        for r in GtdScraper().run():
            print(r.model_dump())
