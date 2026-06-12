"""Phase 0 orchestrator (CLAUDE.md §3, §6).

Sequential, idempotent run loop — no queues in v1:
    scrapers → normalize → dedupe → match → digest → notify

Each stage is a pure-ish function over the previous stage's output. The scrape +
persist + send IO is isolated here so the transforms stay unit-testable.

CLI:
    python -m pipeline.run scrape     # fetch + snapshot + parse all enabled sources
    python -m pipeline.run digest     # full pipeline → send digest (use --dry-run)
    python -m pipeline.run deadlines  # T-7/T-3/T-1 reminders
"""
from __future__ import annotations

import argparse
import logging
from pathlib import Path

import yaml

from config import settings
from models.schemas import OrgProfile, RawTender, Tender

from . import embed as embedding
from .dedupe import dedupe
from .digest import DigestItem
from .match import match_all
from .normalize import normalize_tender
from .notify import send_deadline_alerts, send_digest
from .scrapers.gtd import GtdScraper
from .scrapers.joneps import JonepsScraper

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger("pipeline.run")

SCRAPERS = [GtdScraper, JonepsScraper]


def load_partner_profile(path: str | None = None) -> OrgProfile:
    p = Path(path or settings.partner_profile_path)
    if not p.is_absolute():
        p = Path(__file__).resolve().parent.parent / p
    with p.open(encoding="utf-8") as f:
        return OrgProfile(**yaml.safe_load(f))


def scrape_all() -> list[RawTender]:
    from db import update_source_status

    from .transports.telegram import ops_alert

    raw: list[RawTender] = []
    for cls in SCRAPERS:
        scraper = cls()
        try:
            rows = scraper.run()
            logger.info("[%s] scraped %d rows", scraper.source_id, len(rows))
            raw.extend(rows)
            update_source_status(scraper.source_id, ok=True)
        except Exception as exc:  # noqa: BLE001
            logger.error("[%s] run failed: %s", scraper.source_id, exc)
            failures = update_source_status(scraper.source_id, ok=False)
            # Alert the founder once the source crosses the failure threshold (§7).
            if failures >= 2:
                ops_alert(
                    f"⚠️ منقّب: مصدر {scraper.source_id} فشل {failures} مرات متتالية — {exc}"
                )
    return raw


def normalize_and_dedupe(raw: list[RawTender]) -> list[Tender]:
    tenders = [normalize_tender(r) for r in raw]
    for t in tenders:
        t.embedding = embedding.embed(t.title)  # None if embeddings unavailable
    return dedupe(tenders)


def run_digest(dry_run: bool = False) -> None:
    from db import ensure_org, persist_matches, persist_tenders

    org = load_partner_profile()
    org_id = ensure_org(org)  # no-op offline; persists the partner row on D1
    raw = scrape_all()
    tenders = normalize_and_dedupe(raw)

    # Persist before sending — upsert-by-hash is the cross-run dedupe, and matches
    # feed the (Phase 1) dashboard. Degrades to no-ops when D1 is unconfigured.
    hash_to_id = persist_tenders(tenders)
    results = match_all(tenders, org)
    persist_matches(org_id, results, hash_to_id)

    by_hash = {t.hash: t for t in tenders}
    items = [
        DigestItem(tender=by_hash[r.tender_hash], score=r.score)
        for r in results
        if r.matched and r.tender_hash in by_hash
    ]
    logger.info("Matched %d/%d tenders for %s", len(items), len(tenders), org.name)
    send_digest(org, items, dry_run=dry_run)


def run_sweep() -> None:
    """Daily housekeeping sweep: close past-deadline tenders (§7) and expire any
    paid subscriptions whose period has ended."""
    from db import expire_subscriptions, sweep_closed_tenders

    n = sweep_closed_tenders()
    logger.info("Closing sweep: marked %d tenders closed", n)
    s = expire_subscriptions()
    logger.info("Subscription sweep: marked %d subscriptions past_due", s)


def run_deadlines(dry_run: bool = False) -> None:
    """T-7/T-3/T-1 reminders over saved/matched open tenders.

    Phase 0: re-scrape + re-match (no persisted match store yet); Phase 1 reads
    saved/matched rows from the DB instead."""
    org = load_partner_profile()
    raw = scrape_all()
    tenders = normalize_and_dedupe(raw)
    results = match_all(tenders, org)
    by_hash = {t.hash: t for t in tenders}
    matched = [by_hash[r.tender_hash] for r in results if r.matched and r.tender_hash in by_hash]
    send_deadline_alerts(org, matched, dry_run=dry_run)


def run_analyze_stage(limit: int = 5) -> None:
    """Drain the analyzer queue (Layer 11). Lazy import keeps the LLM/IO deps out
    of the lighter scrape/digest paths."""
    from .analyze_run import run_analyze

    tally = run_analyze(limit=limit)
    logger.info("Analyzer drain: %s", tally or "queue empty")


def main() -> None:
    parser = argparse.ArgumentParser(description="MUNAQQIB Phase 0 pipeline")
    parser.add_argument(
        "stage", choices=["scrape", "digest", "deadlines", "sweep", "analyze"]
    )
    parser.add_argument("--dry-run", action="store_true", help="render/log, don't send")
    parser.add_argument("--limit", type=int, default=5, help="analyze: max docs to drain")
    args = parser.parse_args()

    if args.stage == "scrape":
        for r in scrape_all():
            print(r.model_dump())
    elif args.stage == "digest":
        run_digest(dry_run=args.dry_run)
    elif args.stage == "deadlines":
        run_deadlines(dry_run=args.dry_run)
    elif args.stage == "sweep":
        run_sweep()
    elif args.stage == "analyze":
        run_analyze_stage(limit=args.limit)


if __name__ == "__main__":
    main()
