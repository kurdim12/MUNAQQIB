/** Shown when the org's subscription doesn't unlock the requested feature. */
export function Paywall({
  title = "هذه الميزة تتطلّب اشتراكاً فعّالاً",
  body = "انتهت تجربتك المجانية. فعّل اشتراكك لمتابعة عرض العطاءات المطابقة لتصنيفك.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-gradient-to-b from-sand/40 to-white px-6 py-14 text-center">
      <div className="mx-auto max-w-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-card">
          🔒
        </div>
        <h2 className="mt-4 text-lg font-bold text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
        <a
          href="/pricing"
          className="mt-6 inline-block rounded-xl bg-ink px-6 py-2.5 font-semibold text-white transition hover:bg-ink-soft active:scale-[0.98]"
        >
          عرض الخطط والاشتراك
        </a>
      </div>
    </div>
  );
}
