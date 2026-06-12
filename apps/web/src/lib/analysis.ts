/**
 * AnalyzerBrief — the analyzer's structured output (CLAUDE.md §12.2), mirrored
 * from apps/worker/models/schemas.py. The worker stores `brief.model_dump_json()`
 * in analyses.result; `parseAnalyzerBrief` maps that JSON back to this shape.
 * Pure — unit-tested in analysis.test.ts.
 */
export type Eligibility = "مؤهل" | "غير مؤهل" | "يتطلب مراجعة";

export interface KeyDate {
  label: string;
  date: string;
  page: number;
}

export interface AnalyzerBrief {
  tender_title: string;
  entity: string;
  key_dates: KeyDate[];
  bid_bond: string | null;
  bond_page: number | null;
  performance_bond: string | null;
  required_classification: string | null;
  classification_page: number | null;
  doc_price_jod: number | null;
  scope_summary_ar: string;
  boq_present: boolean;
  submission_requirements: string[];
  risk_flags: string[];
  eligibility: Eligibility;
  eligibility_reasoning_ar: string;
  confidence: number;
}

const ELIGIBILITIES: Eligibility[] = ["مؤهل", "غير مؤهل", "يتطلب مراجعة"];

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}

/** Parse the stored result JSON into a typed brief. Returns null on bad input. */
export function parseAnalyzerBrief(raw: string | null | undefined): AnalyzerBrief | null {
  if (!raw) return null;
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!o || typeof o !== "object") return null;

  const eligibility = ELIGIBILITIES.includes(o.eligibility as Eligibility)
    ? (o.eligibility as Eligibility)
    : "يتطلب مراجعة";

  const key_dates: KeyDate[] = Array.isArray(o.key_dates)
    ? (o.key_dates as unknown[])
        .filter((d): d is Record<string, unknown> => !!d && typeof d === "object")
        .map((d) => ({
          label: String(d.label ?? ""),
          date: String(d.date ?? ""),
          page: Number(d.page ?? 0) || 0,
        }))
    : [];

  return {
    tender_title: String(o.tender_title ?? ""),
    entity: String(o.entity ?? ""),
    key_dates,
    bid_bond: o.bid_bond != null ? String(o.bid_bond) : null,
    bond_page: o.bond_page != null ? Number(o.bond_page) : null,
    performance_bond: o.performance_bond != null ? String(o.performance_bond) : null,
    required_classification:
      o.required_classification != null ? String(o.required_classification) : null,
    classification_page: o.classification_page != null ? Number(o.classification_page) : null,
    doc_price_jod: o.doc_price_jod != null ? Number(o.doc_price_jod) : null,
    scope_summary_ar: String(o.scope_summary_ar ?? ""),
    boq_present: Boolean(o.boq_present),
    submission_requirements: strArray(o.submission_requirements),
    risk_flags: strArray(o.risk_flags),
    eligibility,
    eligibility_reasoning_ar: String(o.eligibility_reasoning_ar ?? ""),
    confidence: Number(o.confidence ?? 0) || 0,
  };
}

/** Tailwind tone classes for the eligibility badge. */
export function eligibilityTone(e: Eligibility): string {
  if (e === "مؤهل") return "bg-green-100 text-green-800";
  if (e === "غير مؤهل") return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-800";
}
