import { Paywall } from "@/components/Paywall";
import { can, hasAccess } from "@/lib/entitlements";
import {
  getCurrentOrgId,
  getMatchedTenders,
  getSubscription,
  isConfigured,
} from "@/lib/repo";

export const dynamic = "force-dynamic";

function rank<T extends string>(items: (T | null)[]): { key: T; n: number }[] {
  const m = new Map<T, number>();
  for (const it of items) if (it) m.set(it, (m.get(it) ?? 0) + 1);
  return [...m.entries()]
    .map(([key, n]) => ({ key, n }))
    .sort((a, b) => b.n - a.n);
}

export default async function MarketIntelligence() {
  const configured = isConfigured();
  const orgId = configured ? await getCurrentOrgId() : null;
  const sub = orgId ? await getSubscription(orgId) : null;
  const access = !configured || hasAccess(sub);
  const premium = can(sub, "pricing_intel"); // award prices/competitors = intelligence tier

  const all = orgId && access ? await getMatchedTenders(orgId, {}) : [];
  const buyers = rank(all.map((x) => x.entity)).slice(0, 6);
  const cats = rank(all.map((x) => x.category));
  const maxBuyer = buyers[0]?.n ?? 1;

  return (
    <section className="animate-fade-in">
      <div className="overflow-hidden rounded-2xl border border-ink/80 bg-ink text-paper">
        {/* header */}
        <div className="border-b border-white/10 px-6 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
            ذكاء السوق · محطّة المعلومات
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold">ما لا يراه منافسوك</h1>
          <p className="mt-1.5 text-sm text-stone-300">
            خلاصة نشاط السوق المبنية على العطاءات التي تخصّ نشاطك.
          </p>
        </div>

        {!access ? (
          <div className="p-6">
            <Paywall />
          </div>
        ) : (
          <div className="grid gap-px bg-white/10 md:grid-cols-2">
            {/* Top buyers */}
            <div className="bg-ink p-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                أبرز الجهات المشترية
              </h2>
              <ul className="mt-4 space-y-3">
                {buyers.length === 0 && <li className="text-sm text-stone-400">لا بيانات بعد.</li>}
                {buyers.map((b) => (
                  <li key={b.key}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate text-stone-100">{b.key}</span>
                      <span className="nums text-stone-400">{b.n}</span>
                    </div>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/10">
                      <span
                        className="block h-full rounded-full bg-green-500"
                        style={{ width: `${Math.round((b.n / maxBuyer) * 100)}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Category mix */}
            <div className="bg-ink p-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                توزيع القطاعات
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {cats.map((c) => (
                  <span
                    key={c.key}
                    className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-stone-100"
                  >
                    {c.key} <span className="nums text-stone-400">· {c.n}</span>
                  </span>
                ))}
              </div>
              <dl className="mt-6 space-y-2 text-sm">
                <Row k="إجمالي الفرص المرصودة" v={String(all.length)} />
                <Row k="الجهات النشطة" v={String(buyers.length)} />
                <Row k="القطاعات" v={String(cats.length)} />
              </dl>
            </div>

            {/* Premium: award prices + competitors */}
            <div className="relative bg-ink p-6 md:col-span-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                أسعار الإحالات وذكاء المنافسين
              </h2>
              {premium ? (
                <p className="mt-3 text-sm text-stone-300">
                  بيانات الإحالات التاريخية وتحليل المنافسين قيد التجهيز لمنشأتك (المرحلة 2).
                </p>
              ) : (
                <div className="relative mt-4">
                  <div className="pointer-events-none select-none space-y-2 blur-sm">
                    {["شركة الإنشاءات المتحدة — 1.2M د.أ", "مجموعة البناء الوطنية — 880K د.أ", "متوسط سعر الإحالة — 740K د.أ"].map(
                      (x) => (
                        <div key={x} className="flex items-center justify-between rounded-md bg-white/5 px-4 py-2 text-sm text-stone-200">
                          <span>{x}</span>
                          <span className="nums text-stone-400">▮▮▮</span>
                        </div>
                      ),
                    )}
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl">🔒</span>
                    <p className="mt-2 text-sm font-medium text-stone-100">
                      أسعار الإحالات وتحليل المنافسين ضمن باقة إنتليجنس
                    </p>
                    <a
                      href="/pricing"
                      className="mt-3 rounded-lg bg-paper px-4 py-2 text-sm font-semibold text-ink transition hover:bg-sand"
                    >
                      الترقية لكشف البيانات
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-2">
      <dt className="text-stone-400">{k}</dt>
      <dd className="nums font-medium text-stone-100">{v}</dd>
    </div>
  );
}
