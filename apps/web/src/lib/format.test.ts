import { describe, expect, it } from "vitest";

import { daysUntil, deadlineLabel, formatJod, scorePct } from "./format";

const NOW = new Date("2026-06-12T09:00:00Z");

describe("daysUntil", () => {
  it("counts whole days ahead", () => {
    expect(daysUntil("2026-06-15T09:00:00Z", NOW)).toBe(3);
  });
  it("is negative for past dates", () => {
    expect(daysUntil("2026-06-10T09:00:00Z", NOW)).toBe(-2);
  });
  it("returns null for missing/invalid", () => {
    expect(daysUntil(null, NOW)).toBeNull();
    expect(daysUntil("not-a-date", NOW)).toBeNull();
  });
});

describe("deadlineLabel", () => {
  it("uses Arabic grammar for small counts", () => {
    expect(deadlineLabel("2026-06-13T09:00:00Z", NOW)).toBe("متبقّي يوم واحد");
    expect(deadlineLabel("2026-06-14T09:00:00Z", NOW)).toBe("متبقّي يومان");
    expect(deadlineLabel("2026-06-15T09:00:00Z", NOW)).toBe("متبقّي 3 أيام");
  });
  it("flags closed and same-day", () => {
    expect(deadlineLabel("2026-06-01T09:00:00Z", NOW)).toBe("أُغلق");
    expect(deadlineLabel("2026-06-12T20:00:00Z", NOW)).toBe("يُغلق اليوم");
  });
});

describe("formatJod", () => {
  it("renders 3 decimals with the JOD symbol", () => {
    expect(formatJod(50)).toContain("د.أ");
    expect(formatJod(50)).toContain("50");
    expect(formatJod(null)).toBe("—");
  });
});

describe("scorePct", () => {
  it("rounds to a whole percent", () => {
    expect(scorePct(0.769)).toBe("77%");
    expect(scorePct(1)).toBe("100%");
  });
});
