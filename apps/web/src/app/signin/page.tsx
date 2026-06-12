import { signInAction } from "./actions";

export default function SignInPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center py-12 text-center animate-fade-up">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-xl font-bold text-white shadow-card">
        م
      </span>
      <h1 className="mt-5 text-2xl font-extrabold text-slate-900">تسجيل الدخول</h1>
      <p className="mt-2 text-slate-600">
        أدخل بريدك الإلكتروني وسنرسل لك رابط دخول آمن — بدون كلمة مرور.
      </p>

      <form action={signInAction} className="mt-7 w-full space-y-4 text-right">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
            البريد الإلكتروني
          </label>
          <input
            id="email"
            name="email"
            type="email"
            dir="ltr"
            required
            placeholder="you@example.com"
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-brand px-4 py-2.5 font-semibold text-white transition hover:bg-brand-dark active:scale-[0.98]"
        >
          إرسال رابط الدخول
        </button>
      </form>

      <p className="mt-5 text-xs text-slate-400">
        بالمتابعة فإنك توافق على شروط الاستخدام وسياسة الخصوصية.
      </p>
    </section>
  );
}
