"""Hybrid matcher v0 (CLAUDE.md §6.6).

score = 0.45 · keyword
      + 0.35 · embedding cosine (title vs org profile text)
      + 0.20 · category/governorate fit
threshold ≥ 0.55 → match.  `reasons` is always logged for explainability and as
the tuning signal against the design partner's labeled feedback.

Pure module: no DB, no network. Embeddings may be precomputed and passed in;
if absent, the embedding term is dropped and the remaining weights renormalize
(DECISIONS.md) so Phase 0 still produces sensible matches keyword-only.
"""
from __future__ import annotations

from models.schemas import MatchResult, OrgProfile, Tender

from . import embed as embedding
from .normalize import norm_ar
from .taxonomy import field_lexicon

W_KEYWORD = 0.45
W_EMBEDDING = 0.35
W_FIELD = 0.20
THRESHOLD = 0.55


def _keyword_score(title_norm: str, org: OrgProfile) -> float:
    """Fraction-style keyword signal in [0, 1].

    Combines the org's explicit include_keywords with the lexicons of its
    classification fields / supply categories. A single strong hit already gives
    a meaningful score; more hits saturate toward 1.0.
    """
    terms: set[str] = {norm_ar(k) for k in org.include_keywords if k}
    for field in org.classification_fields:
        terms.update(field_lexicon(field))
    for cat in org.supply_categories:
        terms.update(field_lexicon(cat))
    terms = {t for t in terms if t}
    if not terms:
        return 0.0
    hits = sum(1 for t in terms if t in title_norm)
    if hits == 0:
        return 0.0
    # Saturating: 1 hit ≈ 0.6, 2 ≈ 0.8, 3+ → 1.0.
    return min(1.0, 0.6 + 0.2 * (hits - 1))


def _field_score(tender: Tender, org: OrgProfile) -> float:
    """Category + governorate fit in [0, 1] (0.6 category, 0.4 governorate)."""
    score = 0.0
    cat_norm = norm_ar(tender.category or "")
    if cat_norm:
        wanted = {norm_ar(c) for c in (org.classification_fields + org.supply_categories)}
        if any(w and (w in cat_norm or cat_norm in w) for w in wanted):
            score += 0.6
    else:
        score += 0.3  # unknown category: don't punish, partial credit

    if not org.governorates:
        score += 0.4  # org wants all governorates
    else:
        gov_norm = norm_ar(tender.governorate or "")
        wanted_gov = {norm_ar(g) for g in org.governorates}
        if not gov_norm or any(g in gov_norm or gov_norm in g for g in wanted_gov):
            score += 0.4
    return min(1.0, score)


def _is_excluded(title_norm: str, org: OrgProfile) -> bool:
    return any(norm_ar(x) in title_norm for x in org.exclude_keywords if x)


def match_one(
    tender: Tender,
    org: OrgProfile,
    org_embedding: list[float] | None = None,
) -> MatchResult:
    """Score a single tender against an org profile."""
    title_norm = norm_ar(tender.title)

    if _is_excluded(title_norm, org):
        return MatchResult(
            org_id=org.org_id,
            tender_hash=tender.hash,
            score=0.0,
            matched=False,
            reasons={"excluded": 1.0},
        )

    kw = _keyword_score(title_norm, org)
    fld = _field_score(tender, org)

    if org_embedding is None:
        org_embedding = embedding.embed(org.profile_text())
    emb_cos = embedding.cosine(tender.embedding, org_embedding)

    reasons: dict[str, float] = {"keyword": round(kw, 4), "field": round(fld, 4)}

    if emb_cos is None:
        # Drop the embedding term; renormalize keyword + field to sum to 1.0.
        total = W_KEYWORD + W_FIELD
        score = (W_KEYWORD * kw + W_FIELD * fld) / total
        reasons["embedding"] = -1.0  # sentinel: unavailable this run
    else:
        emb01 = max(0.0, min(1.0, (emb_cos + 1.0) / 2.0))  # cosine [-1,1] → [0,1]
        score = W_KEYWORD * kw + W_EMBEDDING * emb01 + W_FIELD * fld
        reasons["embedding"] = round(emb01, 4)

    score = round(min(1.0, score), 4)
    return MatchResult(
        org_id=org.org_id,
        tender_hash=tender.hash,
        score=score,
        matched=score >= THRESHOLD,
        reasons=reasons,
    )


def match_all(
    tenders: list[Tender], org: OrgProfile
) -> list[MatchResult]:
    """Score every tender against one org. Computes the org embedding once."""
    org_embedding = embedding.embed(org.profile_text())
    return [match_one(t, org, org_embedding) for t in tenders]
