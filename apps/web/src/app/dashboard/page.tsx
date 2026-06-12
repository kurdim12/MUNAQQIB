import { Paywall } from "@/components/Paywall";
import { TenderCard } from "@/components/TenderCard";
import { TrialBanner } from "@/components/TrialBanner";
import { can, hasAccess } from "@/lib/entitlements";
import { scorePct } from "@/lib/format";
import {
  getCurrentOrgId,
  getMatchedTenders,
  getSubscription,
  isConfigured,
  type MatchedTender,
} from "@/lib/repo";
import { t } from "@/lib/strings";

// Always render live (D1 changes every pipeline run).
export const dynamic = "force-dynamic";

export default async function DashboardPage({
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

  const all = orgId && showList ? await getMatchedTenders(orgId, { savedOnly }) : [];
  const categories = Array.from(new Set(all.map((x) => x.category).filter(Boolean))) as string[];
  const tenders = cat ? all.filter((x) => x.category === cat) : all;
  const base = savedOnly ? "/dashboard?view=saved" : "/dashboard";

  return (
    <section className="animate-fade-in">
      <TrialBanner sub={sub} />

      {!configured && (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t.dashboard.notConfigured}
        </p>
      )}

      {!access ? (
        <Paywall />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {t.dashboard.title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                مطابقة آلية من مصادر العطاءات الحكومية — مرتّبة حسب قرب الموعد.
              </p>
            </div>
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-sm">
              <Tab href="/dashboard" active={!savedOnly} label="الكل" />
              {canSaved && (
                <Tab href="/dashboard?view=saved" active={savedOnly} label="★ المحفوظة" />
              )}
            </div>
          </div>

          {!savedOnly && all.length > 0 && <Stats tenders={all} />}

          {categories.length > 1 && (
            <div className="mb-6 flex flex-wrap gap-2">
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
              title="حفظ العطاءات ضمن باقة برو"
              body="رقِّ اشتراكك إلى باقة برو لحفظ العطاءات ومتابعتها."
            />
          ) : tenders.length === 0 ? (
            <EmptyState savedOnly={savedOnly} />
          ) : (
            <div className="grid gap-4">
              {tenders.map((tender) => (
                <TenderCard key={tender.tender_id} tender={tender} canSave={canSaved} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Stats({ tenders }: { tenders: MatchedTender[] }) {
  const now = Date.now();
  const soon = tenders.filter((x) => {
    if (!x.closing_at) return false;
    const days = (new Date(x.closing_at).getTime() - now) / 86_400_000;
    return days >= 0 && days <= 7;
  }).length;
  const top = tenders.reduce((m, x) => Math.max(m, x.score), 0);
  const cards = [
    { label: "عطاء مطابق", value: String(tenders.length), icon: "📋" },
    { label: "تُغلق خلال 7 أيام", value: String(soon), icon: "⏳" },
    { label: "أعلى نسبة مطابقة", value: scorePct(top), icon: "🎯" },
  ];
  return (
    <div className="mb-6 grid grid-cols-3 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-lg">
            {c.icon}
          </span>
          <div>
            <div className="text-xl font-extrabold text-slate-900">{c.value}</div>
            <div className="text-xs text-slate-500">{c.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ savedOnly }: { savedOnly: boolean }) {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <div className="text-4xl">{savedOnly ? "☆" : "🔍"}</div>
      <p className="mt-3 font-medium text-slate-700">
        {savedOnly ? "لا توجد عطاءات محفوظة بعد." : t.dashboard.empty}
      </p>
      {savedOnly && (
        <a href="/dashboard" className="mt-3 text-sm font-medium text-brand hover:text-brand-dark">
          تصفّح كل العطاءات ←
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
        active
          ? "bg-brand text-white shadow-sm"
          : "border border-slate-200 bg-white text-slate-600 hover:border-brand/40 hover:text-brand"
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
      className={`rounded-lg px-3 py-1.5 transition ${
        active ? "bg-brand text-white shadow-sm" : "text-slate-600 hover:text-brand"
      }`}
    >
      {label}
    </a>
  );
}
