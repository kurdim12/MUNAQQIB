import "server-only";
import { cookies } from "next/headers";

import { getSessionSafe } from "@/auth";
import type { AnalyzerBrief } from "./analysis";
import { parseAnalyzerBrief } from "./analysis";
import type { Subscription, Tier } from "./billing";
import { execute, executeOne, isConfigured } from "./d1";
import {
  canTransition,
  decisionFor,
  type OppStatus,
  outcomeFor,
} from "./opportunity";

export { isConfigured };

// ---------------------------------------------------------------------------
// Types (mirror infra/cloudflare/d1/0001_init.sql)
// ---------------------------------------------------------------------------
export type Sector = "contracting" | "supplies" | "consulting" | "services";

export interface Org {
  id: string;
  name: string;
  sector: Sector;
  classification_fields: string[];
  classification_grade: number | null;
  supply_categories: string[];
  governorates: string[];
  include_keywords: string[];
  exclude_keywords: string[];
  digest_emails: string[];
}

export interface MatchedTender {
  tender_id: string;
  title: string;
  entity: string | null;
  category: string | null;
  governorate: string | null;
  closing_at: string | null;
  doc_price_jod: number | null;
  url: string;
  status: string;
  score: number;
  reasons: Record<string, number>;
  saved: boolean;
  opportunity_status: OppStatus;
}

