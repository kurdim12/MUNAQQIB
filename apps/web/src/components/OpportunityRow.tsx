import { MatchActions } from "@/components/MatchActions";
import type { MatchedTender } from "@/lib/repo";
import { deadlineLabel, formatAmmanDate, formatJod, scorePct } from "@/lib/format";
import { opportunityQuality, qualityTone } from "@/lib/quality";

const REASON_LABELS: Record<string, string> = {
  keyword: "كلمة مفتاحية",
  field: "حقل التصنيف",
  embedding: "تطابق دلالي",
  governorate: "المحافظة",
};

function daysLeft(closing: string | null): number | null {
  if (!closing) return null;
  return Math.ceil((new Date(closing).getTime() - Date.now()) / 86_400_000);
}

function scoreColor(score: number): string {
  if (score >= 0.85) return "text-green-700";
  if (score >= 0.7) return "text-ink";
  return "text-ink-muted";
}
function scoreBar(score: number): string {
  if (score >= 0.85) return "bg-green-600";
  if (score >= 0.7) return "bg-ink";
  return "bg-ink-muted/50";
}
function deadlineColor(closing: string | null): string {
  const d = daysLeft(closing);
  if (d === null) return "text-ink-muted";
  if (d < 0) return "text-ink-muted";
  if (d <= 3) return "text-red-700 font-semibold";
  if (d <= 7) return "text-amber-700 font-medium";
  return "text-ink-soft";
}

/** A single opportunity as an editorial feed row (not a card). */
export function OpportunityRow({
  tender,
  canSave = true,
}: {
  tender: MatchedTender;
  canSave?: boolean;
}) {
  const reasons = Object.keys(tender.reasons).filter((k) => tender.reasons[k] > 0);
  const quality = opportunityQuality(tender);

  return (
    <article className="group relative flex gap-4 px-4 py-4 transition hover:bg-sand/40 sm:px-5">
      {/* score rail */}
      <div className="flex w-14 shrink-0 flex-col items-center gap-1.5 border-e border-line pe-3">
        <span className={`nums text-2xl font-bold leading-none ${scoreColor(tender.score)}`}>
          {scorePct(tender.score)}
        </span>
        <span className="h-1 w-full overflow-hidden rounded-full bg-line">
          <span
            className={`block h-full rounded-full ${scoreBar(tender.score)}`}
            style={{ width: `${Math.round(tender.score * 100)}%` }}
          />
        </span>
        <span className="text-[10px] text-ink-muted">مطابقة</span>
      </div>

      {/* body */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <a href={`/tenders/${tender.tender_id}`} className="min-w-0">
            <h3 className="truncate font-serif text-[17px] font-bold leading-snug text-ink group-hover:underline">
              {tender.title}
            </h3>
            {tender.entity && (
              <p className="mt-0.5 truncate text-sm text-ink-muted">{tender.entity}</p>
            )}
          </a>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${qualityTone(quality.tier)}`}>
              {quality.label}
            </span>
            {tender.category && (
              <span className="rounded-md bg-sand px-2 py-0.5 text-xs font-medium text-ink-soft">
                {tender.category}
              </span>
            )}
          </div>
        </div>

        {/* meta line */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className={deadlineColor(tender.closing_at)}>
            ⏱ {deadlineLabel(tender.closing_at)}
            {tender.closing_at && (
              <span className="ms-1 text-xs text-ink-muted">
                ({formatAmmanDate(tender.closing_at)})
              </span>
            )}
          </span>
          <span className="text-ink-soft">
            الكرّاسة <span className="nums font-medium">{formatJod(tender.doc_price_jod)}</span>
          </span>
          {reasons.length > 0 && (
            <span className="flex flex-wrap items-center gap-1.5">
              {reasons.map((k) => (
                <span key={k} className="text-xs text-green-700">
                  ✓ {REASON_LABELS[k] ?? k}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>

      {/* actions */}
      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        <a
          href={`/tenders/${tender.tender_id}`}
          className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper transition hover:bg-ink-soft"
        >
          التقرير ←
        </a>
        <MatchActions tenderId={tender.tender_id} saved={tender.saved} canSave={canSave} />
      </div>
    </article>
  );
}
