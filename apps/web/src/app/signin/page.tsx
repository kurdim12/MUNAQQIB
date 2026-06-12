import Link from "next/link";

import { passwordSignInAction } from "./actions";

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const hasError = (await searchParams)?.error;
  return (
    <section className="mx-auto flex max-w-md flex-col items-center py-12 text-center animate-fade-up">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-xl font-bold text-white shadow-card">
        م
      </span>
      <h1 className="mt-5 text-2xl font-extrabold text-ink">تسجيل الدخول</h1>
      <p className="mt-2 text-ink-soft">
        أدخل بريدك الإلكتروني وكلمة المرور للدخول إلى حسابك.
      </p>

      {hasError && (
        <p className="mt-5 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
          بيانات الدخول غير صحيحة. تحقّق من البريد وكلمة المرور.
        </p>
      )}

      <form action={passwordSignInAction} className="mt-7 w-full space-y-4 text-right">
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
            placeholder="you@example.com"
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
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full rounded-xl border border-line px-4 py-2.5 text-sm transition focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-ink px-4 py-2.5 font-semibold text-white transition hover:bg-ink-soft active:scale-[0.98]"
        >
          تسجيل الدخول
        </button>
      </form>

      <p className="mt-5 text-sm text-ink-soft">
        لا تملك حساباً؟{" "}
        <Link href="/register" className="font-semibold text-ink underline underline-offset-4">
          أنشئ حساب شركتك
        </Link>
      </p>
      <p className="mt-3 text-xs text-ink-muted">
        بالمتابعة فإنك توافق على شروط الاستخدام وسياسة الخصوصية.
      </p>
    </section>
  );
}
