import type { DefaultSession } from "next-auth";

// Surface the D1 user id on the session + JWT (set in auth.ts callbacks).
declare module "next-auth" {
  interface Session {
    user: { id?: string } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
  }
}
