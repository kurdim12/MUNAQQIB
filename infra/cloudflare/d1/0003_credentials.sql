-- ============================================================================
-- MUNAQQIB (منقّب) — credentials login (email + password) on D1.
--
-- Adds a password hash to users so the app supports email+password sign-in
-- (Auth.js Credentials provider) alongside the existing magic-link provider.
-- The hash is scrypt (node:crypto), stored as "saltHex:keyHex" — see
-- apps/web/src/lib/password.ts. NULL = this user can only use magic-links.
-- ============================================================================

ALTER TABLE users ADD COLUMN password_hash TEXT;
