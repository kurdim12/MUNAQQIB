-- ============================================================================
-- MUNAQQIB (منقّب) — Auth.js (NextAuth v5) tables on D1 (DECISIONS.md 2026-06-12).
--
-- Auth provider: Auth.js + Resend passwordless email magic-links, JWT sessions.
-- With the JWT strategy we do NOT need a `sessions` table; the email provider
-- still needs `users` + `verification_token`, and `accounts` is kept so OAuth
-- providers can be added later without another migration.
--
-- Column names mirror the Auth.js standard schema so the D1 REST adapter
-- (src/lib/auth-adapter.ts) maps 1:1. The app's tenancy link is org_members
-- (already in 0001_init.sql): org_members.user_id == users.id.
-- ============================================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                 -- adapter-generated (crypto.randomUUID)
  name TEXT,
  email TEXT UNIQUE,
  emailVerified TEXT,                  -- ISO-8601 UTC; NULL until first magic-link
  image TEXT
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  providerAccountId TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE (provider, providerAccountId)
);

CREATE TABLE IF NOT EXISTS verification_token (
  identifier TEXT NOT NULL,            -- the email being verified
  token TEXT NOT NULL,                 -- single-use magic-link token (hashed)
  expires TEXT NOT NULL,               -- ISO-8601 UTC
  PRIMARY KEY (identifier, token)
);
