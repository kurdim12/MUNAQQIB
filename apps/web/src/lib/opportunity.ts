/**
 * Layer 2 — the opportunity lifecycle (the piece that makes this a workflow, not
 * a feed). One opportunity = one (org, tender) pair with a *state*, and the
 * product's value is moving it through the pipeline.
 *
 *   جديد → قيد المراجعة → محلَّل → قرار: تقديم | تجاهل → متابعة → نتيجة: ربح | خسارة
 *
 * This module is the single source of truth for states, their Arabic labels, and
 * the legal transitions. Pure — no DB/IO — so it's unit-tested and shared by the
 * server actions (which enforce it) and the UI (which renders only legal moves).
 */
export type OppStatus =
  | "new" // جديد — matched, untouched
  | "reviewing" // قيد المراجعة — being looked at
  | "analyzed" // محلَّل — كرّاسة analyzed
  | "bid" // قرار: تقديم
  | "pass" // قرار: تجاهل
  | "tracking" // متابعة — submitted, awaiting result
  | "won" // نتيجة: ربح
  | "lost"; // نتيجة: خسارة

export const OPP_STATUSES: OppStatus[] = [
  "new", "reviewing", "analyzed", "bid", "pass", "tracking", "won", "lost",
];

export const OPP_LABELS: Record<OppStatus, string> = {
  new: "جديد",
  reviewing: "قيد المراجعة",
  analyzed: "محلَّل",
  bid: "قرار: تقديم",
  pass: "تجاهل",
  tracking: "متابعة",
  won: "ربح",
  lost: "خسارة",
};

/** Pipeline groupings for the (L3b) dashboard — decision-stage buckets. */
export const OPP_STAGE_GROUP: Record<OppStatus, "new" | "review" | "decision" | "tracking" | "closed"> = {
  new: "new",
  reviewing: "review",
  analyzed: "review",
  bid: "decision",
  pass: "closed",
  tracking: "tracking",
  won: "closed",
  lost: "closed",
};

/** Legal next states from each state. Terminal states (won/lost) return []. */
const TRANSITIONS: Record<OppStatus, OppStatus[]> = {
  new: ["reviewing", "pass"],
  reviewing: ["analyzed", "bid", "pass"],
  analyzed: ["bid", "pass"],
  bid: ["tracking", "won", "lost"],
  pass: ["reviewing"], // reopen a passed opportunity
  tracking: ["won", "lost"],
  won: [],
  lost: [],
};

export function nextStates(s: OppStatus): OppStatus[] {
  return TRANSITIONS[s] ?? [];
}

export function canTransition(from: OppStatus, to: OppStatus): boolean {
  return nextStates(from).includes(to);
}

export function isTerminal(s: OppStatus): boolean {
  return nextStates(s).length === 0;
}

/** A transition to bid/pass records a decision; won/lost records an outcome. */
export function decisionFor(to: OppStatus): "bid" | "pass" | null {
  return to === "bid" || to === "pass" ? to : null;
}
export function outcomeFor(to: OppStatus): "won" | "lost" | null {
  return to === "won" || to === "lost" ? to : null;
}

/** Semantic tone for badges (green=progress/win, amber=review, red=lost/pass). */
export function statusTone(s: OppStatus): "green" | "amber" | "red" | "neutral" {
  if (s === "won" || s === "bid") return "green";
  if (s === "reviewing" || s === "analyzed" || s === "tracking") return "amber";
  if (s === "lost" || s === "pass") return "red";
  return "neutral";
}

export function isOppStatus(v: unknown): v is OppStatus {
  return typeof v === "string" && (OPP_STATUSES as string[]).includes(v);
}
