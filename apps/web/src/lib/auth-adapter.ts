import "server-only";
import type { Adapter, AdapterUser, VerificationToken } from "next-auth/adapters";

import { execute, executeOne } from "./d1";

/**
 * Auth.js Adapter backed by the D1 REST client (the same one the app + worker use).
 *
 * We run on Node/Vercel, not the Workers runtime, so the official @auth/d1-adapter
 * (which needs a D1Database binding) doesn't fit — this talks to D1 over HTTPS.
 *
 * Scope: only what the Resend email provider + JWT session strategy actually call —
 * users, accounts (kept for future OAuth), and verification tokens. No `sessions`
 * methods (JWT sessions live in the cookie, not the DB).
 */

function toUser(row: Record<string, unknown> | null): AdapterUser | null {
  if (!row) return null;
  return {
    id: String(row.id),
    name: (row.name as string) ?? null,
    email: String(row.email),
    emailVerified: row.emailVerified ? new Date(String(row.emailVerified)) : null,
    image: (row.image as string) ?? null,
  };
}

export function D1Adapter(): Adapter {
  return {
    async createUser(user) {
      const id = user.id ?? crypto.randomUUID();
      await execute(
        `INSERT INTO users (id, name, email, emailVerified, image) VALUES (?, ?, ?, ?, ?)`,
        [
          id,
          user.name ?? null,
          user.email,
          user.emailVerified ? user.emailVerified.toISOString() : null,
          user.image ?? null,
        ],
      );
      return { ...user, id };
    },

    async getUser(id) {
      return toUser(
        await executeOne(`SELECT * FROM users WHERE id = ?`, [id]),
      );
    },

    async getUserByEmail(email) {
      return toUser(
        await executeOne(`SELECT * FROM users WHERE email = ?`, [email]),
      );
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const row = await executeOne<Record<string, unknown>>(
        `SELECT u.* FROM users u
         JOIN accounts a ON a.userId = u.id
         WHERE a.provider = ? AND a.providerAccountId = ?`,
        [provider, providerAccountId],
      );
      return toUser(row);
    },

    async updateUser(user) {
      const existing = await executeOne<Record<string, unknown>>(
        `SELECT * FROM users WHERE id = ?`,
        [user.id],
      );
      const merged = { ...existing, ...user };
      await execute(
        `UPDATE users SET name = ?, email = ?, emailVerified = ?, image = ? WHERE id = ?`,
        [
          (merged.name as string) ?? null,
          (merged.email as string) ?? null,
          merged.emailVerified ? new Date(merged.emailVerified).toISOString() : null,
          (merged.image as string) ?? null,
          user.id,
        ],
      );
      return toUser(merged)!;
    },

    async linkAccount(account) {
      await execute(
        `INSERT INTO accounts
           (id, userId, type, provider, providerAccountId, refresh_token,
            access_token, expires_at, token_type, scope, id_token, session_state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          account.userId,
          account.type,
          account.provider,
          account.providerAccountId,
          account.refresh_token ?? null,
          account.access_token ?? null,
          account.expires_at ?? null,
          account.token_type ?? null,
          account.scope ?? null,
          account.id_token ?? null,
          (account.session_state as string) ?? null,
        ],
      );
      return account;
    },

    async createVerificationToken(token) {
      await execute(
        `INSERT INTO verification_token (identifier, token, expires) VALUES (?, ?, ?)`,
        [token.identifier, token.token, token.expires.toISOString()],
      );
      return token;
    },

    async useVerificationToken({ identifier, token }) {
      const row = await executeOne<Record<string, unknown>>(
        `SELECT identifier, token, expires FROM verification_token
         WHERE identifier = ? AND token = ?`,
        [identifier, token],
      );
      if (!row) return null;
      await execute(
        `DELETE FROM verification_token WHERE identifier = ? AND token = ?`,
        [identifier, token],
      );
      return {
        identifier: String(row.identifier),
        token: String(row.token),
        expires: new Date(String(row.expires)),
      } satisfies VerificationToken;
    },
  };
}
