import "server-only";

/**
 * Cloudflare D1 over the REST API — the TypeScript twin of the worker's `d1.py`.
 *
 * The web app deploys on Node/Vercel, not the Workers runtime, so it talks to D1
 * over HTTPS with the same account/token/database env the worker uses. Every call
 * funnels through `execute()`; when D1 is unconfigured it returns `[]` so
 * `next build` and local dev render an empty (not crashing) UI.
 */

const API_BASE = "https://api.cloudflare.com/client/v4";

function config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const databaseId = process.env.D1_DATABASE_ID;
  if (!accountId || !token || !databaseId) return null;
  return { accountId, token, databaseId };
}

export function isConfigured(): boolean {
  return config() !== null;
}

type Primitive = string | number | null;

export async function execute<T = Record<string, unknown>>(
  sql: string,
  params: Primitive[] = [],
): Promise<T[]> {
  const cfg = config();
  if (!cfg) return [];

  const res = await fetch(
    `${API_BASE}/accounts/${cfg.accountId}/d1/database/${cfg.databaseId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
      // D1 data changes per pipeline run; never serve stale cached reads.
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error(`D1 HTTP ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as {
    success: boolean;
    errors?: unknown;
    result?: Array<{ results?: T[] }>;
  };
  if (!body.success) {
    throw new Error(`D1 query failed: ${JSON.stringify(body.errors)}`);
  }
  return body.result?.[0]?.results ?? [];
}

/** Run a write and return the first RETURNING row (or null). */
export async function executeOne<T = Record<string, unknown>>(
  sql: string,
  params: Primitive[] = [],
): Promise<T | null> {
  const rows = await execute<T>(sql, params);
  return rows[0] ?? null;
}
