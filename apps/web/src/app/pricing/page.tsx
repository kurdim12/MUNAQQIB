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
    <section>
      <h1 className="text-2xl font-bold text-slate-900">الخطط والأسعار</h1>
      <p className="mt-1 text-slate-600">
        ابدأ بتجربة مجانية 14 يوماً، ثم اختر الخطة المناسبة لمنشأتك.
      </p>
      <p className="mt-1 text-xs text-slate-400">
        الأسعار بالدينار الأردني شهرياً، وهي إرشادية وقابلة للتغيير.
      </p>

      {pending && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">طلب الترقية قيد المعالجة.</p>
          <p className="mt-1">
            حوّل قيمة الاشتراك عبر <span className="font-semibold">كليك (CliQ)</span> إلى
            الاسم المستعار <span className="font-mono">{CLIQ_ALIAS}</span> مع ذكر الرقم
            المرجعي:
          </p>
          <p className="mt-2 rounded bg-white px-3 py-2 font-mono text-base text-slate-800">
            {pending.cliq_reference}
          </p>
          <p className="mt-2 text-xs">سيُفعّل اشتراكك خلال ساعات من تأكيد الدفع.</p>
        </div>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = sub?.tier === plan.tier && sub?.status === "active";
          return (
            <div
              key={plan.tier}
              className={`flex flex-col rounded-xl border bg-white p-6 shadow-sm ${
                plan.tier === "pro" ? "border-brand ring-1 ring-brand" : "border-slate-200"
              }`}
            >
              <h2 className="text-lg font-bold text-slate-900">{plan.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>
              <p className="mt-3">
                <span className="nums text-3xl font-bold text-slate-900">
                  {plan.monthlyJod}
                </span>
                <span className="mr-1 text-sm text-slate-500"> د.أ / شهرياً</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-brand">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <form action={requestUpgradeAction} className="mt-6">
                <input type="hidden" name="tier" value={plan.tier} />
                <button
                  type="submit"
                  disabled={isCurrent}
                  className="w-full rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark disabled:bg-slate-300"
                >
                  {isCurrent ? "خطتك الحالية" : `الترقية إلى ${TIER_LABELS[plan.tier]}`}
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </section>
  );
}
