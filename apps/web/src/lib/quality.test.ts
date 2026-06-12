import { describe, expect, it } from "vitest";

import { opportunityQuality } from "./quality";

const NOW = new Date("2026-06-12T09:00:00Z");
const inDays = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString();

describe("opportunityQuality", () => {
  it("high relevance + actionable deadline → high tier", () => {
    const q = opportunityQuality({ score: 0.93, closing_at: inDays(10), doc_price_jod: 150 }, NOW);
    expect(q.tier).toBe("high");
    expect(q.value).toBeGreaterThanOrEqual(78);
    expect(q.label).toBe("فرصة عالية");
  });

  it("a borderline match with no urgency → low tier", () => {
    const q = opportunityQuality({ score: 0.56, closing_at: inDays(40), doc_price_jod: null }, NOW);
    expect(q.tier).toBe("low");
  });

  it("a closed deadline drags quality down", () => {
    const open = opportunityQuality({ score: 0.8, closing_at: inDays(10), doc_price_jod: 100 }, NOW);
    const closed = opportunityQuality({ score: 0.8, closing_at: inDays(-2), doc_price_jod: 100 }, NOW);
    expect(closed.value).toBeLessThan(open.value);
  });

  it("a too-tight deadline scores below the ideal window", () => {
    const tight = opportunityQuality({ score: 0.8, closing_at: inDays(1), doc_price_jod: 100 }, NOW);
    const ideal = opportunityQuality({ score: 0.8, closing_at: inDays(10), doc_price_jod: 100 }, NOW);
    expect(tight.value).toBeLessThan(ideal.value);
  });

  it("value stays within 0–100", () => {
    const q = opportunityQuality({ score: 1, closing_at: inDays(7), doc_price_jod: 500 }, NOW);
    expect(q.value).toBeLessThanOrEqual(100);
    expect(q.value).toBeGreaterThanOrEqual(0);
  });
});
