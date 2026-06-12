import { describe, expect, it } from "vitest";

import { buildAffinity, personalizeValue, preferredCategories } from "./learning";

const rows = [
  { category: "أشغال", saved: 3, dismissed: 0, total: 4 },
  { category: "لوازم", saved: 1, dismissed: 0, total: 3 },
  { category: "خدمات", saved: 0, dismissed: 2, total: 3 },
];

describe("buildAffinity", () => {
  it("is positive for saved-heavy, negative for dismissed-heavy", () => {
    const a = buildAffinity(rows);
    expect(a["أشغال"]).toBeGreaterThan(0);
    expect(a["خدمات"]).toBeLessThan(0);
    expect(a["أشغال"]).toBeGreaterThan(a["لوازم"]); // stronger save ratio
  });
  it("clamps to [-1, 1]", () => {
    const a = buildAffinity([{ category: "x", saved: 9, dismissed: 0, total: 1 }]);
    expect(a["x"]).toBeLessThanOrEqual(1);
  });
});

describe("personalizeValue", () => {
  it("boosts preferred categories and demotes disliked ones", () => {
    const a = buildAffinity(rows);
    expect(personalizeValue(70, "أشغال", a)).toBeGreaterThan(70);
    expect(personalizeValue(70, "خدمات", a)).toBeLessThan(70);
    expect(personalizeValue(70, "غير معروف", a)).toBe(70); // unknown → neutral
    expect(personalizeValue(70, null, a)).toBe(70);
  });
});

describe("preferredCategories", () => {
  it("returns positive-affinity categories, strongest first", () => {
    const pref = preferredCategories(buildAffinity(rows));
    expect(pref[0]).toBe("أشغال");
    expect(pref).not.toContain("خدمات");
  });
});
