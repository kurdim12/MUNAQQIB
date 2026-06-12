import { describe, expect, it } from "vitest";

import { trialBannerText, trialDaysLeft } from "./billing";

const NOW = new Date("2026-06-12T09:00:00Z");

describe("trialDaysLeft", () => {
  it("rounds up remaining days", () => {
    expect(trialDaysLeft({ trial_ends_at: "2026-06-15T09:00:00Z" }, NOW)).toBe(3);
    expect(trialDaysLeft({ trial_ends_at: "2026-06-12T20:00:00Z" }, NOW)).toBe(1);
  });
  it("is 0 when ended or missing", () => {
    expect(trialDaysLeft({ trial_ends_at: "2026-06-10T09:00:00Z" }, NOW)).toBe(0);
    expect(trialDaysLeft({ trial_ends_at: null }, NOW)).toBe(0);
  });
});

describe("trialBannerText", () => {
  it("counts down an active trial with Arabic grammar", () => {
    expect(
      trialBannerText({ status: "trial", tier: "trial", trial_ends_at: "2026-06-13T09:00:00Z", current_period_end: null }, NOW),
    ).toBe("متبقّي يوم واحد في تجربتك المجانية.");
    expect(
      trialBannerText({ status: "trial", tier: "trial", trial_ends_at: "2026-06-15T09:00:00Z", current_period_end: null }, NOW),
    ).toBe("متبقّي 3 أيام في تجربتك المجانية.");
  });
  it("messages an expired trial and pending payment", () => {
    expect(
      trialBannerText({ status: "trial", tier: "trial", trial_ends_at: "2026-06-01T09:00:00Z", current_period_end: null }, NOW),
    ).toContain("انتهت");
    expect(
      trialBannerText({ status: "pending_payment", tier: "radar", trial_ends_at: null, current_period_end: null }, NOW),
    ).toContain("كليك");
  });
  it("shows no banner for a current active sub, but warns when lapsed", () => {
    expect(
      trialBannerText(
        { status: "active", tier: "pro", trial_ends_at: null, current_period_end: "2026-07-01T00:00:00Z" },
        NOW,
      ),
    ).toBeNull();
    expect(
      trialBannerText(
        { status: "active", tier: "pro", trial_ends_at: null, current_period_end: "2026-06-01T00:00:00Z" },
        NOW,
      ),
    ).toContain("انتهت صلاحية");
  });
});
