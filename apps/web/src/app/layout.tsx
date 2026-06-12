import type { Metadata } from "next";
import { Amiri, Tajawal } from "next/font/google";

import { getSessionSafe } from "@/auth";
import { signOutAction } from "@/app/signin/actions";
import { isAdminEmail } from "@/lib/admin";
import { t } from "@/lib/strings";
import "./globals.css";

// Body typeface for the RTL UI; exposed to Tailwind as --font-arabic.
const arabic = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-arabic",
  display: "swap",
});

// Editorial Arabic serif for headlines (intelligence-report feel).
const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
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
    <html lang="ar" dir="rtl" className={`${arabic.variable} ${amiri.variable}`}>
      <body className="flex min-h-screen flex-col font-sans text-ink antialiased">
        <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <a href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink font-serif text-base font-bold text-paper">
                م
              </span>
              <span className="font-serif text-xl font-bold text-ink">{t.brand}</span>
            </a>
            <nav className="flex items-center gap-0.5 text-sm font-medium text-ink-soft">
              <a href="/dashboard" className="rounded-md px-3 py-2 transition hover:bg-sand">
                {t.nav.dashboard}
              </a>
              <a href="/intelligence" className="rounded-md px-3 py-2 transition hover:bg-sand">
                {t.nav.intelligence}
              </a>
              <a href="/pricing" className="rounded-md px-3 py-2 transition hover:bg-sand">
                {t.nav.pricing}
              </a>
              {isAdmin && (
                <a
                  href="/admin"
                  className="rounded-md px-3 py-2 font-medium text-amber-700 transition hover:bg-amber-50"
                >
                  {t.nav.admin}
                </a>
              )}
              {session?.user ? (
                <form action={signOutAction} className="flex items-center gap-2 ps-2">
                  <span className="hidden text-xs text-ink-muted sm:inline" dir="ltr">
                    {session.user.email}
                  </span>
                  <button type="submit" className="rounded-md px-3 py-2 transition hover:bg-sand">
                    {t.nav.signOut}
                  </button>
                </form>
              ) : (
                <a href="/signin" className="ms-1 rounded-lg bg-ink px-4 py-2 font-semibold text-paper transition hover:bg-ink-soft">
                  {t.nav.signIn}
                </a>
              )}
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-ink-muted sm:flex-row">
            <span className="font-serif text-base font-bold text-ink">{t.brand}</span>
            <span>منصّة ذكاء الفرص — عطاءات الأردن</span>
            <span className="text-xs">© {new Date().getFullYear()}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
