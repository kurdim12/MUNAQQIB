"use client";

import { useState } from "react";

import { requestUpgradeAction } from "@/app/pricing/actions";
import { PLANS, TIER_LABELS } from "@/lib/billing";

/** Pricing tier cards with a monthly/annual toggle (annual = 2 months free).
 *  Pro is anchored as "الأكثر اختياراً" with the primary gradient. */
export function PricingCards({
  currentTier,
  isActive,
}: {
  currentTier: string | null;
  isActive: boolean;
}) {
  const [annual, setAnnual] = useState(false);
  const plans = PLANS;

  return (
    <div>
      {/* Billing-period toggle */}
      <div className="mx-auto mt-8 flex w-fit items-center gap-1 rounded-full border border-line bg-white p-1 text-sm shadow-card">
        <button
          type="button"
          onClick={() => setAnnual(false)}
          className={`rounded-full px-4 py-1.5 font-semibold transition ${
            !annual ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
          }`}
        >
          شهري
        </button>
        <button
          type="button"
          onClick={() => setAnnual(true)}
          className={`rounded-full px-4 py-1.5 font-semibold transition ${
            annual ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
          }`}
        >
          سنوي <span className="text-primary-600">· شهران مجاناً</span>
        </button>
      </div>

      <div className="mt-10 grid items-start gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const featured = plan.tier === "pro";
          const isCurrent = currentTier === plan.tier && isActive;
          const price = annual ? plan.monthlyJod * 10 : plan.monthlyJod;
          return (
            <div
              key={plan.tier}
              className={`relative flex flex-col rounded-3xl bg-white p-7 transition ${
                featured
                  ? "shadow-card-hover ring-2 ring-primary md:-translate-y-3"
                  : "border border-line shadow-card hover:-translate-y-1 hover:shadow-card-hover"
              }`}
            >
              {featured && (
                <span className="absolute -top-3.5 start-1/2 -translate-x-1/2 rounded-full bg-primary-gradient px-4 py-1 text-xs font-bold text-white shadow-glow">
                  الأكثر اختياراً
                </span>
              )}
              <h2 className="text-xl font-extrabold text-ink">{plan.name}</h2>
              <p className="mt-1 min-h-[2.5rem] text-sm text-ink-soft">{plan.tagline}</p>
              <p className="mt-4 flex items-baseline gap-1.5">
                <span className="nums text-5xl font-extrabold text-ink">{price}</span>
                <span className="text-sm text-ink-muted">د.أ / {annual ? "سنة" : "شهر"}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-ink-soft">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[11px] font-bold text-primary-700">
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <form action={requestUpgradeAction} className="mt-7">
                <input type="hidden" name="tier" value={plan.tier} />
                <button
                  type="submit"
                  disabled={isCurrent}
                  className={`w-full rounded-xl px-4 py-3 font-bold transition active:scale-[0.98] disabled:cursor-default disabled:active:scale-100 ${
                    isCurrent
                      ? "bg-sand text-ink-muted"
                      : featured
                        ? "bg-primary-gradient text-white shadow-glow hover:brightness-105"
                        : "border border-line text-ink hover:border-primary/40 hover:bg-primary-50/40"
                  }`}
                >
                  {isCurrent ? "✓ خطتك الحالية" : `ابدأ بـ${TIER_LABELS[plan.tier]}`}
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
