/**
 * Subscription tiers + trial helpers (pure — unit-tested in billing.test.ts).
 *
 * Prices are the LOCKED master-brief tiers: Radar 15 / Pro 79 / Intelligence 199
 * JOD/month (annual = 2 months free). Tier names + the four-tier shape match the
 * D1 schema (subscriptions.tier CHECK constraint). Billing is manual CliQ (v1).
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
  monthlyJod: number;
  tagline: string;
  features: string[];
}

export const PLANS: TierPlan[] = [
  {
    tier: "radar",
    name: "رادار",
    monthlyJod: 15,
    tagline: "ابدأ هنا: لا يفوتك عطاء يناسب تصنيفك.",
    features: [
      "إيميل صباحي يومي بالعطاءات المطابقة لتصنيف شركتك",
      "تنبيهات للمواعيد النهائية عبر تيليجرام",
      "مصدرا GTD و JONEPS الرسميان",
      "لوحة تحكّم بالفرص المطابقة",
    ],
  },
  {
    tier: "pro",
    name: "برو",
    monthlyJod: 79,
    tagline: "للجادّين: حلّل الكرّاسة وقرّر بثقة.",
    features: [
      "كل مزايا رادار",
      "تحليل كرّاسة العطاء: الأهلية، الكفالات، المواعيد، والمخاطر",
      "متابعة العطاءات عبر مراحلها حتى القرار",
      "حتى ٣ مستخدمين · تصدير CSV",
    ],
  },
  {
    tier: "intelligence",
    name: "إنتليجنس",
    monthlyJod: 199,
    tagline: "سعّر عروضك ببيانات السوق الحقيقية.",
    features: [
      "كل مزايا برو",
      "أسعار الإحالات التاريخية لتسعير عروضك",
      "مَن يفوز عادةً في كل جهة وتصنيف",
      "تحليل كرّاسات بلا حدود · حتى ١٠ مستخدمين · أولوية بالدعم",
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
