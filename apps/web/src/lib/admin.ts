/**
 * Platform-admin gate (NOT org roles). MUNAQQIB staff who can confirm CliQ
 * payments are listed in the ADMIN_EMAILS env var (comma-separated). Pure +
 * unit-tested. Returns false when the list is empty or the email is missing.
 */
export function parseAdminEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(
  email: string | null | undefined,
  raw: string | undefined = process.env.ADMIN_EMAILS,
): boolean {
  if (!email) return false;
  return parseAdminEmails(raw).includes(email.trim().toLowerCase());
}
