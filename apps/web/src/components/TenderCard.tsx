import { MatchActions } from "@/components/MatchActions";
import type { MatchedTender } from "@/lib/repo";
import { deadlineLabel, formatAmmanDate, formatJod, scorePct } from "@/lib/format";
import { t } from "@/lib/strings";

const REASON_LABELS: Record<string, string> = {
  keyword: "كلمات مفتاحية",
  field: "حقل التصنيف",
  embedding: "تشابه دلالي",
  governorate: "المحافظة",
};

function deadlineTone(closing: string | null): string {
  if (!closing) return "text-slate-500";
  const days = (new Date(closing).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return "text-slate-400";
  if (days <= 3) return "text-red-600 font-semibold";
  if (days <= 7) return "text-amber-600 font-medium";
  return "text-slate-600";
}

export function TenderCard({ tender }: { tender: MatchedTender }) {
  const reasons = Object.entries(tender.reasons)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-light">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold leading-tight text-slate-900">
          {tender.title}
        </h2>
        <span className="shrink-0 rounded-full bg-brand/10 px-2.5 py-1 text-sm font-medium text-brand">
          {t.dashboard.score} <span className="nums">{scorePct(tender.score)}</span>
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-600 sm:grid-cols-4">
        {tender.entity && (
          <div>
            <dt className="text-slate-400">{t.dashboard.entity}</dt>
            <dd>{tender.entity}</dd>
          </div>
        )}
        {tender.governorate && (
          <div>
            <dt className="text-slate-400">{t.dashboard.governorate}</dt>
            <dd>{tender.governorate}</dd>
          </div>
        )}
        <div>
          <dt className="text-slate-400">{t.dashboard.docPrice}</dt>
          <dd className="nums">{formatJod(tender.doc_price_jod)}</dd>
        </div>
        <div>
          <dt className="text-slate-400">{t.dashboard.closing}</dt>
          <dd className={deadlineTone(tender.closing_at)}>
            {formatAmmanDate(tender.closing_at)} · {deadlineLabel(tender.closing_at)}
          </dd>
        </div>
      </dl>

      {reasons.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {reasons.map(([key]) => (
            <span
              key={key}
              className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >
              {REASON_LABELS[key] ?? key}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <a
          href={tender.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-brand hover:text-brand-dark"
        >
          {t.dashboard.details} ←
        </a>
        <MatchActions tenderId={tender.tender_id} saved={tender.saved} />
      </div>
    </article>
  );
}
