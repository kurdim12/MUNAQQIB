import { AnalysisBrief } from "@/components/AnalysisBrief";
import { KurrasaUpload } from "@/components/KurrasaUpload";
import { OpportunityState } from "@/components/OpportunityState";
import { Paywall } from "@/components/Paywall";
import { eligibilityTone } from "@/lib/analysis";
import { can } from "@/lib/entitlements";
import { deadlineLabel, formatAmmanDate, formatJod, scorePct } from "@/lib/format";
import { OPP_LABELS, type OppStatus, statusTone } from "@/lib/opportunity";
import { opportunityQuality, qualityTone } from "@/lib/quality";
import {
  getAnalysis,
  getAnalysisState,
  getCurrentOrgId,
  getOpportunityEvents,
  getSubscription,
  getTenderForOrg,
  isConfigured,
} from "@/lib/repo";

export const dynamic = "force-dynamic";

const REASON_LABELS: Record<string, string> = {
  keyword: "كلمة مفتاحية مطابقة",
  field: "حقل التصنيف يطابق نشاطك",
  embedding: "تشابه دلالي مع مجال عملك",
  governorate: "ضمن محافظاتك المستهدفة",
};

const STAGE_TONE: Record<string, string> = {
  green: "bg-primary-100 text-primary-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  neutral: "bg-sand text-ink-soft",
};

function daysRemaining(closing: string | null): number | null {
  if (!closing) return null;
  return Math.ceil((new Date(closing).getTime() - Date.now()) / 86_400_000);
}

