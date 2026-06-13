import { PricingCards } from "@/components/PricingCards";
import { PLANS, STATUS_LABELS, TIER_LABELS, trialDaysLeft } from "@/lib/billing";
import { getCurrentOrgId, getSubscription, isConfigured } from "@/lib/repo";

export const dynamic = "force-dynamic";

const CLIQ_ALIAS = process.env.CLIQ_ALIAS || "MUNAQQIB";

const STATUS_TONE: Record<string, string> = {
  trial: "bg-amber-100 text-amber-800",
  pending_payment: "bg-amber-100 text-amber-800",
  active: "bg-primary-100 text-primary-800",
  past_due: "bg-red-100 text-red-700",
  cancelled: "bg-sand text-ink-soft",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ar", {
    timeZone: "Asia/Amman",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

// المنطقة ③ التشغيل — الفوترة اليدوية عبر CliQ تُبقي الحساب فعّالاً فتستمر الإحاطة.
export default async function BillingPage() {
  const orgId = isConfigured() ? await getCurrentOrgId() : null;
  const sub = orgId ? await getSubscription(orgId) : null;

  const tier = sub?.tier ?? "trial";
  const status = sub?.status ?? "trial";
  const plan = PLANS.find((p) => p.tier === tier);
  const days = sub ? trialDaysLeft(sub) : 0;

  return (
    <section className="animate-fade-in space-y-10">
      <header>
        <p className="eyebrow">المنطقة ③ · الفوترة</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink sm:text-4xl">الخطة والفوترة</h1>
      </header>

      {/* Current plan */}
      <div className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-ink-muted">خطتك الحالية</p>
            <p className="mt-1 text-2xl font-extrabold text-ink">
              {TIER_LABELS[tier]}
              {plan && status === "active" && (
                <span className="ms-2 text-sm font-medium text-ink-muted">
                  <span className="nums">{plan.monthlyJod}</span> د.أ / شهر
                </span>
              )}
            </p>
          </div>
          <span className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${STATUS_TONE[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>
        <p className="mt-4 text-sm text-ink-soft">
          {status === "trial" && (days > 0 ? `متبقّي ${days} يوماً في تجربتك المجانية — اختر خطة قبل انتهائها.` : "انتهت تجربتك المجانية — فعّل اشتراكك للمتابعة.")}
          {status === "active" && `يتجدّد اشتراكك في ${fmtDate(sub?.current_period_end ?? null)}.`}
          {status === "pending_payment" && "في انتظار تأكيد الحوالة — عادةً خلال ساعات."}
          {status === "past_due" && "اشتراكك متأخّر السداد — الإحاطة متوقّفة مؤقتاً حتى التجديد."}
        </p>
      </div>

      {/* Invoice (pending payment) */}
      {status === "pending_payment" && sub?.cliq_reference && (
        <div className="rounded-2xl border-2 border-primary/30 bg-primary-50/40 p-6">
          <h2 className="text-lg font-extrabold text-ink">أكمِل الدفع عبر كليك (CliQ)</h2>
          <p className="mt-1 text-sm text-ink-soft">
            حوّل من تطبيق بنكك إلى الاسم المستعار التالي، واذكر الرقم المرجعي في خانة الملاحظات:
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <InvoiceCell k="الاسم المستعار (CliQ)" v={CLIQ_ALIAS} />
            <InvoiceCell k="المبلغ" v={plan ? `${plan.monthlyJod} د.أ` : "—"} />
            <InvoiceCell k="الرقم المرجعي" v={sub.cliq_reference} />
          </div>
          <p className="mt-4 text-xs text-ink-muted">سنفعّل اشتراكك خلال ساعات من تأكيد الحوالة.</p>
        </div>
      )}

      {/* Plan selector */}
      <div>
        <h2 className="text-xl font-extrabold text-ink">
          {status === "active" ? "غيّر خطتك" : "اختر خطتك"}
        </h2>
        <PricingCards currentTier={tier} isActive={status === "active"} />
      </div>

      <p className="text-center text-sm text-ink-muted">
        الدفع عبر <span className="font-semibold text-ink-soft">كليك (CliQ)</span> فقط — لا بطاقات في النسخة الحالية.
      </p>
    </section>
  );
}

function InvoiceCell({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-white p-4 text-center shadow-card">
      <p className="text-xs text-ink-muted">{k}</p>
      <p className="mt-1 font-mono text-base font-bold text-ink" dir="ltr">{v}</p>
    </div>
  );
}
