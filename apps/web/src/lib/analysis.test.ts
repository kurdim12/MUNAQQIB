import { describe, expect, it } from "vitest";

import { eligibilityTone, parseAnalyzerBrief } from "./analysis";

const FULL = JSON.stringify({
  tender_title: "إنشاء مدرسة",
  entity: "وزارة الأشغال",
  key_dates: [{ label: "إغلاق", date: "2026-07-15", page: 3 }],
  bid_bond: "5000 دينار",
  bond_page: 4,
  performance_bond: "10%",
  required_classification: "أبنية - الثالثة",
  classification_page: 2,
  doc_price_jod: 150,
  scope_summary_ar: "مبنى من ثلاثة طوابق.",
  boq_present: true,
  submission_requirements: ["شهادة التصنيف", "كفالة"],
  risk_flags: ["مهلة قصيرة"],
  eligibility: "مؤهل",
  eligibility_reasoning_ar: "التصنيف مطابق.",
  confidence: 0.82,
});

describe("parseAnalyzerBrief", () => {
  it("maps the full pydantic JSON", () => {
    const b = parseAnalyzerBrief(FULL)!;
    expect(b.tender_title).toBe("إنشاء مدرسة");
    expect(b.key_dates[0]).toEqual({ label: "إغلاق", date: "2026-07-15", page: 3 });
    expect(b.doc_price_jod).toBe(150);
    expect(b.boq_present).toBe(true);
    expect(b.submission_requirements).toHaveLength(2);
    expect(b.eligibility).toBe("مؤهل");
  });

  it("defaults unknown eligibility to review and tolerates missing fields", () => {
    const b = parseAnalyzerBrief(
      JSON.stringify({ tender_title: "x", entity: "y", eligibility: "ربما" }),
    )!;
    expect(b.eligibility).toBe("يتطلب مراجعة");
    expect(b.key_dates).toEqual([]);
    expect(b.bid_bond).toBeNull();
    expect(b.risk_flags).toEqual([]);
  });

  it("returns null on empty or malformed input", () => {
    expect(parseAnalyzerBrief(null)).toBeNull();
    expect(parseAnalyzerBrief("")).toBeNull();
    expect(parseAnalyzerBrief("not json")).toBeNull();
  });
});

describe("eligibilityTone", () => {
  it("color-codes each verdict", () => {
    expect(eligibilityTone("مؤهل")).toContain("green");
    expect(eligibilityTone("غير مؤهل")).toContain("red");
    expect(eligibilityTone("يتطلب مراجعة")).toContain("amber");
  });
});
