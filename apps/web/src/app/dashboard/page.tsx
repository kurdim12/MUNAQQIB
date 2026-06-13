import { Paywall } from "@/components/Paywall";
import { TrialBanner } from "@/components/TrialBanner";
import { can, hasAccess } from "@/lib/entitlements";
import { deadlineLabel, scorePct } from "@/lib/format";
import { buildAffinity, personalizeValue, preferredCategories } from "@/lib/learning";
import { OPP_STAGE_GROUP } from "@/lib/opportunity";
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

/** Days until a deadline; null/missing sorts last. */
function daysOrInf(closing: string | null): number {
  if (!closing) return 99_999;
  return Math.ceil((new Date(closing).getTime() - Date.now()) / 86_400_000);
}

// Lifecycle buckets for the pipeline (Tier 3), in display order.
const STAGE_ORDER = ["new", "review", "decision", "tracking", "closed"] as const;
const STAGE_LABEL: Record<(typeof STAGE_ORDER)[number], string> = {
  new: "جديدة",
  review: "قيد المراجعة",
  decision: "بانتظار قرار التقديم",
  tracking: "قيد المتابعة",
  closed: "مغلقة",
};

export default async function CommandCenter() {
  const configured = isConfigured();
  const orgId = configured ? await getCurrentOrgId() : null;
  const sub = orgId ? await getSubscription(orgId) : null;

  const access = !configured || hasAccess(sub);
  const canSaved = !configured || can(sub, "saved");

  const raw = orgId && access ? await getMatchedTenders(orgId) : [];
  // L13 affinity → L6 quality → personalized rank.
  const affinity = orgId && access ? buildAffinity(await getCategoryAffinity(orgId)) : {};
  const preferred = preferredCategories(affinity);
  const rankValue = (t: MatchedTender) =>
    personalizeValue(opportunityQuality(t).value, t.category, affinity);
  const all = [...raw].sort((a, b) => rankValue(b) - rankValue(a));

  const { hi, date } = ammanGreeting();
  const now = Date.now();

  // Tier 2 — "act now": a strong match closing soon. (Quality tier alone was too
  // strict with embeddings off, so the urgent 77%/2-day match never surfaced.)
  const isActNow = (t: MatchedTender) => {
    const d = daysOrInf(t.closing_at);
    return t.score >= 0.6 && d >= 0 && d <= 10;
  };
  let priority = all
    .filter(isActNow)
    .sort((a, b) => daysOrInf(a.closing_at) - daysOrInf(b.closing_at))
    .slice(0, 3);
  // Nothing time-critical but we do have matches → still lead with the best 2.
  const actNowCount = priority.length;
  if (priority.length === 0) priority = all.slice(0, Math.min(2, all.length));
  const priorityHeading = actNowCount > 0 ? "يستحقّ قرارك اليوم" : "أبرز العطاءات لك";
  const prioritySet = new Set(priority.map((t) => t.tender_id));

  // Tier 3 — the pipeline: everything else, grouped by lifecycle stage.
  const rest = all.filter((t) => !prioritySet.has(t.tender_id));
  const groups = STAGE_ORDER.map((g) => ({
    g,
    label: STAGE_LABEL[g],
    items: rest.filter((t) => OPP_STAGE_GROUP[t.opportunity_status] === g),
  })).filter((x) => x.items.length > 0);

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
          {/* Tier 1 — the briefing: one decision-framed sentence */}
          <header className="mb-9">
            <p className="eyebrow">إحاطة الصباح · {date}</p>
            <h1 className="mt-2 font-serif text-3xl font-bold text-ink sm:text-4xl">{hi}</h1>
            <p className="mt-2 text-lg leading-relaxed text-ink-soft">
              {all.length === 0
                ? "ما زلنا نراقب السوق نيابة عنك — لا عطاءات تناسب شركتك بعد."
                : actNowCount > 0
                  ? `وجدنا ${all.length} عطاءً يناسب تصنيف شركتك، منها ${actNowCount} يستحقّ قرارك اليوم.`
                  : `وجدنا ${all.length} عطاءً يناسب تصنيف شركتك — راجِع أبرزها بالأسفل.`}
            </p>
          </header>

          <div className="grid gap-8 lg:grid-cols-[1fr_17rem]">
            <div className="space-y-9">
              {all.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  {/* Tier 2 — Priority (rich, vivid act-now cards) */}
                  {priority.length > 0 && (
                    <div>
                      <h2 className="text-xl font-extrabold text-ink">{priorityHeading}</h2>
                      <p className="mb-4 mt-0.5 text-xs text-ink-muted">
                        النسبة = مدى مطابقة العطاء لتصنيف شركتك ونشاطها.
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {priority.map((t) => (
                          <PriorityCard key={t.tender_id} tender={t} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tier 3 — the pipeline, grouped by lifecycle stage */}
                  {groups.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="font-serif text-lg font-bold text-ink">كل العطاءات المطابقة</h2>
                        {canSaved && (
                          <a href="/watchlist" className="text-sm font-medium text-ink-muted hover:text-ink">
                            ★ المتابعة
                          </a>
                        )}
                      </div>
                      <div className="space-y-6">
                        {groups.map((grp) => (
                          <div key={grp.g}>
                            <div className="mb-2 flex items-center gap-2">
                              <h3 className="text-sm font-bold text-ink">{grp.label}</h3>
                              <span className="nums rounded-full bg-sand px-2 py-0.5 text-xs font-semibold text-ink-soft">
                                {grp.items.length}
                              </span>
                            </div>
                            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-card">
                              {grp.items.map((t) => (
                                <PipelineRow key={t.tender_id} tender={t} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right rail — supplementary, never competing */}
            <aside className="space-y-6">
              <DeadlinesRail deadlines={deadlines} />
              {preferred.length > 0 && <LearningPanel preferred={preferred} />}
              <p className="px-1 text-xs leading-relaxed text-ink-muted">
                نراقب يومياً دائرة العطاءات الحكومية (GTD) والمنظومة الإلكترونية (JONEPS)
                ونطابق كل عطاء مع تصنيف شركتك.
              </p>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}

/** Tier 2 — a rich, vivid act-now card: score badge, title, entity, category,
 *  countdown (red when urgent), and a primary call-to-action. */
function PriorityCard({ tender }: { tender: MatchedTender }) {
  const days = daysOrInf(tender.closing_at);
  const urgent = days >= 0 && days <= 3;
  return (
    <a
      href={`/tenders/${tender.tender_id}`}
      className={`group flex flex-col rounded-2xl border bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover ${
        urgent ? "border-red-200" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex flex-col items-center justify-center rounded-xl bg-primary-50 px-3 py-2 leading-none">
          <span className="nums text-xl font-extrabold text-primary-700">{scorePct(tender.score)}</span>
          <span className="mt-1 text-[9px] font-semibold text-primary-700/70">مطابقة</span>
        </span>
        {tender.category && <span className="chip">{tender.category}</span>}
      </div>
      <h3 dir="auto" className="mt-3 line-clamp-2 text-base font-bold leading-snug text-ink">
        {tender.title}
      </h3>
      {tender.entity && <p className="mt-1 truncate text-xs text-ink-muted">{tender.entity}</p>}
      <div className="mt-4 flex items-center justify-between">
        <span
          dir="auto"
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            urgent ? "bg-red-100 text-red-700" : "bg-sand text-ink-soft"
          }`}
        >
          ⏱ {deadlineLabel(tender.closing_at)}
        </span>
        <span className="text-sm font-bold text-primary-700 group-hover:underline">عرض التقرير ←</span>
      </div>
    </a>
  );
}

/** Tier 3 — a compact pipeline row: colored score pill, title + entity, days-left. */
function PipelineRow({ tender }: { tender: MatchedTender }) {
  const days = daysOrInf(tender.closing_at);
  const urgent = days >= 0 && days <= 3;
  const strong = tender.score >= 0.6;
  return (
    <a
      href={`/tenders/${tender.tender_id}`}
      className="flex items-center gap-3 px-4 py-3 transition hover:bg-primary-50/40"
    >
      <span
        className={`nums shrink-0 rounded-lg px-2 py-1 text-sm font-bold ${
          strong ? "bg-primary-50 text-primary-700" : "bg-sand text-ink-soft"
        }`}
      >
        {scorePct(tender.score)}
      </span>
      <div className="min-w-0 flex-1">
        <p dir="auto" className="truncate text-sm font-medium text-ink">{tender.title}</p>
        {tender.entity && <p dir="auto" className="truncate text-xs text-ink-muted">{tender.entity}</p>}
      </div>
      <span
        dir="auto"
        className={`shrink-0 text-xs ${urgent ? "font-semibold text-red-700" : "text-ink-muted"}`}
      >
        {deadlineLabel(tender.closing_at)}
      </span>
    </a>
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
                <p className="truncate text-sm font-medium text-ink" dir="auto">{d.title}</p>
                <p className="mt-0.5 text-xs text-amber-700" dir="auto">⏱ {deadlineLabel(d.closing_at)}</p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="panel flex flex-col items-center px-6 py-16 text-center">
      <div className="text-3xl">🛰️</div>
      <p className="mt-3 font-medium text-ink">لا فرص مطابقة اليوم.</p>
      <p className="mt-1 text-sm text-ink-muted">ما زلنا نراقب السوق نيابة عنك.</p>
    </div>
  );
}
