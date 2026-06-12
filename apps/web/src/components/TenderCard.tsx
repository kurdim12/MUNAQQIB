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

// Category → chip colors (soft, brand-adjacent).
const CATEGORY_TONE: Record<string, string> = {
  أشغال: "bg-amber-50 text-amber-700 ring-amber-200",
  اللوازم: "bg-sky-50 text-sky-700 ring-sky-200",
  خدمات: "bg-violet-50 text-violet-700 ring-violet-200",
  أدوية: "bg-rose-50 text-rose-700 ring-rose-200",
  استشارات: "bg-teal-50 text-teal-700 ring-teal-200",
};

function daysLeft(closing: string | null): number | null {
  if (!closing) return null;
  return Math.ceil((new Date(closing).getTime() - Date.now()) / 86_400_000);
}

function deadlinePill(closing: string | null) {
  const d = daysLeft(closing);
  if (d === null) return "bg-slate-100 text-slate-500";
  if (d < 0) return "bg-slate-100 text-slate-400";
  if (d <= 3) return "bg-red-50 text-red-700 ring-1 ring-red-200";
  if (d <= 7) return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
}

function scoreTone(score: number): string {
  if (score >= 0.85) return "from-emerald-500 to-emerald-600";
  if (score >= 0.7) return "from-brand to-brand-dark";
  return "from-slate-400 to-slate-500";
}

export function TenderCard({
  tender,
  canSave = true,
}: {
  tender: MatchedTender;
  canSave?: boolean;
}) {
  const reasons = Object.entries(tender.reasons)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const catTone = tender.category
    ? (CATEGORY_TONE[tender.category] ?? "bg-slate-100 text-slate-600 ring-slate-200")
    : "";

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/5">
      {/* top: category + score */}
      <div className="flex items-center justify-between gap-3">
        {tender.category ? (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${catTone}`}>
            {tender.category}
          </span>
        ) : (
          <span />
        )}
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-l ${scoreTone(
            tender.score,
          )} px-2.5 py-1 text-xs font-bold text-white`}
          title="نسبة المطابقة"
        >
          <span className="nums">{scorePct(tender.score)}</span> مطابقة
        </span>
      </div>

      <h2 className="mt-3 text-lg font-bold leading-snug text-slate-900 group-hover:text-brand-dark">
        {tender.title}
      </h2>
      {tender.entity && (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <span className="text-slate-300">🏛️</span>
          {tender.entity}
        </p>
      )}

      {/* meta row */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className={`rounded-lg px-2.5 py-1 font-medium ${deadlinePill(tender.closing_at)}`}>
          ⏳ {deadlineLabel(tender.closing_at)}
          {tender.closing_at && (
            <span className="mr-1 text-xs opacity-70">· {formatAmmanDate(tender.closing_at)}</span>
          )}
        </span>
        <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-slate-600">
          🧾 الكرّاسة: <span className="nums font-medium">{formatJod(tender.doc_price_jod)}</span>
        </span>
        {tender.governorate && (
          <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-slate-600">
            📍 {tender.governorate}
          </span>
        )}
      </div>

      {reasons.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {reasons.map(([key]) => (
            <span
              key={key}
              className="rounded-md bg-brand/5 px-2 py-0.5 text-xs text-brand/80"
            >
              {REASON_LABELS[key] ?? key}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-3">
          <a
            href={`/tenders/${tender.tender_id}`}
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            {t.dashboard.analysis} ←
          </a>
          <a
            href={tender.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-400 hover:text-brand"
          >
            {t.dashboard.details}
          </a>
        </div>
        <MatchActions tenderId={tender.tender_id} saved={tender.saved} canSave={canSave} />
      </div>
    </article>
  );
}
