import { t } from "@/lib/strings";

const features = [
  {
    icon: "🎯",
    title: "مطابقة ذكية",
    body: "نطابق كل عطاء مع تصنيف منشأتك ومجال عملك بالذكاء الاصطناعي — لا ضجيج، فقط ما يخصّك.",
  },
  {
    icon: "✉️",
    title: "ملخّص صباحي واحد",
    body: "كل صباح الساعة 7:30، إيميل عربي نظيف بالعطاءات المطابقة فقط. بدون فتح عشرة مواقع.",
  },
  {
    icon: "📄",
    title: "تحليل الكرّاسة",
    body: "تحليل ذكي لكرّاسة العطاء: الأهلية، الكفالات، المواعيد، والمخاطر — قرار أسرع وأدق.",
  },
  {
    icon: "⏰",
    title: "تنبيهات المواعيد",
    body: "تنبيهات فورية على تيليجرام قبل إغلاق العطاءات المهمّة. لا يفوتك موعد.",
  },
];

const stats = [
  { value: "+5", label: "قطاعات نغطّيها" },
  { value: "7:30ص", label: "ملخّصك اليومي" },
  { value: "<1 د.أ", label: "تكلفة تحليل الكرّاسة" },
  { value: "يوميّاً", label: "تحديث العطاءات" },
];

const sources = ["دائرة العطاءات الحكومية (GTD)", "المنظومة الإلكترونية للشراء (JONEPS)"];

export default function Home() {
  return (
    <div className="space-y-24">
      {/* Hero */}
      <section className="relative animate-fade-up overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 px-6 py-20 text-center text-white shadow-card-hover">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(36rem 24rem at 80% -10%, rgba(94,234,212,.35), transparent 60%), radial-gradient(30rem 24rem at 0% 110%, rgba(13,148,136,.5), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium ring-1 ring-white/20">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-300" />
            عطاءات الأردن · مدعوم بالذكاء الاصطناعي
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.15] sm:text-5xl">
            كل عطاء يناسب تصنيفك،
            <br />
            <span className="bg-gradient-to-l from-brand-200 to-white bg-clip-text text-transparent">
              بإيميل واحد نظيف كل صباح
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-teal-50/90">
            {t.brand} يجد ويطابق ويحلّل العطاءات الحكومية للمقاولين والموردين والمكاتب
            الهندسية في الأردن — مع التحليل والأسعار اللي ما حدا غيرنا بيعطيك ياها.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="/dashboard"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-brand-800 shadow-sm transition hover:bg-teal-50 active:scale-[0.98]"
            >
              شاهد العطاءات المطابقة ←
            </a>
            <a
              href="/pricing"
              className="rounded-xl border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              الأسعار والخطط
            </a>
          </div>
          <p className="mt-4 text-sm text-teal-100/80">تجربة مجانية 14 يوماً · بدون بطاقة</p>
        </div>
      </section>

      {/* Stats band */}
      <section className="-mt-12">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-200/70 shadow-card sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white px-4 py-6 text-center">
              <div className="text-2xl font-extrabold text-brand">{s.value}</div>
              <div className="mt-1 text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            نفس البريد، أذكى بعشر مرّات
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-500">
            كل ما تحتاجه لتلتقط العطاء المناسب في وقته — في مكان واحد.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group card p-6 transition duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-card-hover"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl transition group-hover:scale-110">
                {f.icon}
              </div>
              <h3 className="mt-4 font-bold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sources / coverage */}
      <section className="card px-6 py-12 text-center">
        <h2 className="text-xl font-bold text-slate-900">نغطّي كل القطاعات والمصادر</h2>
        <p className="mt-2 text-slate-600">أشغال · لوازم · خدمات · أدوية · استشارات — ونزيد.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {sources.map((s) => (
            <span
              key={s}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700"
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="overflow-hidden rounded-[2rem] bg-slate-900 px-6 py-14 text-center text-white">
        <h2 className="text-2xl font-bold sm:text-3xl">جاهز تشوف عطاءاتك؟</h2>
        <p className="mt-2 text-slate-300">ابدأ بتجربة مجانية وشوف المطابقة بنفسك.</p>
        <a
          href="/dashboard"
          className="mt-7 inline-block rounded-xl bg-brand px-7 py-3 font-semibold text-white transition hover:bg-brand-dark active:scale-[0.98]"
        >
          افتح اللوحة الآن ←
        </a>
      </section>
    </div>
  );
}
