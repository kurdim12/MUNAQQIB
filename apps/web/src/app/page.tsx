import { t } from "@/lib/strings";

export default function Home() {
  return (
    <section className="flex flex-col items-center gap-6 py-16 text-center">
      <h1 className="text-4xl font-bold text-brand">{t.brand}</h1>
      <p className="max-w-2xl text-lg text-slate-600">{t.tagline}</p>
      <div className="flex gap-3">
        <a
          href="/onboarding"
          className="rounded-lg bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-dark"
        >
          {t.onboarding.submit}
        </a>
        <a
          href="/dashboard"
          className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:border-brand hover:text-brand"
        >
          {t.nav.dashboard}
        </a>
      </div>
      <p className="text-sm text-slate-500">{t.onboarding.trialNote}</p>
    </section>
  );
}
