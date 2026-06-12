/**
 * Layer 6 — Opportunity Quality Engine (system pipeline directive).
 * "Not all opportunities are equal." Combines relevance, deadline-fit, and a
 * size proxy into a single quality score → High / Medium / Low, which ranks the
 * feed. Pure + unit-tested (quality.test.ts).
 *
 * Honest scope: competition/entity-quality/contract-size aren't available yet
 * (Phase-2 award data), so we score from what we have — match relevance
 * (dominant), how actionable the deadline is, and the doc fee as a weak size
 * proxy. The weighting makes relevance decisive.
 */
export type QualityTier = "high" | "medium" | "low";

export interface Quality {
  tier: QualityTier;
  value: number; // 0–100
  label: string;
}

export interface QualityInput {
  score: number; // match relevance 0–1
  closing_at: string | null;
  doc_price_jod: number | null;
}

/** How actionable the deadline is: too tight or already closed scores low. */
function deadlineFit(closing: string | null, now: Date): number {
  if (!closing) return 0.5;
  const days = (new Date(closing).getTime() - now.getTime()) / 86_400_000;
  if (days < 0) return 0; // closed
  if (days < 2) return 0.35; // too tight to prepare a strong bid
  if (days <= 21) return 1; // ideal window
  return 0.7; // plenty of time (less urgency)
}

/** Doc (كرّاسة) fee as a weak proxy for contract size until real values exist. */
function sizeProxy(fee: number | null): number {
  if (fee == null) return 0.4;
  return Math.max(0.2, Math.min(1, fee / 200));
}

export function opportunityQuality(t: QualityInput, now: Date = new Date()): Quality {
  const relevance = Math.max(0, Math.min(1, t.score));
  const value = Math.round(
    (0.72 * relevance + 0.18 * deadlineFit(t.closing_at, now) + 0.1 * sizeProxy(t.doc_price_jod)) *
      100,
  );
  const tier: QualityTier = value >= 78 ? "high" : value >= 58 ? "medium" : "low";
  const label = tier === "high" ? "فرصة عالية" : tier === "medium" ? "فرصة متوسطة" : "فرصة منخفضة";
  return { tier, value, label };
}

export function qualityTone(tier: QualityTier): string {
  if (tier === "high") return "bg-green-100 text-green-800";
  if (tier === "medium") return "bg-amber-100 text-amber-800";
  return "bg-stone-100 text-stone-600";
}
