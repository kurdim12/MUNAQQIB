import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing for the Credentials provider — scrypt via node:crypto, so
 * there's no native/3rd-party dependency. Runs only in the Node runtime (the
 * auth route handler), never the edge: there is no middleware importing auth.
 *
 * Stored format: "saltHex:keyHex". scrypt defaults (N=16384, r=8, p=1) with a
 * 16-byte random salt and a 64-byte derived key. Verify is constant-time.
 */
const KEYLEN = 64;
const SALT_BYTES = 16;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES);
  const key = scryptSync(password, salt, KEYLEN);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export function verifyPassword(
  password: string,
  stored: string | null | undefined,
): boolean {
  if (!stored || !stored.includes(":")) return false;
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), KEYLEN);
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
