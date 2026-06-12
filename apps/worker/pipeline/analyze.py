"""Tender كرّاسة analyzer (CLAUDE.md §12.2) — the Phase-1 differentiator.

Two-pass, cost-disciplined, against the existing hybrid `llm_client` slots:

  pass 1 (cheap extraction)  → `complete("pass1", ...)`  — DeepSeek via OpenRouter.
      Pulls the factual fields out of the document text (dates, bonds, fees,
      classification, scope, submission list). Cheap model is plenty for extraction.

  pass 2 (high-value reasoning) → `complete("eligibility", ...)` — Anthropic-direct
      claude-sonnet-4-6 (the "never downgrade" slot). Given the pass-1 facts + the
      org profile, it decides eligibility (مؤهل / غير مؤهل / يتطلب مراجعة), the
      Arabic reasoning, risk flags, and confidence.

COST DISCIPLINE (CLAUDE.md §7 — budget < 1.0 JOD/doc, target ~0.3):
  Inputs are hard-capped (MAX_DOC_CHARS / MAX_PASS2_CHARS) so cost is bounded
  regardless of كرّاسة size. Worst-case per document, with the input fully saturated:
    pass1 ≈ 20k in @ $0.30/M + 2k out @ $1.20/M               ≈ $0.0084   (OpenRouter est.)
    pass2 ≈ 9.3k in @ $3.00/M + 2k out @ $15.00/M (sonnet-4-6) ≈ $0.058
    total ≈ $0.066 USD ≈ 0.047 JOD  →  well under the 1.0 JOD ceiling.
  `estimate_cost_usd` recomputes from the actual text lengths and we persist it to
  `analyses.cost_usd`; `analyze_document` refuses pass 2 if the running estimate
  would breach the budget (a safety net — the caps already keep us far below it).

The LLM façade is injected (`complete_fn`) so tests run fully offline with stubs.
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Callable, Mapping

from llm_client import complete
from models.schemas import AnalyzerBrief, KeyDate, OrgProfile

logger = logging.getLogger(__name__)

# --- Cost guardrails --------------------------------------------------------
USD_PER_JOD = 1.41  # 1 JOD ≈ 1.41 USD (pegged). Budget 1.0 JOD ≈ 1.41 USD.
BUDGET_JOD = 1.0
CHARS_PER_TOKEN = 3.0  # Arabic is token-dense; deliberately low → over-estimates cost.

# Per-1M-token rates (USD). Sonnet 4.6 is authoritative; the cheap slot is an estimate.
RATE_PASS1_IN, RATE_PASS1_OUT = 0.30, 1.20  # deepseek-class via OpenRouter (est.)
RATE_PASS2_IN, RATE_PASS2_OUT = 3.00, 15.00  # claude-sonnet-4-6 (authoritative)

# Hard input caps → bounded worst-case cost.
MAX_DOC_CHARS = 60_000  # ~20k tokens fed to pass 1
MAX_PASS2_CHARS = 24_000  # excerpt fed to pass 2 alongside the pass-1 facts

CompleteFn = Callable[..., str]


@dataclass
class AnalysisResult:
    status: str  # "done" | "failed"
    brief: AnalyzerBrief | None
    pages: int
    cost_usd: float
    error: str | None = None


# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------
def extract_text(data: bytes, content_type: str | None = None) -> tuple[str, int]:
    """Return (text, page_count) from a document blob.

    PDFs go through pypdf (lazy import). Scanned PDFs yield little/no text — OCR
    via pytesseract is the documented fallback but is left to the caller/runtime
    (system `tesseract-ocr-ara` required). Non-PDF blobs are decoded as UTF-8.
    """
    is_pdf = (content_type or "").lower().endswith("pdf") or data[:5] == b"%PDF-"
    if is_pdf:
        try:
            from io import BytesIO  # lazy
            from pypdf import PdfReader

            reader = PdfReader(BytesIO(data))
            pages = reader.pages
            text = "\n".join((p.extract_text() or "") for p in pages)
            return text, len(pages)
        except Exception as exc:  # pragma: no cover - depends on pypdf + real PDF
            logger.warning("pdf extract failed: %s", exc)
            return "", 0
    return data.decode("utf-8", errors="replace"), 1


# ---------------------------------------------------------------------------
# Cost
# ---------------------------------------------------------------------------
def _tokens(text: str) -> float:
    return len(text) / CHARS_PER_TOKEN


def estimate_cost_usd(p1_in: str, p1_out: str, p2_in: str, p2_out: str) -> float:
    """Estimate spend from text lengths (no usage API on the façade)."""
    cost = (
        _tokens(p1_in) * RATE_PASS1_IN
        + _tokens(p1_out) * RATE_PASS1_OUT
        + _tokens(p2_in) * RATE_PASS2_IN
        + _tokens(p2_out) * RATE_PASS2_OUT
    ) / 1_000_000
    return round(cost, 5)


def usd_to_jod(usd: float) -> float:
    return usd / USD_PER_JOD


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------
_PASS1_SYS = (
    "أنت محلّل عطاءات خبير. استخرج الحقائق من نص كرّاسة العطاء وأعِدها بصيغة JSON فقط، "
    "دون أي شرح خارج JSON. إن لم تجد قيمة استخدم null. المفاتيح المطلوبة: "
    "tender_title, entity, key_dates (قائمة من {label,date,page}), bid_bond, bond_page, "
    "performance_bond, required_classification, classification_page, doc_price_jod (رقم), "
    "scope_summary_ar (≤120 كلمة), boq_present (true/false), submission_requirements (قائمة نصوص)."
)

_PASS2_SYS = (
    "أنت مستشار تأهيل للمناقصات في الأردن. بناءً على حقائق العطاء وملف المنشأة، "
    "احكم على الأهلية وأعِد JSON فقط بالمفاتيح: eligibility (واحدة من: \"مؤهل\"، "
    "\"غير مؤهل\"، \"يتطلب مراجعة\")، eligibility_reasoning_ar (سبب موجز بالعربية)، "
    "risk_flags (قائمة مخاطر مختصرة)، confidence (رقم بين 0 و1)."
)


def _pass1_user(doc_text: str) -> str:
    return f"نص الكرّاسة:\n\n{doc_text[:MAX_DOC_CHARS]}"


def _pass2_user(facts: dict, profile: OrgProfile, excerpt: str) -> str:
    prof = {
        "sector": profile.sector,
        "classification_fields": profile.classification_fields,
        "classification_grade": profile.classification_grade,
        "supply_categories": profile.supply_categories,
        "governorates": profile.governorates,
    }
    return (
        "حقائق العطاء (من التحليل الأولي):\n"
        + json.dumps(facts, ensure_ascii=False)
        + "\n\nملف المنشأة:\n"
        + json.dumps(prof, ensure_ascii=False)
        + "\n\nمقتطف من الكرّاسة:\n"
        + excerpt[:MAX_PASS2_CHARS]
    )


# ---------------------------------------------------------------------------
# JSON parsing (LLMs often fence JSON or add prose)
# ---------------------------------------------------------------------------
_FENCE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)


def _extract_json(raw: str) -> dict:
    m = _FENCE.search(raw)
    candidate = m.group(1) if m else raw
    start, end = candidate.find("{"), candidate.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = candidate[start : end + 1]
    return json.loads(candidate)


# ---------------------------------------------------------------------------
# Assembly
# ---------------------------------------------------------------------------
_ELIGIBILITY = {"مؤهل", "غير مؤهل", "يتطلب مراجعة"}


def _build_brief(p1: dict, p2: dict, tender: Mapping) -> AnalyzerBrief:
    key_dates = [
        KeyDate(label=str(d.get("label", "")), date=str(d.get("date", "")), page=int(d.get("page") or 0))
        for d in (p1.get("key_dates") or [])
        if isinstance(d, dict)
    ]
    eligibility = p2.get("eligibility")
    if eligibility not in _ELIGIBILITY:
        eligibility = "يتطلب مراجعة"
    return AnalyzerBrief(
        tender_title=str(p1.get("tender_title") or tender.get("title") or ""),
        entity=str(p1.get("entity") or tender.get("entity") or ""),
        key_dates=key_dates,
        bid_bond=p1.get("bid_bond"),
        bond_page=p1.get("bond_page"),
        performance_bond=p1.get("performance_bond"),
        required_classification=p1.get("required_classification"),
        classification_page=p1.get("classification_page"),
        doc_price_jod=p1.get("doc_price_jod") if p1.get("doc_price_jod") is not None else tender.get("doc_price_jod"),
        scope_summary_ar=str(p1.get("scope_summary_ar") or ""),
        boq_present=bool(p1.get("boq_present", False)),
        submission_requirements=list(p1.get("submission_requirements") or []),
        risk_flags=list(p2.get("risk_flags") or []),
        eligibility=eligibility,
        eligibility_reasoning_ar=str(p2.get("eligibility_reasoning_ar") or ""),
        confidence=float(p2.get("confidence") or 0.0),
    )


def analyze_document(
    doc_text: str,
    pages: int,
    tender: Mapping,
    profile: OrgProfile,
    *,
    complete_fn: CompleteFn = complete,
) -> AnalysisResult:
    """Run the two-pass analysis over already-extracted text. Pure of IO except
    the injected `complete_fn` — tests stub it, so this runs fully offline."""
    doc_text = doc_text[:MAX_DOC_CHARS]
    p1_user = _pass1_user(doc_text)
    cost = 0.0
    try:
        p1_raw = complete_fn("pass1", _PASS1_SYS, p1_user, max_tokens=2048)
        p1 = _extract_json(p1_raw)

        p2_user = _pass2_user(p1, profile, doc_text)
        # Budget guard (safety net — caps already bound us far below 1.0 JOD).
        projected = estimate_cost_usd(p1_user, p1_raw, p2_user, p2_user)
        if usd_to_jod(projected) > BUDGET_JOD:
            raise RuntimeError(f"analysis would exceed budget: {usd_to_jod(projected):.2f} JOD")

        p2_raw = complete_fn("eligibility", _PASS2_SYS, p2_user, max_tokens=1024)
        p2 = _extract_json(p2_raw)

        brief = _build_brief(p1, p2, tender)
        cost = estimate_cost_usd(p1_user, p1_raw, p2_user, p2_raw)
        return AnalysisResult(status="done", brief=brief, pages=pages, cost_usd=cost)
    except Exception as exc:
        logger.warning("analysis failed: %s", exc)
        return AnalysisResult(status="failed", brief=None, pages=pages, cost_usd=cost, error=str(exc))
