import "server-only";
import { cookies } from "next/headers";

import type { Subscription, Tier } from "./billing";
import { execute, executeOne, isConfigured } from "./d1";

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
// Current-org resolution (TEMPORARY auth seam — DECISIONS.md)
// Until an auth provider is chosen, the active org is the `org_id` cookie set by
// onboarding, else DEMO_ORG_ID, else the first org in the DB.
// ---------------------------------------------------------------------------
export async function getCurrentOrgId(): Promise<string | null> {
  const cookieOrg = (await cookies()).get("org_id")?.value;
  if (cookieOrg) return cookieOrg;
  if (process.env.DEMO_ORG_ID) return process.env.DEMO_ORG_ID;
  const row = await executeOne<{ id: string }>(
    "SELECT id FROM orgs ORDER BY created_at ASC LIMIT 1",
  );
  return row?.id ?? null;
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
            m.score, m.reasons, m.saved
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

/** Insert an org + a 14-day trial subscription. Returns the new org id. */
export async function createOrgWithTrial(input: CreateOrgInput): Promise<string> {
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
  return org.id;
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
