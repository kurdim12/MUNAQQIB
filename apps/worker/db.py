"""Repository layer over Cloudflare D1 + R2 (DECISIONS.md 2026-06-12).

Pure SQL building on top of `d1.execute`; every write degrades to a no-op when
D1 is unconfigured, so the offline pipeline and tests keep running. Arrays/objects
are JSON-encoded before binding (SQLite stores them as TEXT).

Phase-0 writes:
  ensure_org           — upsert the design-partner org (matches need a parent row)
  persist_tenders      — upsert by hash (this is the cross-run dedupe), returns hash→id
  persist_matches      — upsert per (org, tender)
  log_notification     — record every send
  update_source_status — anti-fragility bookkeeping (consecutive_failures)
  sweep_closed_tenders — daily close of past-deadline tenders
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

import d1
from models.schemas import MatchResult, OrgProfile, Tender
from storage import upload as r2_upload

logger = logging.getLogger(__name__)

# Stable id for the Phase-0 design partner (no orgs table writer yet; YAML-driven).
PARTNER_ORG_ID = "partner_design_v0"


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------------------------------------------------------------------
# Snapshots → R2
# ---------------------------------------------------------------------------
def upload_snapshot(key: str, html: bytes) -> str | None:
    """Store a raw HTML snapshot in R2; return its object key (or None)."""
    return r2_upload(key, html, content_type="text/html")


# ---------------------------------------------------------------------------
# Orgs
# ---------------------------------------------------------------------------
def ensure_org(profile: OrgProfile) -> str:
    """Upsert the partner org and return its id. No-op (returns the id) offline."""
    org_id = profile.org_id or PARTNER_ORG_ID
    d1.execute(
        """
        INSERT INTO orgs (id, name, sector, classification_fields, classification_grade,
                          supply_categories, governorates, include_keywords,
                          exclude_keywords, digest_emails, telegram_chat_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name, sector=excluded.sector,
          classification_fields=excluded.classification_fields,
          classification_grade=excluded.classification_grade,
          supply_categories=excluded.supply_categories,
          governorates=excluded.governorates,
          include_keywords=excluded.include_keywords,
          exclude_keywords=excluded.exclude_keywords,
          digest_emails=excluded.digest_emails,
          telegram_chat_id=excluded.telegram_chat_id
        """,
        [
            org_id,
            profile.name,
            profile.sector,
            json.dumps(profile.classification_fields, ensure_ascii=False),
            profile.classification_grade,
            json.dumps(profile.supply_categories, ensure_ascii=False),
            json.dumps(profile.governorates, ensure_ascii=False),
            json.dumps(profile.include_keywords, ensure_ascii=False),
            json.dumps(profile.exclude_keywords, ensure_ascii=False),
            json.dumps(profile.digest_emails, ensure_ascii=False),
            profile.telegram_chat_id,
        ],
    )
    return org_id


# ---------------------------------------------------------------------------
# Tenders  (upsert-by-hash IS the cross-run dedupe)
# ---------------------------------------------------------------------------
def persist_tenders(tenders: list[Tender]) -> dict[str, str]:
    """Upsert each tender by its content hash; return {hash: tender_id}.

    The ON CONFLICT(hash) clause makes re-scrapes idempotent across runs (the
    in-batch `dedupe()` only handles one run). RETURNING gives us the row id so
    matches can reference it."""
    hash_to_id: dict[str, str] = {}
    for t in tenders:
        if not t.hash:
            continue
        embedding = (
            json.dumps(t.embedding) if t.embedding is not None else None
        )
        rows = d1.execute(
            """
            INSERT INTO tenders (source_id, source_ref, title, entity, entity_type,
                                 category, governorate, published_at, closing_at,
                                 site_visit_at, doc_price_jod, bond_pct, url,
                                 raw_html_path, status, embedding, hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(hash) DO UPDATE SET
              closing_at=excluded.closing_at,
              site_visit_at=excluded.site_visit_at,
              doc_price_jod=excluded.doc_price_jod,
              raw_html_path=excluded.raw_html_path
            RETURNING id, hash
            """,
            [
                t.source_id, t.source_ref, t.title, t.entity, t.entity_type,
                t.category, t.governorate,
                t.published_at.isoformat() if t.published_at else None,
                t.closing_at.isoformat() if t.closing_at else None,
                t.site_visit_at.isoformat() if t.site_visit_at else None,
                t.doc_price_jod, t.bond_pct, t.url, t.raw_html_path, t.status,
                embedding, t.hash,
            ],
        )
        if rows:
            hash_to_id[rows[0]["hash"]] = rows[0]["id"]
    return hash_to_id


# ---------------------------------------------------------------------------
# Matches
# ---------------------------------------------------------------------------
def persist_matches(
    org_id: str, results: list[MatchResult], hash_to_id: dict[str, str]
) -> int:
    """Upsert matched results for an org. Returns the count written."""
    written = 0
    for r in results:
        if not r.matched or r.tender_hash not in hash_to_id:
            continue
        d1.execute(
            """
            INSERT INTO matches (org_id, tender_id, score, reasons)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(org_id, tender_id) DO UPDATE SET
              score=excluded.score, reasons=excluded.reasons
            """,
            [
                org_id,
                hash_to_id[r.tender_hash],
                r.score,
                json.dumps(r.reasons, ensure_ascii=False),
            ],
        )
        written += 1
    return written


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------
def log_notification(
    org_id: str | None, kind: str, transport: str, payload: dict, delivery_status: str
) -> None:
    d1.execute(
        """
        INSERT INTO notifications (org_id, kind, payload, transport, sent_at, delivery_status)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        [
            org_id,
            kind,
            json.dumps(payload, ensure_ascii=False),
            transport,
            _now_iso(),
            delivery_status,
        ],
    )


# ---------------------------------------------------------------------------
# Source anti-fragility bookkeeping (CLAUDE.md §7)
# ---------------------------------------------------------------------------
def update_source_status(source_id: str, ok: bool) -> int:
    """Record a run. On success reset failures; on failure increment. Returns the
    new consecutive_failures count (0 when offline/unknown)."""
    now = _now_iso()
    if ok:
        d1.execute(
            "UPDATE sources SET last_run_at=?, last_ok_at=?, consecutive_failures=0 WHERE id=?",
            [now, now, source_id],
        )
        return 0
    rows = d1.execute(
        """
        UPDATE sources
        SET last_run_at=?, consecutive_failures=consecutive_failures+1
        WHERE id=?
        RETURNING consecutive_failures
        """,
        [now, source_id],
    )
    return rows[0]["consecutive_failures"] if rows else 0


# ---------------------------------------------------------------------------
# Closing-status sweep (CLAUDE.md §7)
# ---------------------------------------------------------------------------
def sweep_closed_tenders() -> int:
    """Mark open tenders past their closing date as closed. Returns rows touched."""
    rows = d1.execute(
        """
        UPDATE tenders SET status='closed'
        WHERE status='open' AND closing_at IS NOT NULL AND closing_at < ?
        RETURNING id
        """,
        [_now_iso()],
    )
    return len(rows)
