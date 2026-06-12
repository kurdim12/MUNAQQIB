import { signInAction } from "./actions";

export default function SignInPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center py-12 text-center animate-fade-up">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-xl font-bold text-white shadow-card">
        م
      </span>
      <h1 className="mt-5 text-2xl font-extrabold text-ink">تسجيل الدخول</h1>
      <p className="mt-2 text-ink-soft">
        أدخل بريدك الإلكتروني وسنرسل لك رابط دخول آمن — بدون كلمة مرور.
      </p>

      <form action={signInAction} className="mt-7 w-full space-y-4 text-right">
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
            placeholder="you@example.com"
            className="w-full rounded-xl border border-line px-4 py-2.5 text-sm transition focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-ink px-4 py-2.5 font-semibold text-white transition hover:bg-ink-soft active:scale-[0.98]"
        >
          إرسال رابط الدخول
        </button>
      </form>

      <p className="mt-5 text-xs text-ink-muted">
        بالمتابعة فإنك توافق على شروط الاستخدام وسياسة الخصوصية.
      </p>
    </section>
  );
}
