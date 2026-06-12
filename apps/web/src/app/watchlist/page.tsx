import { MatchActions } from "@/components/MatchActions";
import { Paywall } from "@/components/Paywall";
import { hasAccess } from "@/lib/entitlements";
import { deadlineLabel, formatAmmanDate, scorePct } from "@/lib/format";
import {
  getCurrentOrgId,
  getSubscription,
  getWatchlist,
  isConfigured,
  type WatchItem,
} from "@/lib/repo";

export const dynamic = "force-dynamic";

function statusBadge(status: string): { label: string; tone: string } {
  if (status === "awarded") return { label: "تمّت الإحالة", tone: "bg-amber-100 text-amber-800" };
  if (status === "closed") return { label: "مُغلق", tone: "bg-stone-100 text-stone-600" };
  return { label: "قيد المراقبة", tone: "bg-green-100 text-green-700" };
}

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
  const monitoring = items.filter((i) => i.status === "open").length;
  const closed = items.filter((i) => i.status !== "open").length;
  const soon = items.filter((i) => {
    const d = daysLeft(i.closing_at);
    return d !== null && d >= 0 && d <= 7;
  }).length;

  return (
    <section className="animate-fade-in">
      <header className="mb-6">
        <p className="eyebrow">قائمة المتابعة · مراقبة مستمرّة</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-ink">نراقبها نيابةً عنك</h1>
        <p className="mt-1.5 text-ink-soft">
          الفرص التي تحفظها نتابع مواعيدها وحالتها وملاحقها — لن تحتاج للتحقّق يدوياً مرّة أخرى.
        </p>
      </header>

      {!access ? (
        <Paywall />
      ) : items.length === 0 ? (
        <div className="panel flex flex-col items-center px-6 py-16 text-center">
          <div className="text-3xl">★</div>
          <p className="mt-3 font-medium text-ink">قائمة المتابعة فارغة</p>
          <p className="mt-1 text-sm text-ink-muted">احفظ أي فرصة من مركز القيادة وسنتولّى مراقبتها.</p>
          <a href="/dashboard" className="mt-4 btn-ink text-sm">تصفّح الفرص ←</a>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-3 gap-3">
            <Metric label="قيد المراقبة" value={String(monitoring)} accent="green" />
            <Metric label="مواعيد خلال الأسبوع" value={String(soon)} accent="amber" />
            <Metric label="مُغلقة / محالة" value={String(closed)} />
          </div>

          <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
            {items.map((it) => (
              <WatchRow key={it.tender_id} item={it} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function WatchRow({ item }: { item: WatchItem }) {
  const s = statusBadge(item.status);
  const d = daysLeft(item.closing_at);
  const urgent = d !== null && d >= 0 && d <= 3;
  return (
    <article className="flex gap-4 px-4 py-4 transition hover:bg-sand/40 sm:px-5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${s.tone}`}>{s.label}</span>
          {item.category && (
            <span className="rounded-md bg-sand px-2 py-0.5 text-xs text-ink-soft">{item.category}</span>
          )}
          <span className="nums text-xs text-ink-muted">مطابقة {scorePct(item.score)}</span>
        </div>
        <a href={`/tenders/${item.tender_id}`}>
          <h3 className="mt-1.5 truncate font-serif text-[17px] font-bold text-ink hover:underline">
            {item.title}
          </h3>
        </a>
        {item.entity && <p className="truncate text-sm text-ink-muted">{item.entity}</p>}

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className={urgent ? "font-semibold text-red-700" : "text-ink-soft"}>
            ⏱ {deadlineLabel(item.closing_at)}
            {item.closing_at && (
              <span className="ms-1 text-xs text-ink-muted">({formatAmmanDate(item.closing_at)})</span>
            )}
          </span>
          <span className="text-xs text-ink-muted">آخر فحص: اليوم 7:30 ص</span>
          {item.has_analysis && (
            <a href={`/tenders/${item.tender_id}`} className="text-xs font-medium text-green-700">
              ✓ التقرير جاهز
            </a>
          )}
        </div>

        <p className="mt-2 text-xs text-ink-muted">
          نراقب: الموعد النهائي · حالة العطاء · الملاحق والتعديلات
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        <a
          href={`/tenders/${item.tender_id}`}
          className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper transition hover:bg-ink-soft"
        >
          التقرير ←
        </a>
        <MatchActions tenderId={item.tender_id} saved canSave />
      </div>
    </article>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: "green" | "amber" }) {
  const color = accent === "green" ? "text-green-700" : accent === "amber" ? "text-amber-700" : "text-ink";
  return (
    <div className="panel p-4 text-center">
      <div className={`nums text-2xl font-bold ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-ink-muted">{label}</div>
    </div>
  );
}
