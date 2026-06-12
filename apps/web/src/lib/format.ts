/**
 * Display helpers. All timestamps render in Asia/Amman; all money in JOD
 * (CLAUDE.md §4). Pure functions — unit-tested in format.test.ts.
 */

const AMMAN = "Asia/Amman";
// Arabic month names but Latin digits (…-u-nu-latn) — keeps every number in the
// UI consistent with scores/prices/counts (DECISIONS.md: Latin digits policy).
const AR_LATN = "ar-JO-u-nu-latn";

/** ISO UTC string → "١٢ حزيران ٢٠٢٦…" but in Latin digits, Amman local time. */
export function formatAmman(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(AR_LATN, {
    timeZone: AMMAN,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Date only (no time), Amman. */
export function formatAmmanDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(AR_LATN, {
    timeZone: AMMAN,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/** "YYYY-MM-DD" for a Date as observed in Amman. */
function ammanYmd(d: Date): string {
  // en-CA yields ISO-ordered YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AMMAN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Calendar days from now until `iso` in Amman terms (0 = same day, <0 = past). */
export function daysUntil(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const target = Date.parse(`${ammanYmd(d)}T00:00:00Z`);
  const base = Date.parse(`${ammanYmd(now)}T00:00:00Z`);
  return Math.round((target - base) / (1000 * 60 * 60 * 24));
}

/** "متبقّي 3 أيام" / "أغلق" — Arabic deadline label. */
export function deadlineLabel(iso: string | null | undefined, now: Date = new Date()): string {
  const n = daysUntil(iso, now);
  if (n === null) return "—";
  if (n < 0) return "أُغلق";
  if (n === 0) return "يُغلق اليوم";
  if (n === 1) return "متبقّي يوم واحد";
  if (n === 2) return "متبقّي يومان";
  if (n <= 10) return `متبقّي ${n} أيام`;
  return `متبقّي ${n} يوماً`;
}

/** JOD amount → "50.000 د.أ" (3 decimals, Latin digits, Jordanian convention). */
export function formatJod(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} د.أ`;
}

/** Match score 0..1 → percentage chip text. */
export function scorePct(score: number): string {
  return `${Math.round(score * 100)}%`;
}
