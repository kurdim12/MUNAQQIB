import { getSessionSafe } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { formatAmmanDate } from "@/lib/format";
import { getSources, isConfigured, type SourceHealth } from "@/lib/repo";

export const dynamic = "force-dynamic";

type Status = { label: string; tone: string; reliability: number };

function health(s: SourceHealth): Status {
  if (!s.enabled) return { label: "معطّل", tone: "bg-stone-100 text-stone-600", reliability: 0 };
  const f = s.consecutive_failures;
  const staleHours = s.last_ok_at
    ? (Date.now() - new Date(s.last_ok_at).getTime()) / 3_600_000
    : Infinity;
  const reliability = Math.max(0, 100 - f * 30);
  if (f >= 2) return { label: "متوقّف", tone: "bg-red-100 text-red-700", reliability };
  if (f === 1 || staleHours > 36)
    return { label: "متذبذب", tone: "bg-amber-100 text-amber-700", reliability };
  return { label: "سليم", tone: "bg-green-100 text-green-700", reliability };
}

export default async function OperationsPage() {
  const session = await getSessionSafe();
  if (!isAdminEmail(session?.user?.email)) {
    return (
      <section className="py-16 text-center">
        <h1 className="text-2xl font-extrabold text-ink">غير مصرّح</h1>
        <p className="mt-2 text-ink-soft">هذه الصفحة مخصّصة لطاقم التشغيل فقط.</p>
      </section>
    );
  }

  const sources = isConfigured() ? await getSources() : [];

  return (
    <section className="animate-fade-in">
      <header className="mb-6">
        <p className="eyebrow">التشغيل · مراقبة المصادر</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink">صحّة محرّك الاكتشاف</h1>
        <p className="mt-1.5 text-ink-soft">حالة كل مصدر، آخر تشغيل ونجاح، وعدد الإخفاقات المتتالية.</p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <div className="grid grid-cols-[1.4fr_0.8fr_1fr_1fr_0.7fr] gap-2 border-b border-line bg-sand/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          <span>المصدر</span>
          <span>الحالة</span>
          <span>آخر تشغيل</span>
          <span>آخر نجاح</span>
          <span>الموثوقية</span>
        </div>
        {sources.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-muted">لا مصادر مسجّلة.</p>
        ) : (
          sources.map((s) => {
            const h = health(s);
            return (
              <div
                key={s.id}
                className="grid grid-cols-[1.4fr_0.8fr_1fr_1fr_0.7fr] items-center gap-2 border-b border-line px-4 py-3 text-sm last:border-0"
              >
                <div>
                  <span className="font-semibold uppercase text-ink">{s.id}</span>
                  {s.base_url && (
                    <span className="block truncate text-xs text-ink-muted" dir="ltr">
                      {s.base_url}
                    </span>
                  )}
                </div>
                <span>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${h.tone}`}>
                    {h.label}
                  </span>
                  {s.consecutive_failures > 0 && (
                    <span className="ms-1 text-xs text-red-600">×{s.consecutive_failures}</span>
                  )}
                </span>
                <span className="text-ink-soft">{formatAmmanDate(s.last_run_at)}</span>
                <span className="text-ink-soft">{formatAmmanDate(s.last_ok_at)}</span>
                <span>
                  <span className="nums font-semibold text-ink">{h.reliability}%</span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-line">
                    <span
                      className={`block h-full rounded-full ${
                        h.reliability >= 70 ? "bg-green-600" : h.reliability >= 40 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${h.reliability}%` }}
                    />
                  </span>
                </span>
              </div>
            );
          })
        )}
      </div>

      <p className="mt-4 text-xs text-ink-muted">
        يُنبَّه الفريق على تيليجرام عند إخفاق أي مصدر مرّتين متتاليتين (CLAUDE.md §7).
      </p>
    </section>
  );
}
