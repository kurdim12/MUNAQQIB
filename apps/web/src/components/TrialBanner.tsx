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
      className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
        urgent
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-line bg-sand/50 text-ink"
      }`}
    >
      <span className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-white/70 px-2 py-0.5 text-xs font-bold">
          {TIER_LABELS[sub.tier]}
        </span>
        {text}
        <span className="text-xs text-ink-muted">({STATUS_LABELS[sub.status]})</span>
      </span>
      <a
        href="/pricing"
        className="shrink-0 rounded-lg bg-ink px-3.5 py-1.5 font-semibold text-white transition hover:bg-ink-soft"
      >
        ترقية الاشتراك
      </a>
    </div>
  );
}
