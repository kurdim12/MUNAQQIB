import { OpportunityState } from "@/components/OpportunityState";
import { Paywall } from "@/components/Paywall";
import { hasAccess } from "@/lib/entitlements";
import { deadlineLabel, formatAmmanDate, scorePct } from "@/lib/format";
import { OPP_LABELS, statusTone } from "@/lib/opportunity";
import {
  getCurrentOrgId,
  getSubscription,
  getWatchlist,
  isConfigured,
  type WatchItem,
} from "@/lib/repo";

export const dynamic = "force-dynamic";

const STAGE_TONE: Record<string, string> = {
  green: "bg-primary-100 text-primary-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  neutral: "bg-sand text-ink-soft",
};

function daysLeft(closing: string | null): number | null {
  if (!closing) return null;
  return Math.ceil((new Date(closing).getTime() - Date.now()) / 86_400_000);
}

export default async function WatchlistPage() {
  const configured = isConfigured();
  const orgId = configured ? await getCurrentOrgId() : null;
  const sub = orgId ? await getSubscription(orgId) : null;
  const access = !configured || hasAccess(sub);

  const items = orgId && access ? await getWatchlist(orgId) : [];
  const submitted = items.filter((i) => i.opportunity_status === "bid").length;
  const tracking = items.filter((i) => i.opportunity_status === "tracking").length;
  const critical = items.filter((i) => {
    const d = daysLeft(i.closing_at);
    return d !== null && d >= 0 && d <= 3;
  }).length;

  return (
    <section className="animate-fade-in">
      <header className="mb-7">
        <p className="eyebrow">المتابعة · العطاءات قيد التنفيذ</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink sm:text-4xl">عطاءاتك قيد المتابعة</h1>
        <p className="mt-2 text-ink-soft">
          العطاءات التي قرّرت التقديم عليها أو تتابعها — نراقب مواعيدها، وتسجّل نتيجتها هنا.
        </p>
      </header>

      {!access ? (
        <Paywall />
      ) : items.length === 0 ? (
        <div className="panel flex flex-col items-center px-6 py-16 text-center">
          <div className="text-3xl">📌</div>
          <p className="mt-3 font-bold text-ink">لا عطاءات قيد المتابعة بعد.</p>
          <p className="mt-1 max-w-sm text-sm text-ink-muted">
            حين تقرّر «تقديم» على عطاء من صفحة التفاصيل، سيظهر هنا لتتابع موعده وتسجّل نتيجته.
          </p>
          <a href="/dashboard" className="btn-primary mt-5 text-sm">تصفّح العطاءات الجديدة ←</a>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-3 gap-3">
            <Metric label="قدّمنا عليها" value={String(submitted)} accent="primary" />
            <Metric label="قيد المتابعة" value={String(tracking)} accent="amber" />
            <Metric label="مواعيد حرجة (٣ أيام)" value={String(critical)} accent="red" />
          </div>

          <div className="space-y-4">
            {items.map((it) => (
              <WatchCard key={it.tender_id} item={it} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function WatchCard({ item }: { item: WatchItem }) {
  const d = daysLeft(item.closing_at);
  const urgent = d !== null && d >= 0 && d <= 3;
  return (
    <article className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STAGE_TONE[statusTone(item.opportunity_status)]}`}>
              {OPP_LABELS[item.opportunity_status]}
            </span>
            {item.category && <span className="chip">{item.category}</span>}
            <span className="nums text-xs text-ink-muted">مطابقة {scorePct(item.score)}</span>
          </div>
          <a href={`/tenders/${item.tender_id}`}>
            <h3 dir="auto" className="mt-2 line-clamp-2 text-base font-bold text-ink hover:underline">
              {item.title}
            </h3>
          </a>
          {item.entity && <p className="mt-1 truncate text-xs text-ink-muted">{item.entity}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span dir="auto" className={urgent ? "font-semibold text-red-700" : "text-ink-soft"}>
              ⏱ {deadlineLabel(item.closing_at)}
              {item.closing_at && (
                <span className="ms-1 text-xs text-ink-muted">({formatAmmanDate(item.closing_at)})</span>
              )}
            </span>
            {item.has_analysis && (
              <a href={`/tenders/${item.tender_id}`} className="text-xs font-semibold text-primary-700">
                ✓ التقرير جاهز
              </a>
            )}
          </div>
        </div>
        <a
          href={`/tenders/${item.tender_id}`}
          className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper transition hover:bg-ink-soft"
        >
          التفاصيل ←
        </a>
      </div>

      {/* Window 4 writes the outcome (ربح / خسارة) right here */}
      <div className="mt-4 border-t border-line pt-4">
        <OpportunityState tenderId={item.tender_id} status={item.opportunity_status} />
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "primary" | "amber" | "red";
}) {
  const color =
    accent === "primary"
      ? "text-primary-700"
      : accent === "amber"
        ? "text-amber-700"
        : accent === "red"
          ? "text-red-700"
          : "text-ink";
  return (
    <div className="panel p-4 text-center">
      <div className={`nums text-2xl font-extrabold ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-ink-muted">{label}</div>
    </div>
  );
}
