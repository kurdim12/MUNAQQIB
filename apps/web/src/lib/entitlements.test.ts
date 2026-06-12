import { describe, expect, it } from "vitest";

import { can, effectiveTier, hasAccess } from "./entitlements";

const NOW = new Date("2026-06-12T09:00:00Z");
const future = "2026-06-20T09:00:00Z";
const past = "2026-06-01T09:00:00Z";

describe("effectiveTier", () => {
  it("active paid → its own tier", () => {
    expect(
      effectiveTier({ tier: "radar", status: "active", trial_ends_at: null }, NOW),
    ).toBe("radar");
  });
  it("live trial → full (intelligence)", () => {
    expect(
      effectiveTier({ tier: "trial", status: "trial", trial_ends_at: future }, NOW),
    ).toBe("intelligence");
  });
  it("expired trial / pending / cancelled → no access", () => {
    expect(
      effectiveTier({ tier: "trial", status: "trial", trial_ends_at: past }, NOW),
    ).toBeNull();
    expect(
      effectiveTier({ tier: "pro", status: "pending_payment", trial_ends_at: null }, NOW),
    ).toBeNull();
    expect(effectiveTier(null, NOW)).toBeNull();
  });
});

describe("can / hasAccess", () => {
  it("radar unlocks dashboard but not analyzer/pricing", () => {
    const radar = { tier: "radar" as const, status: "active" as const, trial_ends_at: null };
    expect(can(radar, "dashboard", NOW)).toBe(true);
    expect(can(radar, "analyzer", NOW)).toBe(false);
    expect(can(radar, "pricing_intel", NOW)).toBe(false);
  });
  it("pro unlocks analyzer + saved, not pricing intel", () => {
    const pro = { tier: "pro" as const, status: "active" as const, trial_ends_at: null };
    expect(can(pro, "analyzer", NOW)).toBe(true);
    expect(can(pro, "saved", NOW)).toBe(true);
    expect(can(pro, "pricing_intel", NOW)).toBe(false);
  });
  it("a live trial unlocks everything; an expired one nothing", () => {
    const trialing = { tier: "trial" as const, status: "trial" as const, trial_ends_at: future };
    expect(can(trialing, "pricing_intel", NOW)).toBe(true);
    expect(hasAccess(trialing, NOW)).toBe(true);

    const expired = { tier: "trial" as const, status: "trial" as const, trial_ends_at: past };
    expect(hasAccess(expired, NOW)).toBe(false);
    expect(can(expired, "dashboard", NOW)).toBe(false);
  });
});
