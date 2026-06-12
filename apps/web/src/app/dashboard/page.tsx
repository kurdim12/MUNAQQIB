import { Paywall } from "@/components/Paywall";
import { TenderCard } from "@/components/TenderCard";
import { TrialBanner } from "@/components/TrialBanner";
import { can, hasAccess } from "@/lib/entitlements";
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
  const sub = orgId ? await getSubscription(orgId) : null;

  // No D1 configured (local dev) → show the UI without gating. Otherwise gate on
  // the subscription's effective entitlements.
  const access = !configured || hasAccess(sub);
  const canSaved = !configured || can(sub, "saved");
  const showList = access && (!savedOnly || canSaved);

  const tenders =
    orgId && showList ? await getMatchedTenders(orgId, { savedOnly }) : [];

  return (
    <section>
      <TrialBanner sub={sub} />

      {!configured && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t.dashboard.notConfigured}
        </p>
      )}

      {!access ? (
        <Paywall />
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">{t.dashboard.title}</h1>
            <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 text-sm">
              <Tab href="/dashboard" active={!savedOnly} label="الكل" />
              {canSaved && (
                <Tab href="/dashboard?view=saved" active={savedOnly} label="★ المحفوظة" />
              )}
            </div>
          </div>

          {savedOnly && !canSaved ? (
            <Paywall
              title="حفظ العطاءات ضمن باقة برو"
              body="رقِّ اشتراكك إلى باقة برو لحفظ العطاءات ومتابعتها."
            />
          ) : tenders.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-slate-500">
              {savedOnly ? "لا توجد عطاءات محفوظة بعد." : t.dashboard.empty}
            </p>
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
