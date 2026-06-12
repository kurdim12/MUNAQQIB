import type { Subscription } from "@/lib/billing";
import { STATUS_LABELS, TIER_LABELS, trialBannerText } from "@/lib/billing";

/** Subscription status strip above the dashboard. Renders nothing when active. */
export function TrialBanner({ sub }: { sub: Subscription | null }) {
  if (!sub) return null;
  const text = trialBannerText(sub);
  if (!text) return null;

  const urgent = text.includes("انتهت") || sub.status === "past_due";

  return (
    <div
      className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
        urgent
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-brand/30 bg-brand/5 text-brand-dark"
      }`}
    >
      <span>
        <span className="font-medium">{TIER_LABELS[sub.tier]}</span>
        <span className="mx-2 text-slate-300">·</span>
        {text}
        <span className="mr-2 text-xs text-slate-400">
          ({STATUS_LABELS[sub.status]})
        </span>
      </span>
      <a
        href="/pricing"
        className="shrink-0 rounded-md bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-dark"
      >
        ترقية الاشتراك
      </a>
    </div>
  );
}
