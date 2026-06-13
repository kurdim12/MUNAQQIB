import { AnalysisBrief } from "@/components/AnalysisBrief";
import { IntelligenceEngine } from "@/components/IntelligenceEngine";
import { OpportunityState } from "@/components/OpportunityState";
import { Paywall } from "@/components/Paywall";
import { eligibilityTone } from "@/lib/analysis";
import { can } from "@/lib/entitlements";
import { deadlineLabel, formatAmmanDate, formatJod, scorePct } from "@/lib/format";
import { opportunityQuality, qualityTone } from "@/lib/quality";
import {
  getAnalysis,
  getCurrentOrgId,
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
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        قاعدة البيانات غير مهيّأة في هذه البيئة.
      </p>
    );
  }

  const orgId = await getCurrentOrgId();
  const tender = orgId ? await getTenderForOrg(orgId, id) : null;
  if (!tender) {
    return (
      <section className="py-16 text-center">
        <h1 className="font-serif text-2xl font-bold text-ink">الفرصة غير موجودة</h1>
        <a href="/dashboard" className="mt-3 inline-block text-sm text-ink underline">
          ← العودة لمركز القيادة
        </a>
      </section>
    );
  }

  const sub = orgId ? await getSubscription(orgId) : null;
  const allowed = can(sub, "analyzer");
  const analysis = allowed ? await getAnalysis(orgId!, id) : null;
  const days = daysRemaining(tender.closing_at);
  const reasons = Object.keys(tender.reasons).filter((k) => tender.reasons[k] > 0);

  return (
    <section className="animate-fade-in space-y-6">
      <a href="/dashboard" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        ← مركز القيادة
      </a>

      {/* Hero */}
      <header className="panel overflow-hidden">
        <div className="border-b border-line bg-sand/40 px-6 py-6">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">تقرير الفرصة · {tender.category ?? "عطاء حكومي"}</p>
            <span
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${qualityTone(
                opportunityQuality(tender).tier,
              )}`}
            >
              {opportunityQuality(tender).label}
            </span>
          </div>
          <h1 className="mt-2 font-serif text-2xl font-bold leading-snug text-ink sm:text-3xl">
            {tender.title}
          </h1>
          {tender.entity && <p className="mt-1.5 text-ink-soft">{tender.entity}</p>}
        </div>
        <dl className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x sm:divide-x-reverse">
          <Stat label="نسبة المطابقة" value={scorePct(tender.score)} accent="ink" />
          <Stat
            label="أيام متبقية"
            value={days === null ? "—" : days < 0 ? "مغلق" : `${days}`}
            accent={days !== null && days <= 3 ? "red" : days !== null && days <= 7 ? "amber" : "ink"}
          />
          <Stat label="ثمن الكرّاسة" value={formatJod(tender.doc_price_jod)} />
          <div className="flex items-center justify-center px-4 py-5">
            <a
              href={tender.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ink w-full text-sm"
            >
              المصدر الرسمي ←
            </a>
          </div>
        </dl>
      </header>

      {/* Lifecycle (L2) — where the decision is made and tracked */}
      <OpportunityState tenderId={id} status={tender.opportunity_status} />

      {/* Verdict — can I win this? */}
      {analysis && (
        <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="eyebrow">هل أنت مؤهّل لهذه الفرصة؟</p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
              {analysis.brief.eligibility_reasoning_ar}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-lg px-4 py-2 text-base font-bold ${eligibilityTone(
              analysis.brief.eligibility,
            )}`}
          >
            {analysis.brief.eligibility}
          </span>
        </div>
      )}

      {/* Why we matched */}
      {reasons.length > 0 && (
        <div className="panel p-5">
          <h2 className="eyebrow mb-3">لماذا طابقنا هذه الفرصة لك</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {reasons.map((k) => (
              <li key={k} className="flex items-center gap-2 text-sm text-ink-soft">
                <span className="text-green-700">✓</span> {REASON_LABELS[k] ?? k}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Intelligence report / states */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 font-serif text-xl font-bold text-ink">
          تقرير ذكاء الكرّاسة
        </h2>
        {!allowed ? (
          <Paywall
            title="تقرير ذكاء الكرّاسة ضمن باقة برو"
            body="رقِّ اشتراكك إلى باقة برو للحصول على تقرير كامل: الأهلية، الكفالات، المواعيد، والمخاطر — قبل أن تقضي ساعات في قراءة المستندات."
          />
        ) : analysis ? (
          <AnalysisBrief brief={analysis.brief} />
        ) : (
          <IntelligenceEngine tenderId={id} />
        )}
      </div>

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
  accent?: "ink" | "amber" | "red";
}) {
  const color = accent === "amber" ? "text-amber-700" : accent === "red" ? "text-red-700" : "text-ink";
  return (
    <div className="px-4 py-5 text-center">
      <div className={`nums text-2xl font-bold ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-ink-muted">{label}</div>
    </div>
  );
}
