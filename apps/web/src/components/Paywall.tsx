/** Shown when the org's subscription doesn't unlock the requested feature. */
export function Paywall({
  title = "هذه الميزة تتطلّب اشتراكاً فعّالاً",
  body = "انتهت تجربتك المجانية. فعّل اشتراكك لمتابعة عرض العطاءات المطابقة لتصنيفك.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="rounded-xl border border-brand/30 bg-brand/5 px-6 py-12 text-center">
      <div className="mx-auto max-w-md">
        <div className="text-3xl">🔒</div>
        <h2 className="mt-3 text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{body}</p>
        <a
          href="/pricing"
          className="mt-5 inline-block rounded-lg bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-dark"
        >
          عرض الخطط والاشتراك
        </a>
      </div>
    </div>
  );
}
