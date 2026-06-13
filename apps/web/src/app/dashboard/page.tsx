import { OpportunityRow } from "@/components/OpportunityRow";
import { Paywall } from "@/components/Paywall";
import { TrialBanner } from "@/components/TrialBanner";
import { can, hasAccess } from "@/lib/entitlements";
import { deadlineLabel } from "@/lib/format";
import { buildAffinity, personalizeValue, preferredCategories } from "@/lib/learning";
import { opportunityQuality } from "@/lib/quality";
import {
  getCategoryAffinity,
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
  // Layer 13: learn category affinity from save/dismiss behavior, then
  // Layer 6: rank the feed by opportunity quality personalized to the user.
  const affinity = orgId && showList ? buildAffinity(await getCategoryAffinity(orgId)) : {};
  const preferred = preferredCategories(affinity);
  const rankValue = (t: MatchedTender) =>
    personalizeValue(opportunityQuality(t).value, t.category, affinity);
  const all = [...raw].sort((a, b) => rankValue(b) - rankValue(a));
  const categories = Array.from(new Set(all.map((x) => x.category).filter(Boolean))) as string[];
  const tenders = cat ? all.filter((x) => x.category === cat) : all;
  const base = savedOnly ? "/dashboard?view=saved" : "/dashboard";

  const { hi, date } = ammanGreeting();
  const now = Date.now();
  // "Worth your decision today" = high-quality opportunities (L6 tier).
  const decisionWorthy = all.filter((x) => opportunityQuality(x).tier === "high").length;
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
            <p className="mt-1.5 text-lg text-ink-soft">
              {all.length === 0
                ? "ما زلنا نراقب السوق نيابة عنك — لا فرص مطابقة بعد."
                : decisionWorthy > 0
                  ? `رصدنا لك ${all.length} فرصة مطابقة، منها ${decisionWorthy} تستحقّ قرارك اليوم.`
                  : `رصدنا لك ${all.length} فرصة مطابقة — لا شيء عاجل اليوم.`}
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
            {/* Priority opportunities */}
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="eyebrow">الفرص ذات الأولوية</h2>
                <div className="flex gap-1 rounded-lg border border-line bg-white p-0.5 text-sm">
                  <Tab href="/dashboard" active={!savedOnly} label="الكل" />
                  {canSaved && <Tab href="/watchlist" active={false} label="★ المتابعة" />}
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
              {preferred.length > 0 && <LearningPanel preferred={preferred} />}
              <DeadlinesRail deadlines={deadlines} />
              <SignalsRail count={all.length} />
            </aside>
          </div>
        </>
      )}
    </section>
  );
}

function LearningPanel({ preferred }: { preferred: string[] }) {
  return (
    <div className="rounded-xl border border-line bg-ink p-4 text-paper">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
        ما تعلّمه النظام عنك
      </h3>
      <p className="mt-2 text-sm text-stone-300">
        من حفظك وتجاهلك للفرص، نرفع ترتيب ما يشبه اهتماماتك:
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {preferred.slice(0, 4).map((c) => (
          <span key={c} className="rounded-md bg-white/10 px-2.5 py-1 text-xs text-stone-100">
            {c}
          </span>
        ))}
      </div>
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
        <Signal k="فرص مطابقة" v={String(count)} />
      </dl>
    </div>
  );
}
function Signal({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-muted">{k}</dt>
      <dd className="font-medium text-ink">{v}</dd>
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
