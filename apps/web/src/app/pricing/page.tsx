import { PricingCards } from "@/components/PricingCards";
import { getCurrentOrgId, getSubscription, isConfigured } from "@/lib/repo";

export const dynamic = "force-dynamic";

const CLIQ_ALIAS = process.env.CLIQ_ALIAS || "MUNAQQIB";

// Feature comparison (Screen 2 §3). "—" = not included.
const COMPARE: { label: string; radar: string; pro: string; intel: string }[] = [
  { label: "إيميل صباحي بالعطاءات المطابقة", radar: "✓", pro: "✓", intel: "✓" },
  { label: "تنبيهات المواعيد النهائية", radar: "✓", pro: "✓", intel: "✓" },
  { label: "لوحة تحكّم الفرص", radar: "✓", pro: "✓", intel: "✓" },
  { label: "تحليل الكرّاسة بالذكاء الاصطناعي", radar: "—", pro: "١٠ شهرياً", intel: "بلا حدود" },
  { label: "فحص الأهلية والكفالات والمخاطر", radar: "—", pro: "✓", intel: "✓" },
  { label: "متابعة العطاءات حتى القرار", radar: "—", pro: "✓", intel: "✓" },
  { label: "أسعار الإحالات التاريخية", radar: "—", pro: "—", intel: "✓" },
  { label: "تحليل المنافسين ومن يفوز", radar: "—", pro: "—", intel: "✓" },
  { label: "عدد المستخدمين", radar: "١", pro: "٣", intel: "١٠" },
  { label: "تصدير CSV", radar: "—", pro: "✓", intel: "✓" },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "كيف أدفع؟",
    a: "عبر كليك (CliQ) — حوالة بسيطة من تطبيق بنكك إلى اسمنا المستعار، ونفعّل اشتراكك خلال ساعات. لا حاجة لبطاقة ائتمان.",
  },
  {
    q: "ما الذي يفعله تحليل الكرّاسة؟",
    a: "ترفع ملف وثائق العطاء (PDF) فيقرأه محلّلنا ويلخّص لك: هل أنت مؤهّل؟ ما الكفالات المطلوبة؟ المواعيد والمخاطر — مع الإشارة إلى صفحة كل معلومة.",
  },
  {
    q: "من أين تأتي العطاءات؟",
    a: "نراقب المصادر الرسمية: دائرة العطاءات الحكومية (GTD) والمنظومة الإلكترونية للشراء (JONEPS)، والمزيد قريباً.",
  },
  {
    q: "هل يمكنني تغيير خطتي أو إلغاؤها؟",
    a: "نعم، في أي وقت من صفحة الفوترة. الترقية فورية، والإلغاء يوقف التجديد دون رسوم.",
  },
];

export default async function PricingPage() {
  const orgId = isConfigured() ? await getCurrentOrgId() : null;
  const sub = orgId ? await getSubscription(orgId) : null;
  const pending = sub?.status === "pending_payment" ? sub : null;

  return (
    <section className="animate-fade-in space-y-16">
      <div className="text-center">
        <p className="eyebrow">الخطط والأسعار</p>
        <h1 className="mt-3 text-3xl font-extrabold text-ink sm:text-4xl">
          خطط بسيطة، <span className="text-gradient">قيمة واضحة</span>
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-ink-soft">
          ابدأ بتجربة مجانية ١٤ يوماً بدون بطاقة، ثم اختر الخطة المناسبة لحجم شركتك.
        </p>
      </div>

      {pending && (
        <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">طلب الترقية قيد المعالجة.</p>
          <p className="mt-1">
            حوّل قيمة الاشتراك عبر <span className="font-semibold">كليك (CliQ)</span> إلى الاسم
            المستعار <span className="font-mono" dir="ltr">{CLIQ_ALIAS}</span> مع ذكر الرقم المرجعي:
          </p>
          <p className="mt-2 rounded-lg bg-white px-3 py-2 font-mono text-base text-ink" dir="ltr">
            {pending.cliq_reference}
          </p>
          <p className="mt-2 text-xs">سيُفعّل اشتراكك خلال ساعات من تأكيد الدفع.</p>
        </div>
      )}

      <PricingCards currentTier={sub?.tier ?? null} isActive={sub?.status === "active"} />

      {/* Comparison */}
      <div className="overflow-x-auto rounded-3xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b border-line bg-sand/40 text-ink">
              <th className="p-4 text-start font-bold">المقارنة</th>
              <th className="p-4 text-center font-bold">رادار</th>
              <th className="p-4 text-center font-bold text-primary-700">برو</th>
              <th className="p-4 text-center font-bold">إنتليجنس</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {COMPARE.map((r) => (
              <tr key={r.label}>
                <td className="p-4 text-start text-ink-soft">{r.label}</td>
                <Cell v={r.radar} />
                <Cell v={r.pro} highlight />
                <Cell v={r.intel} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-sm text-ink-muted">
        الدفع عبر <span className="font-semibold text-ink-soft">كليك (CliQ)</span> — حوالة بسيطة، نفعّل خلال ساعات.
      </p>

      {/* FAQ */}
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-2xl font-extrabold text-ink">أسئلة شائعة</h2>
        <div className="mt-6 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-line bg-white p-5 shadow-card">
              <summary className="flex cursor-pointer items-center justify-between font-bold text-ink">
                {f.q}
                <span className="text-primary-600 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cell({ v, highlight }: { v: string; highlight?: boolean }) {
  const isNo = v === "—";
  return (
    <td className={`p-4 text-center ${highlight ? "bg-primary-50/40" : ""}`}>
      {v === "✓" ? (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700">
          ✓
        </span>
      ) : (
        <span className={`text-sm ${isNo ? "text-ink-muted/50" : "font-semibold text-ink"}`} dir="auto">
          {v}
        </span>
      )}
    </td>
  );
}
