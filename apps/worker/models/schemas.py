"""Pydantic contracts shared across the pipeline (CLAUDE.md §3, §12.2).

`RawTender`  — what a scraper emits (loose, source-shaped).
`Tender`     — the normalized, deduped, unified record (mirrors the `tenders` table).
`OrgProfile` — the matching target (Phase 0: loaded from partner_profile.yaml).
`MatchResult`— matcher output with explainable `reasons`.
`AnalyzerBrief` — the Phase 2 analyzer output contract.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------
class RawTender(BaseModel):
    """Loose, source-shaped row emitted by a scraper before normalization.

    Dates arrive as raw source strings (often Arabic-Indic digits); the
    normalizer parses them. Keep this permissive — never drop a row because a
    field is missing or malformed.
    """

    source_id: str
    source_ref: str | None = None
    title: str
    entity: str | None = None
    category: str | None = None
    governorate: str | None = None
    published_at_raw: str | None = None
    closing_at_raw: str | None = None
    site_visit_at_raw: str | None = None
    doc_price_raw: str | None = None
    url: str
    raw_html_path: str | None = None


class Tender(BaseModel):
    """Normalized, deduplicated unified record (mirrors the `tenders` table)."""

    source_id: str
    source_ref: str | None = None
    title: str
    entity: str | None = None
    entity_type: str | None = None  # حكومي / خاص / عسكري / منظمات
    category: str | None = None
    governorate: str | None = None
    published_at: date | None = None
    closing_at: datetime | None = None
    site_visit_at: datetime | None = None
    doc_price_jod: float | None = None
    bond_pct: float | None = None
    url: str
    raw_html_path: str | None = None
    status: Literal["open", "closed", "awarded", "cancelled"] = "open"
    embedding: list[float] | None = None
    hash: str | None = None


class OrgProfile(BaseModel):
    """Matching target. Phase 0 loads one of these from partner_profile.yaml;
    Phase 1+ builds it from the `orgs` row."""

    org_id: str | None = None
    name: str
    sector: Literal["contracting", "supplies", "consulting", "services"]
    classification_fields: list[str] = Field(default_factory=list)
    classification_grade: int | None = None
    supply_categories: list[str] = Field(default_factory=list)
    governorates: list[str] = Field(default_factory=list)  # empty = all
    min_value_jod: float | None = None
    max_value_jod: float | None = None
    include_keywords: list[str] = Field(default_factory=list)
    exclude_keywords: list[str] = Field(default_factory=list)
    digest_emails: list[str] = Field(default_factory=list)
    telegram_chat_id: str | None = None

    def profile_text(self) -> str:
        """Free-text used as the embedding anchor for similarity scoring."""
        parts = (
            self.classification_fields
            + self.supply_categories
            + self.include_keywords
            + [self.name]
        )
        return " ".join(p for p in parts if p)


class MatchResult(BaseModel):
    org_id: str | None = None
    tender_hash: str | None = None
    score: float
    matched: bool
    reasons: dict[str, float] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Analyzer (Phase 2) — CLAUDE.md §12.2
# ---------------------------------------------------------------------------
class KeyDate(BaseModel):
    label: str
    date: str
    page: int


class AnalyzerBrief(BaseModel):
    tender_title: str
    entity: str
    key_dates: list[KeyDate]  # closing, site visit, pre-bid meeting, questions deadline
    bid_bond: str | None = None
    bond_page: int | None = None
    performance_bond: str | None = None
    required_classification: str | None = None
    classification_page: int | None = None
    doc_price_jod: float | None = None
    scope_summary_ar: str  # ≤ 120 words
    boq_present: bool = False
    submission_requirements: list[str] = Field(default_factory=list)
    risk_flags: list[str] = Field(default_factory=list)
    eligibility: Literal["مؤهل", "غير مؤهل", "يتطلب مراجعة"]
    eligibility_reasoning_ar: str
    confidence: float
