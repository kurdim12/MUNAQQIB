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
    <section className="space-y-6 animate-fade-in">
      <a
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-brand"
      >
        ← لوحة العطاءات
      </a>

      <header className="card overflow-hidden">
        <div className="bg-gradient-to-l from-brand-50/60 to-white px-6 py-5">
          <h1 className="text-xl font-extrabold leading-snug text-slate-900">{tender.title}</h1>
          {tender.entity && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
              <span className="text-slate-300">🏛️</span>
              {tender.entity}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            {tender.closing_at && (
              <span className="rounded-lg bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm">
                ⏳ الإغلاق: {formatAmmanDate(tender.closing_at)} · {deadlineLabel(tender.closing_at)}
              </span>
            )}
            <a
              href={tender.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-brand px-3 py-1.5 font-semibold text-white transition hover:bg-brand-dark"
            >
              صفحة المصدر ←
            </a>
          </div>
        </div>
      </header>

      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <span>📄</span> تحليل الكرّاسة
      </h2>

      {!allowed ? (
        <Paywall
          title="تحليل الكرّاسات ضمن باقة برو"
          body="رقِّ اشتراكك إلى باقة برو للحصول على تحليل ذكي لكرّاسة العطاء: الأهلية، الكفالات، المواعيد، والمخاطر."
        />
      ) : analysis ? (
        <AnalysisBrief brief={analysis.brief} />
      ) : (
        <div className="card flex flex-col items-center px-6 py-14 text-center">
          <div className="text-4xl">⏳</div>
          <p className="mt-3 font-medium text-slate-700">لم يُحلَّل هذا العطاء بعد</p>
          <p className="mt-1 text-sm text-slate-500">
            التحليل يُجهَّز تلقائياً بالذكاء الاصطناعي ويظهر هنا فور اكتماله.
          </p>
        </div>
      )}
    </section>
  );
}
