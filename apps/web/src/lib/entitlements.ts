/**
 * Entitlements — what a subscription unlocks (pure, unit-tested).
 *
 * Two columns drive access: `tier` (radar/pro/intelligence) and `status`. An
 * ACTIVE trial grants FULL access (intelligence-level) so prospects experience the
 * whole product before paying — a deliberate conversion choice (DECISIONS.md).
 * Once the trial ends, access requires an `active` paid subscription; everything
 * else (pending_payment, past_due, cancelled, expired trial) has no access.
 */
import type { Subscription, Tier } from "./billing";
import { trialDaysLeft } from "./billing";

export type Feature = "dashboard" | "saved" | "analyzer" | "pricing_intel";

/** Lowest tier that unlocks each feature. */
const MIN_TIER: Record<Feature, Tier> = {
  dashboard: "radar", // the matched-tenders dashboard = base paid feature
  saved: "pro",
  analyzer: "pro", // كرّاسة analysis (Phase 1+)
  pricing_intel: "intelligence", // award/price data (premium moat)
};

const RANK: Record<Tier, number> = { trial: 0, radar: 1, pro: 2, intelligence: 3 };

/**
 * The tier a subscription effectively has RIGHT NOW, or null for no access.
 * Active paid (and not past its current_period_end) → its tier; live trial →
 * intelligence (full); otherwise null. The period-end check denies access even
 * before the worker's daily sweep flips the row to past_due.
 */
export function effectiveTier(
  sub: Pick<Subscription, "tier" | "status" | "trial_ends_at" | "current_period_end"> | null,
  now: Date = new Date(),
): Tier | null {
  if (!sub) return null;
  if (sub.status === "active") {
    if (sub.current_period_end) {
      const end = new Date(sub.current_period_end);
      if (!Number.isNaN(end.getTime()) && end.getTime() <= now.getTime()) return null;
    }
    return sub.tier;
  }
  if (sub.status === "trial" && trialDaysLeft(sub, now) > 0) return "intelligence";
  return null;
}

/** Does the subscription currently unlock `feature`? */
export function can(
  sub: Pick<Subscription, "tier" | "status" | "trial_ends_at" | "current_period_end"> | null,
  feature: Feature,
  now: Date = new Date(),
): boolean {
  const tier = effectiveTier(sub, now);
  if (!tier) return false;
  return RANK[tier] >= RANK[MIN_TIER[feature]];
}

/** Any access at all (live trial or active paid). */
export function hasAccess(
  sub: Pick<Subscription, "tier" | "status" | "trial_ends_at" | "current_period_end"> | null,
  now: Date = new Date(),
): boolean {
  return effectiveTier(sub, now) !== null;
}
