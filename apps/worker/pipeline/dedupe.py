"""Dedupe via a stable content hash (CLAUDE.md §4 / §6.5).

hash = sha256( norm_ar(title) + '|' + norm_ar(entity) + '|' + closing_date ).

Two scrapes of the same tender — even with cosmetic title differences in
tashkeel, alef form, or digit script — collapse to one row. The hash is also the
`tenders.hash` unique constraint, so inserts are idempotent.
"""
from __future__ import annotations

import hashlib

from models.schemas import Tender

from .normalize import norm_ar


def tender_hash(t: Tender) -> str:
    closing = t.closing_at.date().isoformat() if t.closing_at else ""
    basis = f"{norm_ar(t.title)}|{norm_ar(t.entity or '')}|{closing}"
    return hashlib.sha256(basis.encode("utf-8")).hexdigest()


def dedupe(tenders: list[Tender]) -> list[Tender]:
    """Assign hashes and drop in-batch duplicates, keeping the first occurrence.

    Cross-batch (already-in-DB) dedupe is enforced by the unique constraint on
    `tenders.hash` at insert time; this handles duplicates within a single run
    (e.g. the same tender on two listing pages)."""
    seen: set[str] = set()
    out: list[Tender] = []
    for t in tenders:
        h = tender_hash(t)
        t.hash = h
        if h in seen:
            continue
        seen.add(h)
        out.append(t)
    return out
