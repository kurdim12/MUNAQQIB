import { OpportunityRow } from "@/components/OpportunityRow";
import { Paywall } from "@/components/Paywall";
import { TrialBanner } from "@/components/TrialBanner";
import { can, hasAccess } from "@/lib/entitlements";
import { deadlineLabel, scorePct } from "@/lib/format";
import { opportunityQuality } from "@/lib/quality";
import {
  getCurrentOrgId,
  getMatchedTenders,
  getSubscription,
  isConfigured,
  type MatchedTender,
} from "@/lib/repo";

export const dynamic = "force-dynamic";

function ammanGreeting(): { hi: string; date: string } {
  const hour = (new Date().getUTCHours() + 3) % 24; // Jordan = UTC+3
  const hi = hour >= 5 && hour < 12 ? "صباح الخير" : hour < 18 ? "طاب يومك" : "مساء الخير";
  const date = new Intl.DateTimeFormat("ar", {
    timeZone: "Asia/Amman",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return { hi, date };
}

export default async function CommandCenter({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; cat?: string }>;
}) {
  const { view, cat } = await searchParams;
  const savedOnly = view === "saved";

  const configured = isConfigured();
  const orgId = configured ? await getCurrentOrgId() : null;
  const sub = orgId ? await getSubscription(orgId) : null;

  const access = !configured || hasAccess(sub);
  const canSaved = !configured || can(sub, "saved");
  const showList = access && (!savedOnly || canSaved);

  const raw = orgId && showList ? await getMatchedTenders(orgId, { savedOnly }) : [];
  // Layer 6: rank the feed by opportunity quality (highest opportunity first).
  const all = [...raw].sort(
    (a, b) => opportunityQuality(b).value - opportunityQuality(a).value,
  );
  const categories = Array.from(new Set(all.map((x) => x.category).filter(Boolean))) as string[];
  const tenders = cat ? all.filter((x) => x.category === cat) : all;
  const base = savedOnly ? "/dashboard?view=saved" : "/dashboard";

  const { hi, date } = ammanGreeting();
  const now = Date.now();
  const soon = all.filter((x) => {
    const d = x.closing_at ? (new Date(x.closing_at).getTime() - now) / 86_400_000 : 99;
    return d >= 0 && d <= 7;
  });
  const highQuality = all.filter((x) => opportunityQuality(x).tier === "high").length;
  const top = all.reduce((m, x) => Math.max(m, x.score), 0);
  const deadlines = [...all]
    .filter((x) => x.closing_at && new Date(x.closing_at).getTime() >= now)
    .sort((a, b) => new Date(a.closing_at!).getTime() - new Date(b.closing_at!).getTime())
    .slice(0, 5);

  return (
    <section className="animate-fade-in">
      <TrialBanner sub={sub} />

      {!configured && (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          قاعدة البيانات غير مهيّأة في هذه البيئة — هذه واجهة فارغة للعرض فقط.
        </p>
      )}

      {!access ? (
        <Paywall />
      ) : (
        <>
          {/* Morning Briefing */}
          <header className="mb-8">
            <p className="eyebrow">إحاطة الصباح · {date}</p>
            <h1 className="mt-2 font-serif text-3xl font-bold text-ink sm:text-4xl">{hi}</h1>
            <p className="mt-1.5 text-ink-soft">
              {all.length > 0
                ? `رصدنا لك ${all.length} فرصة مطابقة في السوق. إليك ما يستحقّ انتباهك اليوم.`
                : "ما زلنا نراقب السوق نيابة عنك — لا فرص جديدة بعد اليوم."}
            </p>

            {all.length > 0 && (
              <div className="mt-6 grid grid-cols-2 divide-line overflow-hidden rounded-xl border border-line bg-white sm:grid-cols-4 sm:divide-x sm:divide-x-reverse">
                <Metric label="فرص مطابقة" value={String(all.length)} />
                <Metric label="فرص عالية الجودة" value={String(highQuality)} accent="green" />
                <Metric label="مواعيد خلال الأسبوع" value={String(soon.length)} accent="amber" />
                <Metric label="أعلى نسبة مطابقة" value={scorePct(top)} />
              </div>
            )}
          </header>

          <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
            {/* Priority opportunities */}
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="eyebrow">الفرص ذات الأولوية</h2>
                <div className="flex gap-1 rounded-lg border border-line bg-white p-0.5 text-sm">
                  <Tab href="/dashboard" active={!savedOnly} label="الكل" />
                  {canSaved && <Tab href="/dashboard?view=saved" active={savedOnly} label="★ المتابعة" />}
                </div>
              </div>

              {categories.length > 1 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  <Chip href={base} active={!cat} label="كل القطاعات" />
                  {categories.map((c) => (
                    <Chip
                      key={c}
                      href={`${base}${savedOnly ? "&" : "?"}cat=${encodeURIComponent(c)}`}
                      active={cat === c}
                      label={c}
                    />
                  ))}
                </div>
              )}

              {savedOnly && !canSaved ? (
                <Paywall
                  title="المتابعة ضمن باقة برو"
                  body="رقِّ اشتراكك إلى باقة برو لمتابعة الفرص وحفظها في قائمتك."
                />
              ) : tenders.length === 0 ? (
                <EmptyState savedOnly={savedOnly} />
              ) : (
                <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
                  {tenders.map((t) => (
                    <OpportunityRow key={t.tender_id} tender={t} canSave={canSaved} />
                  ))}
                </div>
              )}
            </div>

            {/* Right rail */}
            <aside className="space-y-6">
              <DeadlinesRail deadlines={deadlines} />
              <SignalsRail count={all.length} />
            </aside>
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: "green" | "amber" }) {
  const color = accent === "green" ? "text-green-700" : accent === "amber" ? "text-amber-700" : "text-ink";
  return (
    <div className="px-4 py-5">
      <div className={`nums text-3xl font-bold ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-ink-muted">{label}</div>
    </div>
  );
}

function DeadlinesRail({ deadlines }: { deadlines: MatchedTender[] }) {
  return (
    <div className="panel p-4">
      <h3 className="eyebrow mb-3">مواعيد قادمة</h3>
      {deadlines.length === 0 ? (
        <p className="text-sm text-ink-muted">لا مواعيد قريبة.</p>
      ) : (
        <ul className="space-y-3">
          {deadlines.map((d) => (
            <li key={d.tender_id}>
              <a href={`/tenders/${d.tender_id}`} className="block hover:opacity-80">
                <p className="truncate text-sm font-medium text-ink">{d.title}</p>
                <p className="mt-0.5 text-xs text-amber-700">⏱ {deadlineLabel(d.closing_at)}</p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SignalsRail({ count }: { count: number }) {
  return (
    <div className="panel p-4">
      <h3 className="eyebrow mb-3">إشارات السوق</h3>
      <dl className="space-y-2.5 text-sm">
        <Signal k="المصادر المراقَبة" v="GTD · JONEPS" />
        <Signal k="فرص اليوم" v={String(count)} />
        <Signal k="آخر تحديث" v="اليوم 7:30 ص" />
        <Signal k="مستوى الثقة" v="مرتفع" tone="green" />
      </dl>
    </div>
  );
}
function Signal({ k, v, tone }: { k: string; v: string; tone?: "green" }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-muted">{k}</dt>
      <dd className={`font-medium ${tone === "green" ? "text-green-700" : "text-ink"}`}>{v}</dd>
    </div>
  );
}

function EmptyState({ savedOnly }: { savedOnly: boolean }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-16 text-center">
      <div className="text-3xl">{savedOnly ? "★" : "🛰️"}</div>
      <p className="mt-3 font-medium text-ink">
        {savedOnly ? "لا فرص في قائمة المتابعة بعد." : "لا فرص جديدة اليوم."}
      </p>
      <p className="mt-1 text-sm text-ink-muted">ما زلنا نراقب السوق نيابة عنك.</p>
      {savedOnly && (
        <a href="/dashboard" className="mt-3 text-sm font-medium text-ink underline">
          تصفّح كل الفرص ←
        </a>
      )}
    </div>
  );
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <a
      href={href}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        active ? "bg-ink text-paper" : "border border-line bg-white text-ink-soft hover:border-ink/30"
      }`}
    >
      {label}
    </a>
  );
}

function Tab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <a
      href={href}
      className={`rounded-md px-3 py-1.5 transition ${
        active ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
      }`}
    >
      {label}
    </a>
  );
}