function jsonArray(value: unknown): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function jsonObject(value: unknown): Record<string, number> {
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Current-org resolution.
// Authenticated path: the signed-in user's org via org_members (strict — a
// logged-in user with no org gets null, never another tenant's data). When auth
// is unconfigured (getSessionSafe -> null), fall back to the dev seam:
// org_id cookie → DEMO_ORG_ID → first org. DECISIONS.md.
// ---------------------------------------------------------------------------
export async function getCurrentOrgId(): Promise<string | null> {
  const session = await getSessionSafe();
  if (session?.user?.id) {
    const row = await executeOne<{ org_id: string }>(
      "SELECT org_id FROM org_members WHERE user_id = ? LIMIT 1",
      [session.user.id],
    );
    return row?.org_id ?? null;
  }

  // --- public/demo seam (no logged-in user) ---
  // Falls back to the seeded demo org so the dashboard opens without login.
  // Set DEMO_ORG_ID to override; logged-in users always see their own org above.
  const cookieOrg = (await cookies()).get("org_id")?.value;
  if (cookieOrg) return cookieOrg;
  return process.env.DEMO_ORG_ID ?? "demo_org_v1";
}

export async function getOrg(orgId: string): Promise<Org | null> {
  const row = await executeOne<Record<string, unknown>>(
    `SELECT id, name, sector, classification_fields, classification_grade,
            supply_categories, governorates, include_keywords, exclude_keywords,
            digest_emails
     FROM orgs WHERE id = ?`,
    [orgId],
  );
  if (!row) return null;
  return {
    id: String(row.id),
    name: String(row.name),
    sector: row.sector as Sector,
    classification_fields: jsonArray(row.classification_fields),
    classification_grade:
      row.classification_grade === null || row.classification_grade === undefined
        ? null
        : Number(row.classification_grade),
    supply_categories: jsonArray(row.supply_categories),
    governorates: jsonArray(row.governorates),
    include_keywords: jsonArray(row.include_keywords),
    exclude_keywords: jsonArray(row.exclude_keywords),
    digest_emails: jsonArray(row.digest_emails),
  };
}

/** Matched, non-dismissed tenders for an org, freshest deadlines first. */
export async function getMatchedTenders(
  orgId: string,
  opts: { savedOnly?: boolean } = {},
): Promise<MatchedTender[]> {
  const savedClause = opts.savedOnly ? "AND m.saved = 1" : "";
  const rows = await execute<Record<string, unknown>>(
    `SELECT t.id AS tender_id, t.title, t.entity, t.category, t.governorate,
            t.closing_at, t.doc_price_jod, t.url, t.status,
            m.score, m.reasons, m.saved, m.opportunity_status
     FROM matches m
     JOIN tenders t ON t.id = m.tender_id
     WHERE m.org_id = ? AND m.dismissed = 0 ${savedClause}
     ORDER BY (t.closing_at IS NULL), t.closing_at ASC, m.score DESC
     LIMIT 200`,
    [orgId],
  );
  return rows.map((r) => ({
    tender_id: String(r.tender_id),
    title: String(r.title),
    entity: r.entity ? String(r.entity) : null,
    category: r.category ? String(r.category) : null,
    governorate: r.governorate ? String(r.governorate) : null,
    closing_at: r.closing_at ? String(r.closing_at) : null,
    doc_price_jod:
      r.doc_price_jod === null || r.doc_price_jod === undefined
        ? null
        : Number(r.doc_price_jod),
    url: String(r.url),
    status: String(r.status),
    score: Number(r.score),
    reasons: jsonObject(r.reasons),
    saved: Boolean(r.saved),
    opportunity_status: (r.opportunity_status as OppStatus) ?? "new",
  }));
}

// ---------------------------------------------------------------------------
// Writes (onboarding)
// ---------------------------------------------------------------------------
export interface CreateOrgInput {
  name: string;
  sector: Sector;
  classification_fields: string[];
  classification_grade: number | null;
  governorates: string[];
  include_keywords: string[];
  exclude_keywords: string[];
  digest_emails: string[];
}

const TRIAL_DAYS = 14;

/**
 * Insert an org + a 14-day trial subscription, and (when a user is signed in)
 * link them as the org owner in org_members. Returns the new org id.
 */
export async function createOrgWithTrial(
  input: CreateOrgInput,
  ownerUserId?: string | null,
): Promise<string> {
  const org = await executeOne<{ id: string }>(
    `INSERT INTO orgs (name, sector, classification_fields, classification_grade,
                       governorates, include_keywords, exclude_keywords, digest_emails)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`,
    [
      input.name,
      input.sector,
      JSON.stringify(input.classification_fields),
      input.classification_grade,
      JSON.stringify(input.governorates),
      JSON.stringify(input.include_keywords),
      JSON.stringify(input.exclude_keywords),
      JSON.stringify(input.digest_emails),
    ],
  );
  if (!org) {
    throw new Error("D1 not configured: cannot create org");
  }
  const trialEnds = new Date(
    Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  await execute(
    `INSERT INTO subscriptions (org_id, tier, status, trial_ends_at)
     VALUES (?, 'trial', 'trial', ?)`,
    [org.id, trialEnds],
  );
  if (ownerUserId) {
    await execute(
      `INSERT INTO org_members (org_id, user_id, role) VALUES (?, ?, 'owner')
       ON CONFLICT(org_id, user_id) DO NOTHING`,
      [org.id, ownerUserId],
    );
  }
  return org.id;
}

/** True if a user already exists with this email (case-insensitive). */
export async function emailExists(email: string): Promise<boolean> {
  const row = await executeOne<{ x: number }>(
    `SELECT 1 AS x FROM users WHERE lower(email) = lower(?) LIMIT 1`,
    [email],
  );
  return Boolean(row);
}

/** Create a credentials user (email + scrypt password hash). Returns the new id. */
export async function createCredentialUser(
  email: string,
  passwordHash: string,
  name: string | null,
): Promise<string> {
  const id = crypto.randomUUID();
  await execute(
    `INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`,
    [id, name, email.toLowerCase(), passwordHash],
  );
  return id;
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------
/** Newest subscription row for an org (or null). */
export async function getSubscription(orgId: string): Promise<Subscription | null> {
  const row = await executeOne<Record<string, unknown>>(
    `SELECT tier, status, trial_ends_at, current_period_end, cliq_reference
     FROM subscriptions WHERE org_id = ? ORDER BY created_at DESC LIMIT 1`,
    [orgId],
  );
  if (!row) return null;
  return {
    tier: row.tier as Tier,
    status: row.status as Subscription["status"],
    trial_ends_at: row.trial_ends_at ? String(row.trial_ends_at) : null,
    current_period_end: row.current_period_end ? String(row.current_period_end) : null,
    cliq_reference: row.cliq_reference ? String(row.cliq_reference) : null,
  };
}

/**
 * Record an upgrade request: set the chosen tier and flip status to
 * pending_payment (CliQ is confirmed manually — schema's cliq_reference /
 * activated_by). An admin later flips it to active once payment clears.
 */
export async function requestUpgrade(
  orgId: string,
  tier: Tier,
  cliqReference: string,
): Promise<void> {
  await execute(
    `UPDATE subscriptions SET tier = ?, status = 'pending_payment', cliq_reference = ?
     WHERE org_id = ?`,
    [tier, cliqReference, orgId],
  );
}

export interface PendingSub {
  org_id: string;
  org_name: string;
  tier: Tier;
  cliq_reference: string | null;
  digest_emails: string[];
  requested_at: string;
}

/** Subscriptions awaiting CliQ confirmation, oldest first (admin queue). */
export async function listPendingSubscriptions(): Promise<PendingSub[]> {
  const rows = await execute<Record<string, unknown>>(
    `SELECT s.org_id, o.name AS org_name, s.tier, s.cliq_reference,
            o.digest_emails, s.created_at AS requested_at
     FROM subscriptions s JOIN orgs o ON o.id = s.org_id
     WHERE s.status = 'pending_payment'
     ORDER BY s.created_at ASC`,
  );
  return rows.map((r) => ({
    org_id: String(r.org_id),
    org_name: String(r.org_name),
    tier: r.tier as Tier,
    cliq_reference: r.cliq_reference ? String(r.cliq_reference) : null,
    digest_emails: jsonArray(r.digest_emails),
    requested_at: String(r.requested_at),
  }));
}

/**
 * Confirm a CliQ payment: activate the subscription for one month and stamp the
 * admin who did it. Guarded to pending_payment so it can't reactivate a cancelled
 * row. Returns true when a row was actually activated.
 */
export async function activateSubscription(
  orgId: string,
  adminUserId: string,
): Promise<boolean> {
  const periodEnd = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const row = await executeOne<{ org_id: string }>(
    `UPDATE subscriptions
     SET status = 'active', current_period_end = ?, activated_by = ?
     WHERE org_id = ? AND status = 'pending_payment'
     RETURNING org_id`,
    [periodEnd, adminUserId, orgId],
  );
  return row != null;
}

// ---------------------------------------------------------------------------
// Analyzer (Phase 1) — read the persisted AnalyzerBrief for a tender
// ---------------------------------------------------------------------------
export interface TenderBasics {
  tender_id: string;
  title: string;
  entity: string | null;
  category: string | null;
  url: string;
  closing_at: string | null;
  doc_price_jod: number | null;
  score: number;
  reasons: Record<string, number>;
  opportunity_status: OppStatus;
}

export interface TenderAnalysis {
  brief: AnalyzerBrief;
  pages: number | null;
  cost_usd: number | null;
  created_at: string;
}

/** A tender the org actually matched (non-dismissed) — authorization + header. */
export async function getTenderForOrg(
  orgId: string,
  tenderId: string,
): Promise<TenderBasics | null> {
  const row = await executeOne<Record<string, unknown>>(
    `SELECT t.id AS tender_id, t.title, t.entity, t.category, t.url, t.closing_at,
            t.doc_price_jod, m.score, m.reasons, m.opportunity_status
     FROM tenders t JOIN matches m ON m.tender_id = t.id
     WHERE m.org_id = ? AND t.id = ? AND m.dismissed = 0
     LIMIT 1`,
    [orgId, tenderId],
  );
  if (!row) return null;
  return {
    tender_id: String(row.tender_id),
    title: String(row.title),
    entity: row.entity ? String(row.entity) : null,
    category: row.category ? String(row.category) : null,
    url: String(row.url),
    closing_at: row.closing_at ? String(row.closing_at) : null,
    doc_price_jod: row.doc_price_jod != null ? Number(row.doc_price_jod) : null,
    score: row.score != null ? Number(row.score) : 0,
    reasons: jsonObject(row.reasons),
    opportunity_status: (row.opportunity_status as OppStatus) ?? "new",
  };
}

// ---------------------------------------------------------------------------
// Layer 2 — opportunity lifecycle (transition + event log)
// ---------------------------------------------------------------------------
export interface OpportunityEvent {
  from_status: string | null;
  to_status: string;
  at: string;
}

/** Current opportunity_status for (org, tender), or null if not a match. */
export async function getOpportunityStatus(
  orgId: string,
  tenderId: string,
): Promise<OppStatus | null> {
  const row = await executeOne<{ s: string }>(
    `SELECT opportunity_status AS s FROM matches WHERE org_id = ? AND tender_id = ?`,
    [orgId, tenderId],
  );
  return row ? ((row.s as OppStatus) ?? "new") : null;
}

/** Move an opportunity to `to` if the transition is legal. Persists the new
 *  state (+ decision/outcome/timestamps), keeps saved/dismissed in sync for the
 *  current surfaces, and appends an immutable event. Returns the applied status
 *  (or the unchanged current one when the move is illegal / not a match). */
export async function transitionOpportunity(
  orgId: string,
  tenderId: string,
  to: OppStatus,
): Promise<OppStatus | null> {
  const from = await getOpportunityStatus(orgId, tenderId);
  if (from === null) return null;
  if (from === to || !canTransition(from, to)) return from;

  const now = new Date().toISOString();
  const decision = decisionFor(to);
  const outcome = outcomeFor(to);
  // Keep the legacy flags coherent: pass hides it, anything else un-hides; saved
  // marks it as in the user's active pipeline (review onward).
  const dismissed = to === "pass" ? 1 : 0;
  const saved = to === "pass" || to === "new" ? 0 : 1;

  await execute(
    `UPDATE matches
       SET opportunity_status = ?, status_changed_at = ?,
           decision = COALESCE(?, decision),
           outcome = COALESCE(?, outcome),
           decided_at = CASE WHEN ? IS NOT NULL THEN ? ELSE decided_at END,
           dismissed = ?, saved = ?
     WHERE org_id = ? AND tender_id = ?`,
    [to, now, decision, outcome, decision, now, dismissed, saved, orgId, tenderId],
  );
  await execute(
    `INSERT INTO opportunity_events (org_id, tender_id, from_status, to_status, at)
     VALUES (?, ?, ?, ?, ?)`,
    [orgId, tenderId, from, to, now],
  );
  return to;
}

/** The transition history for (org, tender), newest first. */
export async function getOpportunityEvents(
  orgId: string,
  tenderId: string,
): Promise<OpportunityEvent[]> {
  const rows = await execute<Record<string, unknown>>(
    `SELECT from_status, to_status, at FROM opportunity_events
     WHERE org_id = ? AND tender_id = ? ORDER BY at DESC LIMIT 50`,
    [orgId, tenderId],
  );
  return rows.map((r) => ({
    from_status: r.from_status ? String(r.from_status) : null,
    to_status: String(r.to_status),
    at: String(r.at),
  }));
}

/** Latest completed analysis for (org, tender), or null. */
export async function getAnalysis(
  orgId: string,
  tenderId: string,
): Promise<TenderAnalysis | null> {
  const row = await executeOne<Record<string, unknown>>(
    `SELECT result, pages, cost_usd, created_at FROM analyses
     WHERE org_id = ? AND tender_id = ? AND status = 'done'
     ORDER BY created_at DESC LIMIT 1`,
    [orgId, tenderId],
  );
  const brief = row ? parseAnalyzerBrief(row.result as string) : null;
  if (!row || !brief) return null;
  return {
    brief,
    pages: row.pages != null ? Number(row.pages) : null,
    cost_usd: row.cost_usd != null ? Number(row.cost_usd) : null,
    created_at: String(row.created_at),
  };
}

// ---------------------------------------------------------------------------
// Layer 11 — analyzer producer (enqueue a document-intelligence job)
// ---------------------------------------------------------------------------
/** Queue an analysis for (org, tender) unless one is already queued/done. The
 *  worker's analyze stage picks up status='queued' rows. */
export async function enqueueAnalysis(orgId: string, tenderId: string): Promise<void> {
  const existing = await executeOne<{ x: number }>(
    `SELECT 1 AS x FROM analyses
     WHERE org_id = ? AND tender_id = ? AND status IN ('queued', 'done') LIMIT 1`,
    [orgId, tenderId],
  );
  if (existing) return;
  await execute(
    `INSERT INTO analyses (org_id, tender_id, file_path, status)
     VALUES (?, ?, 'pending', 'queued')`,
    [orgId, tenderId],
  );
}

/** L4 — queue an analysis from an uploaded كرّاسة's extracted text. Supersedes
 *  any prior queued row for (org, tender) so a re-upload re-analyzes. The worker
 *  analyze stage consumes doc_text directly (no URL fetch). */
export async function enqueueAnalysisWithText(
  orgId: string,
  tenderId: string,
  docText: string,
  fileName: string,
): Promise<void> {
  await execute(
    `DELETE FROM analyses WHERE org_id = ? AND tender_id = ? AND status = 'queued'`,
    [orgId, tenderId],
  );
  await execute(
    `INSERT INTO analyses (org_id, tender_id, file_path, status, doc_text)
     VALUES (?, ?, ?, 'queued', ?)`,
    [orgId, tenderId, fileName, docText],
  );
}

/** Status of the most recent analysis row for (org, tender): queued | done |
 *  failed | none — drives the war-room/upload UI states. */
export async function getAnalysisState(
  orgId: string,
  tenderId: string,
): Promise<"queued" | "done" | "failed" | "none"> {
  const row = await executeOne<{ status: string }>(
    `SELECT status FROM analyses WHERE org_id = ? AND tender_id = ?
     ORDER BY created_at DESC LIMIT 1`,
    [orgId, tenderId],
  );
  const s = row?.status;
  return s === "queued" || s === "done" || s === "failed" ? s : "none";
}

// ---------------------------------------------------------------------------
// Layer 10 — watchlist (saved opportunities the system monitors)
// ---------------------------------------------------------------------------
export interface WatchItem {
  tender_id: string;
  title: string;
  entity: string | null;
  category: string | null;
  closing_at: string | null;
  status: string; // open | closed | awarded
  opportunity_status: OppStatus; // bid | tracking
  doc_price_jod: number | null;
  score: number;
  has_analysis: boolean;
}

/** Saved (watched) opportunities for an org, soonest deadline first. The worker's
 *  daily sweep keeps `status`/`closing_at` current, so this reflects live state. */
export async function getWatchlist(orgId: string): Promise<WatchItem[]> {
  // Window 4 — the in-flight slice only: submitted (bid) + tracking. Pre-decision
  // items live on the dashboard (Window 2); the windows never overlap.
  const rows = await execute<Record<string, unknown>>(
    `SELECT t.id AS tender_id, t.title, t.entity, t.category, t.closing_at,
            t.status, t.doc_price_jod, m.score, m.opportunity_status,
            (SELECT 1 FROM analyses a
             WHERE a.org_id = m.org_id AND a.tender_id = t.id AND a.status = 'done'
             LIMIT 1) AS has_analysis
     FROM matches m JOIN tenders t ON t.id = m.tender_id
     WHERE m.org_id = ? AND m.opportunity_status IN ('bid','tracking')
     ORDER BY (t.closing_at IS NULL), t.closing_at ASC`,
    [orgId],
  );
  return rows.map((r) => ({
    tender_id: String(r.tender_id),
    title: String(r.title),
    entity: r.entity ? String(r.entity) : null,
    category: r.category ? String(r.category) : null,
    closing_at: r.closing_at ? String(r.closing_at) : null,
    status: String(r.status ?? "open"),
    opportunity_status: (r.opportunity_status as OppStatus) ?? "bid",
    doc_price_jod: r.doc_price_jod != null ? Number(r.doc_price_jod) : null,
    score: r.score != null ? Number(r.score) : 0,
    has_analysis: Number(r.has_analysis ?? 0) === 1,
  }));
}

// ---------------------------------------------------------------------------
// Layer 13 — learning signals (per-category save/dismiss behavior)
// ---------------------------------------------------------------------------
export interface CategoryAffinityRow {
  category: string;
  saved: number;
  dismissed: number;
  total: number;
}

export async function getCategoryAffinity(orgId: string): Promise<CategoryAffinityRow[]> {
  const rows = await execute<Record<string, unknown>>(
    `SELECT t.category AS category,
            SUM(CASE WHEN m.saved = 1 THEN 1 ELSE 0 END) AS saved,
            SUM(CASE WHEN m.dismissed = 1 THEN 1 ELSE 0 END) AS dismissed,
            COUNT(*) AS total
     FROM matches m JOIN tenders t ON t.id = m.tender_id
     WHERE m.org_id = ? AND t.category IS NOT NULL
     GROUP BY t.category`,
    [orgId],
  );
  return rows.map((r) => ({
    category: String(r.category),
    saved: Number(r.saved ?? 0),
    dismissed: Number(r.dismissed ?? 0),
    total: Number(r.total ?? 0),
  }));
}

// ---------------------------------------------------------------------------
// Layer 1 — source health (operator monitoring)
// ---------------------------------------------------------------------------
export interface SourceHealth {
  id: string;
  base_url: string | null;
  enabled: boolean;
  last_run_at: string | null;
  last_ok_at: string | null;
  consecutive_failures: number;
}

export async function getSources(): Promise<SourceHealth[]> {
  const rows = await execute<Record<string, unknown>>(
    `SELECT id, base_url, enabled, last_run_at, last_ok_at, consecutive_failures
     FROM sources ORDER BY id`,
  );
  return rows.map((r) => ({
    id: String(r.id),
    base_url: r.base_url ? String(r.base_url) : null,
    enabled: Number(r.enabled) === 1,
    last_run_at: r.last_run_at ? String(r.last_run_at) : null,
    last_ok_at: r.last_ok_at ? String(r.last_ok_at) : null,
    consecutive_failures: Number(r.consecutive_failures ?? 0),
  }));
}

// ---------------------------------------------------------------------------
// Match actions (save / dismiss)
// ---------------------------------------------------------------------------
export async function setMatchSaved(
  orgId: string,
  tenderId: string,
  saved: boolean,
): Promise<void> {
  await execute(`UPDATE matches SET saved = ? WHERE org_id = ? AND tender_id = ?`, [
    saved ? 1 : 0,
    orgId,
    tenderId,
  ]);
}

export async function setMatchDismissed(
  orgId: string,
  tenderId: string,
): Promise<void> {
  await execute(
    `UPDATE matches SET dismissed = 1 WHERE org_id = ? AND tender_id = ?`,
    [orgId, tenderId],
  );
}
