import type { AnalyzerBrief } from "@/lib/analysis";
import { formatJod, scorePct } from "@/lib/format";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel p-5">
      <h3 className="eyebrow mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Fact({ label, value, page }: { label: string; value: string; page?: number | null }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-sm font-medium text-ink">
        {value}
        {page ? <span className="ms-1 text-xs text-ink-muted">(ص {page})</span> : null}
      </dd>
    </div>
  );
}

/** The structured intelligence report for a tender (CLAUDE.md §12.2). */
export function AnalysisBrief({ brief }: { brief: AnalyzerBrief }) {
  return (
    <div className="space-y-5">
      {brief.scope_summary_ar && (
        <Section title="نطاق العمل">
          <p className="text-sm leading-relaxed text-ink-soft">{brief.scope_summary_ar}</p>
        </Section>
      )}

      <Section title="الحقائق الأساسية">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {brief.required_classification && (
            <Fact label="التصنيف المطلوب" value={brief.required_classification} page={brief.classification_page} />
          )}
          {brief.bid_bond && (
            <Fact label="كفالة دخول العطاء" value={brief.bid_bond} page={brief.bond_page} />
          )}
          {brief.performance_bond && (
            <Fact label="كفالة حسن التنفيذ" value={brief.performance_bond} />
          )}
          {brief.doc_price_jod != null && (
            <Fact label="ثمن الكرّاسة" value={formatJod(brief.doc_price_jod)} />
          )}
          <Fact label="جدول الكميات (BOQ)" value={brief.boq_present ? "متوفّر" : "غير متوفّر"} />
        </dl>
      </Section>

      {brief.key_dates.length > 0 && (
        <Section title="الجدول الزمني">
          <ul className="space-y-2.5 text-sm">
            {brief.key_dates.map((d, i) => (
              <li key={i} className="flex items-center justify-between border-b border-line pb-2 last:border-0">
                <span className="text-ink-soft">{d.label}</span>
                <span className="text-ink-muted">
                  <span className="nums font-medium text-ink">{d.date}</span>
                  {d.page ? <span className="ms-1 text-xs">(ص {d.page})</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {brief.submission_requirements.length > 0 && (
        <Section title="الإجراءات المطلوبة قبل التقديم">
          <ul className="space-y-2 text-sm text-ink-soft">
            {brief.submission_requirements.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-line text-[10px] text-ink-muted">
                  {i + 1}
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {brief.risk_flags.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
            تحليل المخاطر
          </h3>
          <ul className="space-y-2 text-sm text-amber-900">
            {brief.risk_flags.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span>⚠️</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-center text-xs text-ink-muted">
        مستوى ثقة التحليل: <span className="font-medium text-ink">{scorePct(brief.confidence)}</span>
      </p>
    </div>
  );
}
