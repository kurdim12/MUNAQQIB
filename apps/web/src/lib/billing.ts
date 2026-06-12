/**
 * Subscription tiers + trial helpers (pure — unit-tested in billing.test.ts).
 *
 * NOTE: the JOD prices below are PLACEHOLDERS pending the master brief's pricing
 * table (DECISIONS.md). The UI renders them as "indicative" (قابلة للتغيير); do not
 * treat them as final. Tier *names* and the four-tier shape match the D1 schema
 * (subscriptions.tier CHECK constraint).
 */
export type Tier = "trial" | "radar" | "pro" | "intelligence";
export type SubStatus =
  | "trial"
  | "pending_payment"
  | "active"
  | "past_due"
  | "cancelled";

export interface Subscription {
  tier: Tier;
  status: SubStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cliq_reference: string | null;
}

export interface TierPlan {
  tier: Tier;
  name: string;
  monthlyJod: number; // placeholder
  tagline: string;
  features: string[];
}

export const PLANS: TierPlan[] = [
  {
    tier: "radar",
    name: "رادار",
    monthlyJod: 15,
    tagline: "الملخّص الصباحي المطابق لتصنيفك.",
    features: [
      "ملخّص إيميل يومي بالعطاءات المطابقة",
      "تنبيهات تيليجرام للمواعيد النهائية",
      "مصدرَا GTD و JONEPS",
    ],
  },
  {
    tier: "pro",
    name: "برو",
    monthlyJod: 35,
    tagline: "تحليل الكرّاسات وذكاء المواعيد.",
    features: [
      "كل مزايا رادار",
      "تحليل كرّاسة العطاء بالذكاء الاصطناعي",
      "مصادر إضافية (أمانة عمّان، الصناعة)",
      "حفظ العطاءات ومتابعتها",
    ],
  },
  {
    tier: "intelligence",
    name: "إنتليجنس",
    monthlyJod: 75,
    tagline: "أسعار الإحالات وذكاء المنافسة.",
    features: [
      "كل مزايا برو",
      "بيانات الإحالات والأسعار التاريخية",
      "تحليل المنافسين",
      "أولوية في الدعم",
    ],
  },
];

export const TIER_LABELS: Record<Tier, string> = {
  trial: "تجربة مجانية",
  radar: "رادار",
  pro: "برو",
  intelligence: "إنتليجنس",
};

export const STATUS_LABELS: Record<SubStatus, string> = {
  trial: "تجربة مجانية",
  pending_payment: "بانتظار تأكيد الدفع",
  active: "مُفعّل",
  past_due: "متأخّر السداد",
  cancelled: "ملغى",
};

/** Whole days left in the trial (0 if ended/none), Amman-agnostic (UTC instant). */
export function trialDaysLeft(
  sub: Pick<Subscription, "trial_ends_at">,
  now: Date = new Date(),
): number {
  if (!sub.trial_ends_at) return 0;
  const end = new Date(sub.trial_ends_at);
  if (Number.isNaN(end.getTime())) return 0;
  const ms = end.getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** Short Arabic line describing the subscription state for the banner. */
export function trialBannerText(
  sub: Pick<Subscription, "status" | "trial_ends_at" | "tier" | "current_period_end">,
  now: Date = new Date(),
): string | null {
  if (sub.status === "trial") {
    const days = trialDaysLeft(sub, now);
    if (days <= 0) return "انتهت تجربتك المجانية — فعّل اشتراكك للمتابعة.";
    if (days === 1) return "متبقّي يوم واحد في تجربتك المجانية.";
    if (days === 2) return "متبقّي يومان في تجربتك المجانية.";
    return `متبقّي ${days} ${days <= 10 ? "أيام" : "يوماً"} في تجربتك المجانية.`;
  }
  if (sub.status === "pending_payment") {
    return "طلب الترقية قيد المعالجة — سيُفعّل اشتراكك بعد تأكيد الدفع عبر كليك.";
  }
  if (sub.status === "past_due") return "اشتراكك متأخّر السداد — يُرجى التجديد.";
  if (sub.status === "active" && periodEnded(sub, now)) {
    return "انتهت صلاحية اشتراكك — يُرجى التجديد للمتابعة.";
  }
  return null; // active & current / cancelled → no banner
}

/** True when a subscription's paid period has a date and it's in the past. */
export function periodEnded(
  sub: Pick<Subscription, "current_period_end">,
  now: Date = new Date(),
): boolean {
  if (!sub.current_period_end) return false;
  const end = new Date(sub.current_period_end);
  return !Number.isNaN(end.getTime()) && end.getTime() <= now.getTime();
}
