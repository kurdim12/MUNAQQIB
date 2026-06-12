"""Scraper framework & anti-fragility (CLAUDE.md §6.2, §7, §14).

Every scraper:
  1. fetch() — httpx GET/POST with retries (3, exponential backoff), identifying
     UA with contact email, ≤ 1 req/sec/source.
  2. snapshot() — save raw HTML to Storage (and locally for fixtures) on EVERY
     fetch, so a broken parser can be repaired against the exact bytes it saw.
  3. parse() — source-specific; returns RawTender[]. Subclasses implement this.
  4. run() — fetch → snapshot → parse; if HTTP 200 but zero rows → anomaly:
     increment consecutive_failures, fall back to the LLM extractor, alert at 2.

Legal: public pages only; never bypass logins/CAPTCHAs/paywalls; respect
robots.txt; identifying UA. These are hard constraints.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import httpx

from config import settings
from models.schemas import RawTender

logger = logging.getLogger(__name__)

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent / "fixtures"


@dataclass
class FetchResult:
    url: str
    status_code: int
    html: str
    fetched_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class BaseScraper:
    source_id: str = "base"
    base_url: str = ""

    def __init__(self, rate_limit_rps: float | None = None):
        self.rate_limit = rate_limit_rps or settings.scraper_rate_limit_rps
        self._last_request_at = 0.0
        self.headers = {
            "User-Agent": settings.scraper_user_agent,
            "Accept-Language": "ar,en;q=0.8",
        }

    # -- politeness ---------------------------------------------------------
    def _throttle(self) -> None:
        min_interval = 1.0 / self.rate_limit if self.rate_limit > 0 else 0
        elapsed = time.monotonic() - self._last_request_at
        if elapsed < min_interval:
            time.sleep(min_interval - elapsed)
        self._last_request_at = time.monotonic()

    # -- fetch with retries -------------------------------------------------
    def fetch(
        self,
        url: str,
        method: str = "GET",
        data: dict | None = None,
        max_retries: int = 3,
    ) -> FetchResult:
        last_exc: Exception | None = None
        for attempt in range(max_retries):
            self._throttle()
            try:
                with httpx.Client(
                    headers=self.headers, timeout=30, follow_redirects=True
                ) as client:
                    resp = (
                        client.post(url, data=data)
                        if method.upper() == "POST"
                        else client.get(url)
                    )
                return FetchResult(url=url, status_code=resp.status_code, html=resp.text)
            except httpx.HTTPError as exc:
                last_exc = exc
                backoff = 2**attempt
                logger.warning(
                    "Fetch %s failed (attempt %d/%d): %s; retrying in %ds",
                    url, attempt + 1, max_retries, exc, backoff,
                )
                time.sleep(backoff)
        raise RuntimeError(f"fetch failed for {url}: {last_exc}")

    # -- snapshot -----------------------------------------------------------
    def snapshot(self, result: FetchResult, label: str = "listing") -> str | None:
        """Persist the raw HTML. Saves to Storage (when configured) and always to
        a local fixtures/ path so parsers can be written/repaired against it."""
        ts = result.fetched_at.strftime("%Y%m%dT%H%M%SZ")
        name = f"{self.source_id}_{label}_{ts}.html"
        # Local copy (fixture candidate).
        FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
        local_path = FIXTURES_DIR / name
        try:
            local_path.write_text(result.html, encoding="utf-8")
        except OSError as exc:
            logger.warning("Could not write local snapshot %s: %s", local_path, exc)
        # Storage copy.
        from db import upload_snapshot  # lazy: avoids DB import in pure tests

        storage_path = upload_snapshot(
            f"{self.source_id}/{name}", result.html.encode("utf-8")
        )
        return storage_path or str(local_path)

    # -- parse (subclass) ---------------------------------------------------
    def parse(self, result: FetchResult) -> list[RawTender]:
        raise NotImplementedError

    # -- orchestration ------------------------------------------------------
    def run(self) -> list[RawTender]:
        result = self.fetch(self.base_url)
        snap_path = self.snapshot(result)
        rows: list[RawTender] = []
        try:
            rows = self.parse(result)
        except Exception as exc:  # noqa: BLE001 — parser fragility is expected
            logger.error("[%s] parser raised: %s", self.source_id, exc)

        if result.status_code == 200 and not rows:
            logger.warning(
                "[%s] HTTP 200 but 0 rows parsed — anomaly; trying LLM fallback.",
                self.source_id,
            )
            rows = self._llm_fallback(result)

        for r in rows:
            r.raw_html_path = snap_path
        return rows

    # -- LLM extraction fallback (CLAUDE.md §7) -----------------------------
    def _llm_fallback(self, result: FetchResult) -> list[RawTender]:
        from .llm_fallback import extract_rows  # lazy import

        return extract_rows(self.source_id, result.html, source_url=result.url)
