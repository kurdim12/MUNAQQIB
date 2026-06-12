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
      <body className="min-h-screen font-sans antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <a href="/" className="text-xl font-bold text-brand">
              {t.brand}
            </a>
            <nav className="flex items-center gap-4 text-sm text-slate-600">
              <a href="/dashboard" className="hover:text-brand">
                {t.nav.dashboard}
              </a>
              <a href="/pricing" className="hover:text-brand">
                {t.nav.pricing}
              </a>
              {isAdmin && (
                <a href="/admin" className="font-medium text-amber-600 hover:text-amber-700">
                  {t.nav.admin}
                </a>
              )}
              {session?.user ? (
                <form action={signOutAction} className="flex items-center gap-2">
                  <span className="hidden text-xs text-slate-400 sm:inline" dir="ltr">
                    {session.user.email}
                  </span>
                  <button type="submit" className="hover:text-brand">
                    {t.nav.signOut}
                  </button>
                </form>
              ) : (
                <a href="/signin" className="font-medium text-brand hover:text-brand-dark">
                  {t.nav.signIn}
                </a>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
