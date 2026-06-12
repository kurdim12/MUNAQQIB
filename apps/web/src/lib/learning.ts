/**
 * Layer 13 — Learning Engine (system pipeline directive).
 * Every save (positive) and dismiss (negative) is a signal. We derive a per-
 * category affinity from the org's behavior and use it to re-rank future
 * opportunities — a borrowing of "you keep saving أشغال → show more أشغال first".
 * Pure + unit-tested (learning.test.ts).
 *
 * v1 uses the saved/dismissed signals we already capture. Opens/downloads
 * (weaker signals) are a future addition.
 */
export interface AffinityRow {
  category: string;
  saved: number;
  dismissed: number;
  total: number;
}

/** Per-category affinity in [-1, 1] — net (saved − dismissed) over volume. */
export function buildAffinity(rows: AffinityRow[]): Record<string, number> {
  const a: Record<string, number> = {};
  for (const r of rows) {
    const net = (r.saved - r.dismissed) / Math.max(1, r.total);
    a[r.category] = Math.max(-1, Math.min(1, net));
  }
  return a;
}

// How strongly behavior nudges ranking (±). Kept modest so relevance still leads.
const BOOST = 0.18;

/** Adjust an opportunity-quality value by the learned category affinity. */
export function personalizeValue(
  baseValue: number,
  category: string | null,
  affinity: Record<string, number>,
): number {
  if (!category) return baseValue;
  const aff = affinity[category] ?? 0;
  return baseValue * (1 + aff * BOOST);
}

/** Categories the user has shown positive interest in, strongest first. */
export function preferredCategories(affinity: Record<string, number>): string[] {
  return Object.entries(affinity)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
}
