import { deadlineLabel, formatJod, scorePct } from "@/lib/format";
import {
  getCurrentOrgId,
  getMatchedTenders,
  getMissedMatches,
  isConfigured,
  type MatchedTender,
} from "@/lib/repo";

export const dynamic = "force-dynamic";

// المنطقة ① الدخول — التسليم إلى الحلقة: يعرض أول «جديد» حيّاً (الفرص الأولى).
export default async function TrialReady() {
  const orgId = isConfigured() ? await getCurrentOrgId() : null;
  const open = orgId ? (await getMatchedTenders(orgId)).filter((t) => t.status === "open") : [];
  const missed = orgId ? await getMissedMatches(orgId) : [];
  const topOpen = open.slice(0, 5);

  return (
    <section className="animate-fade-in space-y-12">
      {/* Headline (computed) */}
      <div className="rounded-3xl bg-hero-glow px-6 py-12 text-center">
        <span className="chip mx-auto border-primary-200 bg-primary-50 text-primary-700">
          تهانينا · حسابك جاهز
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
          {open.length > 0 ? (
            <>
              وجدنا لك <span className="text-gradient">{open.length} عطاءً</span> يناسب شركتك الآن
              {missed.length > 0 && (
                <>
                  ،<br />و<span className="text-red-600">{missed.length}</span> فاتك مؤخراً
                </>
              )}
            </>
          ) : (
            "حسابك جاهز — بدأنا نراقب السوق نيابةً عنك"
          )}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-ink-soft">
          {open.length > 0
            ? "هذه أول دفعة من العطاءات المطابقة لتصنيفك. كل صباح الساعة ٧:٣٠ نرسل لك الجديد منها."
            : "سنرسل لك أول إحاطة صباحية فور رصد عطاءات تناسب تصنيفك."}
        </p>
        <a href="/dashboard" className="btn-primary mt-8 inline-block text-base">افتح مركز القيادة ←</a>
      </div>

      {/* Missed — loss aversion (real closed matches) */}
      {missed.length > 0 && (
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-ink">عطاءات فاتتك</h2>
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
              لو كنت معنا لرأيتها
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">عطاءات أُغلقت مؤخراً وكانت تطابق تصنيفك.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {missed.map((t) => (
              <OppCard key={t.tender_id} t={t} missed />
            ))}
          </div>
        </div>
      )}

      {/* Open now */}
      {topOpen.length > 0 && (
        <div>
          <h2 className="text-xl font-extrabold text-ink">فرص مفتوحة الآن</h2>
          <p className="mt-1 text-sm text-ink-soft">ابدأ بمراجعتها من مركز القيادة.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {topOpen.map((t) => (
              <OppCard key={t.tender_id} t={t} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <a href="/dashboard" className="btn-primary text-base">افتح مركز القيادة ←</a>
            <a href="/pricing" className="ms-3 text-sm font-medium text-ink-muted hover:text-ink">
              اطّلع على الخطط
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

function OppCard({ t, missed }: { t: MatchedTender; missed?: boolean }) {
  const inner = (
    <div
      className={`flex h-full flex-col rounded-2xl border bg-white p-5 shadow-card ${
        missed ? "border-red-100" : "border-line transition hover:-translate-y-0.5 hover:shadow-card-hover"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex flex-col items-center rounded-xl bg-primary-50 px-3 py-2 leading-none">
          <span className="nums text-lg font-extrabold text-primary-700">{scorePct(t.score)}</span>
          <span className="mt-1 text-[9px] font-semibold text-primary-700/70">مطابقة</span>
        </span>
        {t.category && <span className="chip">{t.category}</span>}
      </div>
      <h3 dir="auto" className="mt-3 line-clamp-2 text-sm font-bold leading-snug text-ink">{t.title}</h3>
      {t.entity && <p className="mt-1 truncate text-xs text-ink-muted">{t.entity}</p>}
      <div className="mt-3 flex items-center justify-between text-xs">
        <span dir="auto" className={missed ? "text-red-600" : "text-ink-soft"}>
          ⏱ {deadlineLabel(t.closing_at)}
        </span>
        <span className="text-ink-muted">الكرّاسة {formatJod(t.doc_price_jod)}</span>
      </div>
    </div>
  );
  return missed ? inner : <a href={`/tenders/${t.tender_id}`}>{inner}</a>;
}
