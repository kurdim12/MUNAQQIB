import { signInAction } from "./actions";

export default function SignInPage() {
  return (
    <section className="mx-auto max-w-md py-10">
      <h1 className="text-2xl font-bold text-slate-900">تسجيل الدخول</h1>
      <p className="mt-1 text-slate-600">
        أدخل بريدك الإلكتروني وسنرسل لك رابط دخول آمن — بدون كلمة مرور.
      </p>

      <form action={signInAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
            البريد الإلكتروني
          </label>
          <input
            id="email"
            name="email"
            type="email"
            dir="ltr"
            required
            placeholder="you@example.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark"
        >
          إرسال رابط الدخول
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-400">
        بالمتابعة فإنك توافق على شروط الاستخدام وسياسة الخصوصية.
      </p>
    </section>
  );
}
