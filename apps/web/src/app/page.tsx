import { t } from "@/lib/strings";

const steps = [
  {
    icon: "🛰️",
    k: "نراقب",
    title: "على مدار الساعة",
    body: "نرصد عطاءات دائرة العطاءات الحكومية (GTD) والمنظومة الإلكترونية (JONEPS) من مصادرها الرسمية، أولاً بأول.",
  },
  {
    icon: "🎯",
    k: "نطابق",
    title: "مع شركتك أنت",
    body: "نطابق كل عطاء مع تصنيف شركتك ومجال عملك وكلماتك المفتاحية — ونعطيك نسبة وسبباً واضحاً، لا تخمين.",
  },
  {
    icon: "📬",
    k: "نوصّل",
    title: "بإيميل واحد",
    body: "إيميل صباحي واحد بالعطاءات التي تخصّك فقط، مع رابط المصدر الرسمي وتحليل الكرّاسة عند الطلب.",
  },
];

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
      <section className="relative isolate overflow-hidden rounded-3xl bg-hero-glow px-6 pt-14 pb-16 text-center sm:pt-20 sm:pb-20">
        <span className="chip mx-auto border-primary-200 bg-primary-50 text-primary-700">
          🇯🇴 منصّة ذكاء العطاءات · الأردن
        </span>
        <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-[1.15] text-ink sm:text-6xl">
          محلّلك الخاص للعطاءات،
          <br />
          <span className="text-gradient">يرصد فرصك قبل منافسيك</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft sm:text-xl">
          {t.brand} يراقب العطاءات الحكومية على مدار الساعة، يطابقها مع نشاط شركتك،
          ويحلّل كرّاساتها — لتعرف ما يستحقّ وقتك، وتربح بتوقيت أفضل.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <a href="/register" className="btn-primary text-base">ابدأ تجربتك المجانية ←</a>
          <a href="/dashboard" className="btn-outline text-base">شاهد لوحة التحكّم</a>
        </div>
        <p className="mt-5 text-sm text-ink-muted">تجربة مجانية 14 يوماً · بدون بطاقة ائتمان</p>
      </section>

      {/* How it works */}
      <section>
        <div className="text-center">
          <p className="eyebrow">كيف يعمل</p>
          <h2 className="mt-3 text-3xl font-extrabold text-ink sm:text-4xl">ثلاث خطوات، صفر جهد منك</h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.k}
              className="group relative rounded-3xl border border-line bg-white p-7 shadow-card transition hover:-translate-y-1 hover:shadow-card-hover"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-2xl">
                {s.icon}
              </div>
              <div className="absolute end-7 top-7 text-5xl font-black text-primary-100">
                {i + 1}
              </div>
              <h3 className="mt-5 text-xl font-bold text-ink">
                {s.k} <span className="text-primary-700">{s.title}</span>
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Outcomes */}
      <section>
        <div className="text-center">
          <p className="eyebrow">ماذا تكسب فعلاً</p>
          <h2 className="mt-3 text-3xl font-extrabold text-ink sm:text-4xl">
            لا تشتري عطاءات — تشتري <span className="text-gradient">قرارات أفضل</span>
          </h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {outcomes.map((o) => (
            <div
              key={o.title}
              className="rounded-3xl border border-line bg-white p-8 shadow-card transition hover:shadow-card-hover"
            >
              <p className="eyebrow">{o.k}</p>
              <h3 className="mt-2 text-xl font-bold text-ink">{o.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{o.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Coverage */}
      <section className="rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-card">
        <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">نراقب السوق نيابةً عنك</h2>
        <p className="mt-3 text-ink-soft">أشغال · لوازم · خدمات · أدوية · استشارات — عبر مصادر العطاءات الرسمية.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <span className="rounded-xl border border-primary-200 bg-primary-50 px-5 py-2.5 font-semibold text-primary-800">
            دائرة العطاءات الحكومية (GTD)
          </span>
          <span className="rounded-xl border border-primary-200 bg-primary-50 px-5 py-2.5 font-semibold text-primary-800">
            المنظومة الإلكترونية للشراء (JONEPS)
          </span>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden rounded-3xl bg-primary-gradient px-6 py-16 text-center text-white shadow-glow">
        <h2 className="text-3xl font-extrabold sm:text-4xl">ابدأ برؤية فرصك اليوم</h2>
        <p className="mx-auto mt-3 max-w-xl text-lg text-white/85">
          كأنّ لديك محلّل سوق مخصّص — يعمل لصالحك على مدار الساعة.
        </p>
        <a
          href="/register"
          className="mt-8 inline-block rounded-xl bg-white px-8 py-3.5 text-base font-bold text-primary-700 shadow-lg transition hover:scale-[1.02] active:scale-100"
        >
          أنشئ حساب شركتك مجاناً ←
        </a>
      </section>
    </div>
  );
}
