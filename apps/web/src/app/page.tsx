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

const sources = ["دائرة العطاءات الحكومية (GTD)", "المنظومة الإلكترونية للشراء (JONEPS)"];

export default function Home() {
  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-dark px-6 py-20 text-center text-white shadow-xl">
        <div className="mx-auto max-w-3xl">
          <span className="inline-block rounded-full bg-white/15 px-4 py-1 text-sm font-medium">
            عطاءات الأردن · مدعوم بالذكاء الاصطناعي
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight sm:text-5xl">
            كل عطاء يناسب تصنيفك،
            <br />
            بإيميل واحد نظيف كل صباح
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-teal-50">
            {t.brand} يجد ويطابق ويحلّل العطاءات الحكومية للمقاولين والموردين والمكاتب
            الهندسية في الأردن — مع التحليل والأسعار اللي ما حدا غيرنا بيعطيك ياها.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="/dashboard"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-brand shadow-sm transition hover:bg-teal-50"
            >
              شاهد العطاءات المطابقة ←
            </a>
            <a
              href="/pricing"
              className="rounded-xl border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              الأسعار والخطط
            </a>
          </div>
          <p className="mt-4 text-sm text-teal-100">تجربة مجانية 14 يوماً · بدون بطاقة</p>
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-center text-2xl font-bold text-slate-900">
          نفس البريد، أذكى بعشر مرّات
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-brand/40 hover:shadow-md"
            >
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-3 font-bold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sources / coverage */}
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
        <h2 className="text-xl font-bold text-slate-900">نغطّي كل القطاعات والمصادر</h2>
        <p className="mt-2 text-slate-600">أشغال · لوازم · خدمات · أدوية · استشارات — ونزيد.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
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
      <section className="rounded-2xl bg-slate-900 px-6 py-12 text-center text-white">
        <h2 className="text-2xl font-bold">جاهز تشوف عطاءاتك؟</h2>
        <p className="mt-2 text-slate-300">ابدأ بتجربة مجانية وشوف المطابقة بنفسك.</p>
        <a
          href="/dashboard"
          className="mt-6 inline-block rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark"
        >
          افتح اللوحة الآن ←
        </a>
      </section>
    </div>
  );
}
