import Link from "next/link";

import { registerAction } from "./actions";

const ERRORS: Record<string, string> = {
  invalid: "تحقّق من الحقول — كلمة المرور 8 أحرف على الأقل وبريد صحيح.",
  exists: "هذا البريد مسجّل مسبقاً. سجّل الدخول بدلاً من ذلك.",
  server: "تعذّر إنشاء الحساب، حاول مجدداً.",
};

const SECTORS: { value: string; label: string }[] = [
  { value: "contracting", label: "مقاولات" },
  { value: "supplies", label: "توريدات / لوازم" },
  { value: "consulting", label: "استشارات" },
  { value: "services", label: "خدمات" },
];

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const errCode = (await searchParams)?.error;
  const error = errCode ? ERRORS[errCode] : null;
  return (
    <section className="mx-auto flex max-w-md flex-col items-center py-12 text-center animate-fade-up">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-xl font-bold text-white shadow-card">
        م
      </span>
      <h1 className="mt-5 text-2xl font-extrabold text-ink">أنشئ حساب شركتك</h1>
      <p className="mt-2 text-ink-soft">
        تجربة مجانية 14 يوماً — بدون بطاقة. ابدأ برؤية الفرص التي تخصّك.
      </p>

      {error && (
        <p className="mt-5 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <form action={registerAction} className="mt-7 w-full space-y-4 text-right">
        <div>
          <label htmlFor="company" className="mb-1.5 block text-sm font-medium text-ink-soft">
            اسم الشركة
          </label>
          <input
            id="company"
            name="company"
            type="text"
            required
            placeholder="مثال: شركة الإعمار للمقاولات"
            className="w-full rounded-xl border border-line px-4 py-2.5 text-sm transition focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          />
        </div>
        <div>
          <label htmlFor="sector" className="mb-1.5 block text-sm font-medium text-ink-soft">
            القطاع
          </label>
          <select
            id="sector"
            name="sector"
            required
            defaultValue="contracting"
            className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm transition focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          >
            {SECTORS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-soft">
            البريد الإلكتروني
          </label>
          <input
            id="email"
            name="email"
            type="email"
            dir="ltr"
            required
            autoComplete="email"
            placeholder="you@company.com"
            className="w-full rounded-xl border border-line px-4 py-2.5 text-sm transition focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-soft">
            كلمة المرور
          </label>
          <input
            id="password"
            name="password"
            type="password"
            dir="ltr"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="٨ أحرف على الأقل"
            className="w-full rounded-xl border border-line px-4 py-2.5 text-sm transition focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-ink px-4 py-2.5 font-semibold text-white transition hover:bg-ink-soft active:scale-[0.98]"
        >
          إنشاء الحساب والدخول
        </button>
      </form>

      <p className="mt-5 text-sm text-ink-soft">
        لديك حساب؟{" "}
        <Link href="/signin" className="font-semibold text-ink underline underline-offset-4">
          تسجيل الدخول
        </Link>
      </p>
    </section>
  );
}
