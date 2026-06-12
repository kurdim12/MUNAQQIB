import { PLANS, TIER_LABELS } from "@/lib/billing";
import { getCurrentOrgId, getSubscription, isConfigured } from "@/lib/repo";
import { requestUpgradeAction } from "./actions";

export const dynamic = "force-dynamic";

// CliQ alias the customer pays to (placeholder — set via env before launch).
const CLIQ_ALIAS = process.env.CLIQ_ALIAS || "MUNAQQIB";

export default async function PricingPage() {
  const orgId = isConfigured() ? await getCurrentOrgId() : null;
  const sub = orgId ? await getSubscription(orgId) : null;
  const pending = sub?.status === "pending_payment" ? sub : null;

  return (
    <section className="animate-fade-in">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-ink">الخطط والأسعار</h1>
        <p className="mx-auto mt-2 max-w-lg text-ink-soft">
          ابدأ بتجربة مجانية 14 يوماً، ثم اختر الخطة المناسبة لمنشأتك.
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          الأسعار بالدينار الأردني شهرياً، وهي إرشادية وقابلة للتغيير.
        </p>
      </div>

      {pending && (
        <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">طلب الترقية قيد المعالجة.</p>
          <p className="mt-1">
            حوّل قيمة الاشتراك عبر <span className="font-semibold">كليك (CliQ)</span> إلى
            الاسم المستعار <span className="font-mono">{CLIQ_ALIAS}</span> مع ذكر الرقم
            المرجعي:
          </p>
          <p className="mt-2 rounded-lg bg-white px-3 py-2 font-mono text-base text-ink">
            {pending.cliq_reference}
          </p>
          <p className="mt-2 text-xs">سيُفعّل اشتراكك خلال ساعات من تأكيد الدفع.</p>
        </div>
      )}

      <div className="mt-10 grid items-start gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = sub?.tier === plan.tier && sub?.status === "active";
          const featured = plan.tier === "pro";
          return (
            <div
              key={plan.tier}
              className={`relative flex flex-col rounded-2xl bg-white p-6 transition ${
                featured
                  ? "border-2 border-ink shadow-card-hover md:-translate-y-3"
                  : "border border-line shadow-card hover:-translate-y-1 hover:shadow-card-hover"
              }`}
            >
              {featured && (
                <span className="absolute -top-3 right-6 rounded-full bg-ink px-3 py-1 text-xs font-bold text-white shadow-sm">
                  الأكثر شيوعاً
                </span>
              )}
              <h2 className="text-lg font-bold text-ink">{plan.name}</h2>
              <p className="mt-1 min-h-[2.5rem] text-sm text-ink-muted">{plan.tagline}</p>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="nums text-4xl font-extrabold text-ink">
                  {plan.monthlyJod}
                </span>
                <span className="text-sm text-ink-muted">د.أ / شهرياً</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-ink-soft">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sand/50 text-[10px] text-ink">
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <form action={requestUpgradeAction} className="mt-6">
                <input type="hidden" name="tier" value={plan.tier} />
                <button
                  type="submit"
                  disabled={isCurrent}
                  className={`w-full rounded-xl px-4 py-2.5 font-semibold transition active:scale-[0.98] disabled:cursor-default disabled:active:scale-100 ${
                    isCurrent
                      ? "bg-sand text-ink-muted"
                      : featured
                        ? "bg-ink text-white hover:bg-ink-soft"
                        : "border border-line text-ink hover:bg-sand/50"
                  }`}
                >
                  {isCurrent ? "✓ خطتك الحالية" : `الترقية إلى ${TIER_LABELS[plan.tier]}`}
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </section>
  );
}
