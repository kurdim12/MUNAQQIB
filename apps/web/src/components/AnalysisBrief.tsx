import type { AnalyzerBrief } from "@/lib/analysis";
import { eligibilityTone } from "@/lib/analysis";
import { formatJod, scorePct } from "@/lib/format";

function Field({ label, value, page }: { label: string; value: string; page?: number | null }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800">
        {value}
        {page ? <span className="mr-1 text-xs text-slate-400"> (ص {page})</span> : null}
      </dd>
    </div>
  );
}

/** Renders an AnalyzerBrief (CLAUDE.md §12.2) as the tender analysis panel. */
export function AnalysisBrief({ brief }: { brief: AnalyzerBrief }) {
  return (
    <div className="space-y-6">
      {/* Eligibility verdict */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900">قرار الأهلية</h2>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${eligibilityTone(brief.eligibility)}`}
          >
            {brief.eligibility}
          </span>
        </div>
        {brief.eligibility_reasoning_ar && (
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {brief.eligibility_reasoning_ar}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          ثقة التحليل: {scorePct(brief.confidence)}
        </p>
      </div>

      {/* Scope */}
      {brief.scope_summary_ar && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 font-bold text-slate-900">نطاق العمل</h2>
          <p className="text-sm leading-relaxed text-slate-700">{brief.scope_summary_ar}</p>
        </div>
      )}

      {/* Key facts */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-bold text-slate-900">الحقائق الأساسية</h2>
        <dl className="grid grid-cols-2 gap-4">
          {brief.required_classification && (
            <Field
              label="التصنيف المطلوب"
              value={brief.required_classification}
              page={brief.classification_page}
            />
          )}
          {brief.bid_bond && (
            <Field label="كفالة دخول العطاء" value={brief.bid_bond} page={brief.bond_page} />
          )}
          {brief.performance_bond && (
            <Field label="كفالة حسن التنفيذ" value={brief.performance_bond} />
          )}
          {brief.doc_price_jod != null && (
            <Field label="ثمن الكرّاسة" value={formatJod(brief.doc_price_jod)} />
          )}
          <Field label="جدول الكميات (BOQ)" value={brief.boq_present ? "متوفر" : "غير متوفر"} />
        </dl>
      </div>

      {/* Key dates */}
      {brief.key_dates.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-bold text-slate-900">التواريخ المهمة</h2>
          <ul className="space-y-2 text-sm">
            {brief.key_dates.map((d, i) => (
              <li key={i} className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-700">{d.label}</span>
                <span className="text-slate-500">
                  <span className="nums">{d.date}</span>
                  {d.page ? <span className="mr-1 text-xs text-slate-400"> (ص {d.page})</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Submission requirements */}
      {brief.submission_requirements.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-bold text-slate-900">متطلبات التقديم</h2>
          <ul className="space-y-1.5 text-sm text-slate-700">
            {brief.submission_requirements.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-brand">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk flags */}
      {brief.risk_flags.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="mb-3 font-bold text-amber-900">تنبيهات ومخاطر</h2>
          <ul className="space-y-1.5 text-sm text-amber-800">
            {brief.risk_flags.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span>⚠️</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
