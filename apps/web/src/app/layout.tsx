import type { Metadata } from "next";
import { Tajawal } from "next/font/google";

import { getSessionSafe } from "@/auth";
import { signOutAction } from "@/app/signin/actions";
import { isAdminEmail } from "@/lib/admin";
import { t } from "@/lib/strings";
import "./globals.css";

// Arabic typeface for the whole RTL UI; exposed to Tailwind as --font-arabic.
const arabic = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${t.brand} — ${t.tagline}`,
  description: t.tagline,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSessionSafe();
  const isAdmin = isAdminEmail(session?.user?.email);

  return (
    <html lang="ar" dir="rtl" className={arabic.variable}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <a href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-dark text-sm font-bold text-white shadow-sm">
                م
              </span>
              <span className="text-lg font-extrabold text-slate-900">{t.brand}</span>
            </a>
            <nav className="flex items-center gap-1 text-sm font-medium text-slate-600">
              <a href="/dashboard" className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-brand">
                {t.nav.dashboard}
              </a>
              <a href="/pricing" className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-brand">
                {t.nav.pricing}
              </a>
              {isAdmin && (
                <a
                  href="/admin"
                  className="rounded-lg px-3 py-2 font-medium text-amber-600 transition hover:bg-amber-50"
                >
                  {t.nav.admin}
                </a>
              )}
              {session?.user ? (
                <form action={signOutAction} className="flex items-center gap-2 ps-2">
                  <span className="hidden text-xs text-slate-400 sm:inline" dir="ltr">
                    {session.user.email}
                  </span>
                  <button
                    type="submit"
                    className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-brand"
                  >
                    {t.nav.signOut}
                  </button>
                </form>
              ) : (
                <a
                  href="/signin"
                  className="ms-1 rounded-lg bg-brand px-4 py-2 font-semibold text-white transition hover:bg-brand-dark"
                >
                  {t.nav.signIn}
                </a>
              )}
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

        <footer className="border-t border-slate-200/70 bg-white/60">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row">
            <span className="font-semibold text-slate-700">{t.brand}</span>
            <span>{t.tagline}</span>
            <span className="text-xs text-slate-400">عطاءات الأردن · {new Date().getFullYear()}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
