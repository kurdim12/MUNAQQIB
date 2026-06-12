/** Shown when the org's subscription doesn't unlock the requested feature. */
export function Paywall({
  title = "هذه الميزة تتطلّب اشتراكاً فعّالاً",
  body = "انتهت تجربتك المجانية. فعّل اشتراكك لمتابعة عرض العطاءات المطابقة لتصنيفك.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="rounded-2xl border border-brand/20 bg-gradient-to-b from-brand-50/60 to-white px-6 py-14 text-center">
      <div className="mx-auto max-w-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-card">
          🔒
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
        <a
          href="/pricing"
          className="mt-6 inline-block rounded-xl bg-brand px-6 py-2.5 font-semibold text-white transition hover:bg-brand-dark active:scale-[0.98]"
        >
          عرض الخطط والاشتراك
        </a>
      </div>
    </div>
  );
}
