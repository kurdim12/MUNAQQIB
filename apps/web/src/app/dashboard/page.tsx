import { TenderCard } from "@/components/TenderCard";
import { getCurrentOrgId, getMatchedTenders, isConfigured } from "@/lib/repo";
import { t } from "@/lib/strings";

// Always render live (D1 changes every pipeline run).
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const configured = isConfigured();
  const orgId = configured ? await getCurrentOrgId() : null;
  const tenders = orgId ? await getMatchedTenders(orgId) : [];

  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{t.dashboard.title}</h1>

      {!configured && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t.dashboard.notConfigured}
        </p>
      )}

      {tenders.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-slate-500">
          {t.dashboard.empty}
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
