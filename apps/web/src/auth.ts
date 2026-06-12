import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";

import { D1Adapter } from "@/lib/auth-adapter";

/**
 * Auth.js (NextAuth v5) — passwordless email magic-links via Resend, JWT sessions,
 * D1-backed via the REST adapter. `trustHost` is on because we deploy on Node/Vercel
 * behind their proxy (not a fixed AUTH_URL host). DECISIONS.md.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: D1Adapter(),
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
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