export default async function OpportunityReport({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isConfigured()) {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        قاعدة البيانات غير مهيّأة في هذه البيئة.
      </p>
    );
  }

  const orgId = await getCurrentOrgId();
  const tender = orgId ? await getTenderForOrg(orgId, id) : null;
  if (!tender) {
    return (
      <section className="py-16 text-center">
        <h1 className="text-2xl font-extrabold text-ink">العطاء غير موجود</h1>
        <a href="/dashboard" className="mt-3 inline-block text-sm font-medium text-primary-700 underline">
          ← العودة لمركز القيادة
        </a>
      </section>
    );
  }

  const sub = orgId ? await getSubscription(orgId) : null;
  const allowed = can(sub, "analyzer");
  const analysis = allowed ? await getAnalysis(orgId!, id) : null;
  const analysisState = allowed && !analysis ? await getAnalysisState(orgId!, id) : "none";
  const events = orgId ? await getOpportunityEvents(orgId, id) : [];
  const days = daysRemaining(tender.closing_at);
  const reasons = Object.keys(tender.reasons).filter((k) => tender.reasons[k] > 0);
  const status = tender.opportunity_status;

  return (
    <section className="animate-fade-in space-y-6">
      <a href="/dashboard" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        ← مركز القيادة
      </a>

      {/* Hero */}
      <header className="panel overflow-hidden">
        <div className="border-b border-line bg-hero-glow px-6 py-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="eyebrow">تقرير العطاء · {tender.category ?? "عطاء حكومي"}</p>
            <div className="flex items-center gap-1.5">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STAGE_TONE[statusTone(status)]}`}>
                {OPP_LABELS[status]}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${qualityTone(opportunityQuality(tender).tier)}`}>
                {opportunityQuality(tender).label}
              </span>
            </div>
          </div>
          <h1 dir="auto" className="mt-3 text-2xl font-extrabold leading-snug text-ink sm:text-3xl">
            {tender.title}
          </h1>
          {tender.entity && <p className="mt-2 text-ink-soft">{tender.entity}</p>}
        </div>
        <dl className="grid grid-cols-2 divide-line border-t border-line sm:grid-cols-4 sm:divide-x sm:divide-x-reverse">
          <Stat label="نسبة المطابقة" value={scorePct(tender.score)} accent="primary" />
          <Stat
            label="أيام متبقية"
            value={days === null ? "—" : days < 0 ? "مغلق" : `${days}`}
            accent={days !== null && days <= 3 ? "red" : days !== null && days <= 7 ? "amber" : "ink"}
          />
          <Stat label="ثمن الكرّاسة" value={formatJod(tender.doc_price_jod)} />
          <div className="flex items-center justify-center px-4 py-5">
            <a href={tender.url} target="_blank" rel="noopener noreferrer" className="btn-primary w-full text-sm">
              المصدر الرسمي ↗
            </a>
          </div>
        </dl>
      </header>

      {/* Lifecycle (L2) — the decision bar */}
      <OpportunityState tenderId={id} status={status} />

      {/* Verdict — can I win this? */}
      {analysis && (
        <div className="panel flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="eyebrow">هل أنت مؤهّل لهذا العطاء؟</p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
              {analysis.brief.eligibility_reasoning_ar}
            </p>
          </div>
          <span className={`shrink-0 rounded-xl px-5 py-2.5 text-base font-bold ${eligibilityTone(analysis.brief.eligibility)}`}>
            {analysis.brief.eligibility}
          </span>
        </div>
      )}

      {/* Why we matched */}
      {reasons.length > 0 && (
        <div className="panel p-6">
          <h2 className="mb-4 text-lg font-bold text-ink">لماذا طابقنا هذا العطاء لشركتك</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {reasons.map((k) => (
              <li key={k} className="flex items-center gap-2.5 text-sm text-ink-soft">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700">
                  ✓
                </span>
                {REASON_LABELS[k] ?? k}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Analyzer */}
      <div>
        <h2 className="mb-3 text-xl font-extrabold text-ink">تحليل الكرّاسة</h2>
        {!allowed ? (
          <Paywall
            title="تحليل الكرّاسة ضمن باقة برو"
            body="رقِّ اشتراكك إلى باقة برو للحصول على تقرير كامل: الأهلية، الكفالات، المواعيد، والمخاطر — قبل أن تقضي ساعات في قراءة المستندات."
          />
        ) : analysis ? (
          <>
            <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
              مراجعة أولية بالذكاء الاصطناعي — راجِع الكرّاسة الأصلية قبل القرار.
            </p>
            <AnalysisBrief brief={analysis.brief} />
          </>
        ) : analysisState === "queued" ? (
          <div className="panel p-8 text-center">
            <div className="text-3xl">⏳</div>
            <p className="mt-2 font-bold text-ink">الكرّاسة قيد التحليل…</p>
            <p className="mt-1 text-sm text-ink-muted">
              يقرأ المحلّل المستند ويستخرج الأهلية والمواعيد والمخاطر. حدّث الصفحة بعد قليل.
            </p>
          </div>
        ) : (
          <>
            {analysisState === "failed" && (
              <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                تعذّر التحليل السابق — أعد رفع الكرّاسة (PDF نصّي وليس صورة ممسوحة).
              </p>
            )}
            <KurrasaUpload tenderId={id} />
          </>
        )}
      </div>

      {/* Activity log (L2) */}
      {events.length > 0 && (
        <div className="panel p-6">
          <h2 className="mb-4 text-lg font-bold text-ink">السجل</h2>
          <ol className="space-y-3">
            {events.map((e, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                <span className="font-medium text-ink">{OPP_LABELS[e.to_status as OppStatus] ?? e.to_status}</span>
                <span className="text-ink-muted" dir="ltr">{formatAmmanDate(e.at)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {tender.closing_at && (
        <p className="text-center text-xs text-ink-muted">
          الموعد النهائي: {formatAmmanDate(tender.closing_at)} · {deadlineLabel(tender.closing_at)}
        </p>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  accent = "ink",
}: {
  label: string;
  value: string;
  accent?: "ink" | "amber" | "red" | "primary";
}) {
  const color =
    accent === "amber"
      ? "text-amber-700"
      : accent === "red"
        ? "text-red-700"
        : accent === "primary"
          ? "text-primary-700"
          : "text-ink";
  return (
    <div className="px-4 py-5 text-center">
      <div className={`nums text-2xl font-extrabold ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-ink-muted">{label}</div>
    </div>
  );
}
