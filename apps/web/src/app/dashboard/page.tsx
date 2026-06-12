import { TenderCard } from "@/components/TenderCard";
import { TrialBanner } from "@/components/TrialBanner";
import {
  getCurrentOrgId,
  getMatchedTenders,
  getSubscription,
  isConfigured,
} from "@/lib/repo";
import { t } from "@/lib/strings";

// Always render live (D1 changes every pipeline run).
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const savedOnly = view === "saved";

  const configured = isConfigured();
  const orgId = configured ? await getCurrentOrgId() : null;
  const [tenders, sub] = orgId
    ? await Promise.all([
        getMatchedTenders(orgId, { savedOnly }),
        getSubscription(orgId),
      ])
    : [[], null];

  return (
    <section>
      <TrialBanner sub={sub} />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t.dashboard.title}</h1>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 text-sm">
          <Tab href="/dashboard" active={!savedOnly} label="الكل" />
          <Tab href="/dashboard?view=saved" active={savedOnly} label="★ المحفوظة" />
        </div>
      </div>

      {!configured && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t.dashboard.notConfigured}
        </p>
      )}

      {tenders.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-slate-500">
          {savedOnly ? "لا توجد عطاءات محفوظة بعد." : t.dashboard.empty}
        </p>
      ) : (
        <div className="grid gap-4">
          {tenders.map((tender) => (
            <TenderCard key={tender.tender_id} tender={tender} />
          ))}
        </div>
      )}
    </section>
  );
}

function Tab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <a
      href={href}
      className={`rounded-md px-3 py-1 transition ${
        active ? "bg-brand text-white" : "text-slate-600 hover:text-brand"
      }`}
    >
      {label}
    </a>
  );
}
