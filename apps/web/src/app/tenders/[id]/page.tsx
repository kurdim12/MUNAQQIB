import { AnalysisBrief } from "@/components/AnalysisBrief";
import { Paywall } from "@/components/Paywall";
import { can } from "@/lib/entitlements";
import { deadlineLabel, formatAmmanDate } from "@/lib/format";
import {
  getAnalysis,
  getCurrentOrgId,
  getSubscription,
  getTenderForOrg,
  isConfigured,
} from "@/lib/repo";
import { t } from "@/lib/strings";

export const dynamic = "force-dynamic";

export default async function TenderAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isConfigured()) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {t.dashboard.notConfigured}
      </p>
    );
  }

  const orgId = await getCurrentOrgId();
  const tender = orgId ? await getTenderForOrg(orgId, id) : null;
  if (!tender) {
    return (
      <section className="py-10 text-center">
        <h1 className="text-xl font-bold text-slate-900">العطاء غير موجود</h1>
        <a href="/dashboard" className="mt-3 inline-block text-sm text-brand hover:text-brand-dark">
          ← العودة للوحة العطاءات
        </a>
      </section>
    );
  }

  const sub = orgId ? await getSubscription(orgId) : null;
  const allowed = can(sub, "analyzer");
  const analysis = allowed ? await getAnalysis(orgId!, id) : null;

  return (
    <section className="space-y-6">
      <a href="/dashboard" className="text-sm text-slate-400 hover:text-brand">
        ← لوحة العطاءات
      </a>

      <header className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-xl font-bold text-slate-900">{tender.title}</h1>
        {tender.entity && <p className="mt-1 text-sm text-slate-500">{tender.entity}</p>}
        <div className="mt-3 flex items-center gap-4 text-sm">
          {tender.closing_at && (
            <span className="text-slate-600">
              الإغلاق: {formatAmmanDate(tender.closing_at)} · {deadlineLabel(tender.closing_at)}
            </span>
          )}
          <a
            href={tender.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand hover:text-brand-dark"
          >
            صفحة المصدر ←
          </a>
        </div>
      </header>

      <h2 className="text-lg font-bold text-slate-900">تحليل الكرّاسة</h2>

      {!allowed ? (
        <Paywall
          title="تحليل الكرّاسات ضمن باقة برو"
          body="رقِّ اشتراكك إلى باقة برو للحصول على تحليل ذكي لكرّاسة العطاء: الأهلية، الكفالات، المواعيد، والمخاطر."
        />
      ) : analysis ? (
        <AnalysisBrief brief={analysis.brief} />
      ) : (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-slate-500">
          لم يُحلَّل هذا العطاء بعد. التحليل يُجهَّز تلقائياً ويظهر هنا فور اكتماله.
        </p>
      )}
    </section>
  );
}
