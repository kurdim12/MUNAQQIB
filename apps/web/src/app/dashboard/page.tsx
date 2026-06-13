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

  // Tier 2 — "act now": high-quality, soonest-closing first, capped at 3.
  const priority = all
    .filter((t) => opportunityQuality(t).tier === "high")
    .sort((a, b) => daysOrInf(a.closing_at) - daysOrInf(b.closing_at))
    .slice(0, 3);
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
                ? "ما زلنا نراقب السوق نيابة عنك — لا فرص مطابقة بعد."
                : priority.length > 0
                  ? `رصدنا لك ${all.length} فرصة مطابقة، منها ${priority.length} تستحقّ قرارك اليوم.`
                  : `رصدنا لك ${all.length} فرصة مطابقة — لا شيء عاجل اليوم.`}
            </p>
          </header>

          <div className="grid gap-8 lg:grid-cols-[1fr_17rem]">
            <div className="space-y-9">
              {all.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  {/* Tier 2 — Priority (the only place the accent appears) */}
                  {priority.length > 0 && (
                    <div>
                      <h2 className="eyebrow mb-3">تستحقّ قرارك اليوم</h2>
                      <div className="space-y-3">
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
                        <h2 className="eyebrow">خطّ الفرص</h2>
                        {canSaved && (
                          <a href="/watchlist" className="text-sm font-medium text-ink-muted hover:text-ink">
                            ★ المتابعة
                          </a>
                        )}
                      </div>
                      <div className="space-y-6">
                        {groups.map((grp) => (
                          <div key={grp.g}>
                            <div className="mb-1.5 flex items-baseline gap-2">
                              <h3 className="text-xs font-semibold text-ink-muted">{grp.label}</h3>
                              <span className="nums text-xs text-ink-muted">{grp.items.length}</span>
                            </div>
                            <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
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

/** Tier 2 — a rich, act-now card. Four elements: title, match%, countdown, action.
 *  The accent (ink edge) lives only here. */
function PriorityCard({ tender }: { tender: MatchedTender }) {
  const days = daysOrInf(tender.closing_at);
  const urgent = days <= 3;
  return (
    <a
      href={`/tenders/${tender.tender_id}`}
      className="block rounded-xl border border-line border-s-4 border-s-ink bg-white p-5 transition hover:shadow-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 dir="auto" className="font-serif text-lg font-bold leading-snug text-ink line-clamp-2">
            {tender.title}
          </h3>
          {tender.entity && <p className="mt-1 truncate text-sm text-ink-muted">{tender.entity}</p>}
        </div>
        <div className="shrink-0 text-center">
          <div className="nums text-2xl font-bold leading-none text-ink">{scorePct(tender.score)}</div>
          <div className="mt-1 text-[10px] text-ink-muted">مطابقة</div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className={`text-sm font-medium ${urgent ? "text-red-700" : "text-ink-soft"}`} dir="auto">
          ⏱ {deadlineLabel(tender.closing_at)}
        </span>
        <span className="text-sm font-semibold text-ink">التقرير ←</span>
      </div>
    </a>
  );
}

/** Tier 3 — a compact pipeline row: match%, title, days-left. Detail on click. */
function PipelineRow({ tender }: { tender: MatchedTender }) {
  const days = daysOrInf(tender.closing_at);
  return (
    <a
      href={`/tenders/${tender.tender_id}`}
      className="flex items-center gap-3 px-4 py-3 transition hover:bg-sand/40"
    >
      <span className="nums w-11 shrink-0 text-sm font-bold text-ink-soft">{scorePct(tender.score)}</span>
      <span dir="auto" className="min-w-0 flex-1 truncate text-sm text-ink">
        {tender.title}
      </span>
      <span
        className={`shrink-0 text-xs ${days <= 3 ? "font-medium text-red-700" : "text-ink-muted"}`}
        dir="auto"
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
      <dd className="nums font-medium text-ink">{v}</dd>
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
