import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";

import { D1Adapter } from "@/lib/auth-adapter";
import { executeOne } from "@/lib/d1";
import { verifyPassword } from "@/lib/password";

/**
 * Auth.js (NextAuth v5) — email+password (Credentials) as the primary login,
 * with the passwordless Resend magic-link kept as a fallback. JWT sessions,
 * D1-backed via the REST adapter. `trustHost` is on because we deploy on
 * Node/Railway behind a proxy (not a fixed AUTH_URL host). DECISIONS.md.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: D1Adapter(),
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;
        const row = await executeOne<{
          id: string;
          name: string | null;
          email: string;
          password_hash: string | null;
        }>(`SELECT id, name, email, password_hash FROM users WHERE email = ?`, [
          email,
        ]);
        if (!row || !verifyPassword(password, row.password_hash)) return null;
        return { id: String(row.id), email: row.email, name: row.name ?? null };
      },
    }),
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY ?? process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) session.user.id = token.uid as string;
      return session;
    },
  },
});

/**
 * Session lookup that never throws — returns null when auth is unconfigured
 * (no AUTH_SECRET) so local dev, `next build`, and CI render without secrets.
 */
export async function getSessionSafe() {
  if (!process.env.AUTH_SECRET) return null;
  try {
    return await auth();
  } catch {
    return null;
  }
}
