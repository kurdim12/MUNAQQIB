import { t } from "@/lib/strings";

const outcomes = [
  {
    k: "قبل أن تقرأ صفحة واحدة",
    title: "اعرف إن كنت مؤهّلاً",
    body: "نقرأ الكرّاسة عنك ونحكم على أهليتك — قبل أن تضيّع ساعات على عطاء لا يناسبك.",
  },
  {
    k: "قبل منافسيك",
    title: "اكتشف المخاطر مبكراً",
    body: "كفالات، مهل قصيرة، شروط خفية — نرفع لك الأعلام الحمراء قبل أن تتفاجأ بها.",
  },
  {
    k: "كل صباح 7:30",
    title: "إحاطة جاهزة بانتظارك",
    body: "ملخّص واحد بالفرص التي تخصّك فقط — كأنّ محلّلاً عمل طوال الليل نيابةً عنك.",
  },
  {
    k: "لا يفوتك موعد",
    title: "توقيت أفضل، قرار أفضل",
    body: "تنبيهات للمواعيد الخطرة، وأولوية واضحة لما يستحقّ تحرّكك الآن.",
  },
];

export default function Home() {
  return (
    <div className="space-y-24">
      {/* Hero */}
      <section className="animate-fade-up pt-6 text-center">
        <p className="eyebrow">منصّة ذكاء الفرص · عطاءات الأردن</p>
        <h1 className="mx-auto mt-4 max-w-3xl font-serif text-4xl font-bold leading-[1.2] text-ink sm:text-6xl">
          محلّلك الخاص للسوق،
          <br />
          يرصد الفرص قبل منافسيك
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
          {t.brand} يراقب العطاءات الحكومية على مدار الساعة، يطابقها مع نشاطك، ويحلّل كرّاساتها
          — لتعرف ما يستحقّ وقتك، وتربح بتوقيت أفضل.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <a href="/dashboard" className="btn-ink">افتح مركز القيادة ←</a>
          <a href="/pricing" className="btn-outline">الأسعار والخطط</a>
        </div>
        <p className="mt-4 text-sm text-ink-muted">تجربة مجانية 14 يوماً · بدون بطاقة</p>
      </section>

      {/* Briefing strip */}
      <section className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-line bg-white">
        <div className="border-b border-line bg-sand/40 px-5 py-3">
          <p className="eyebrow">نموذج إحاطة الصباح</p>
        </div>
        <div className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x sm:divide-x-reverse">
          {[
            { v: "17", l: "فرصة جديدة اليوم" },
            { v: "4", l: "مطابقات عالية الثقة" },
            { v: "3", l: "مواعيد هذا الأسبوع" },
            { v: "94%", l: "أعلى نسبة مطابقة" },
          ].map((s) => (
            <div key={s.l} className="px-4 py-6 text-center">
              <div className="nums text-3xl font-bold text-ink">{s.v}</div>
              <div className="mt-1 text-xs text-ink-muted">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Outcomes — not features */}
      <section>
        <div className="text-center">
          <p className="eyebrow">ماذا تكسب فعلاً</p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-ink">
            لا تشتري عطاءات — تشتري قرارات أفضل
          </h2>
        </div>
        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
          {outcomes.map((o) => (
            <div key={o.title} className="bg-white p-7">
              <p className="eyebrow">{o.k}</p>
              <h3 className="mt-2 font-serif text-xl font-bold text-ink">{o.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{o.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Coverage */}
      <section className="rounded-xl border border-line bg-white px-6 py-12 text-center">
        <h2 className="font-serif text-2xl font-bold text-ink">نراقب السوق نيابةً عنك</h2>
        <p className="mt-2 text-ink-soft">أشغال · لوازم · خدمات · أدوية · استشارات — عبر مصادر العطاءات الرسمية.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
          <span className="rounded-md border border-line bg-sand/50 px-4 py-2 font-medium text-ink-soft">
            دائرة العطاءات الحكومية (GTD)
          </span>
          <span className="rounded-md border border-line bg-sand/50 px-4 py-2 font-medium text-ink-soft">
            المنظومة الإلكترونية للشراء (JONEPS)
          </span>
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-2xl bg-ink px-6 py-16 text-center text-paper">
        <h2 className="font-serif text-3xl font-bold">ابدأ برؤية فرصك اليوم</h2>
        <p className="mt-3 text-stone-300">كأنّ لديك محلّل سوق مخصّص — يعمل لصالحك.</p>
        <a
          href="/dashboard"
          className="mt-7 inline-block rounded-lg bg-paper px-7 py-3 font-semibold text-ink transition hover:bg-sand active:scale-[0.99]"
        >
          افتح مركز القيادة ←
        </a>
      </section>
    </div>
  );
}
