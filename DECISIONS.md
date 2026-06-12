# DECISIONS LOG

Append-only record of non-obvious choices. Newest at the top. Each entry:
**date · decision · rationale.**

---

## 2026-06-12 · DB moved to Cloudflare D1 (overrides the locked Supabase choice)

- **Owner decision:** the database is on **Cloudflare D1**, not Supabase Postgres.
  This overrides the LOCKED stack item in CLAUDE.md §3. Created D1 database
  **`munaqqib`** (uuid `c296c699-1053-4e95-8d4b-602dca9e18c1`, region EEUR) and
  applied `infra/cloudflare/d1/0001_init.sql` (all 9 app tables + 4 seeded sources,
  round-trip verified). The original Postgres migration is kept at
  `supabase/migrations/0001_init.sql` for reference / possible Hyperdrive use.

- **D1 is SQLite — these Supabase-specific features have no D1 equivalent and were
  re-mapped** (full notes at the top of the D1 migration):
  - `pgvector vector(384)` → embeddings stored as **JSON TEXT**; Phase-0 matching is
    already done in Python (no vector queries), so this is sufficient now. **Phase 1+
    moves vectors to Cloudflare Vectorize** for similarity search at scale.
  - **RLS + Supabase Auth** → none in D1. Multi-tenancy becomes **app-enforced**;
    `org_members.user_id` is an external auth id. Pick an auth provider in Phase 1
    (Cloudflare Access, Clerk, or Supabase Auth used as auth-only).
  - **Supabase Storage** (HTML snapshots, كراسة PDFs) → **Cloudflare R2**.
  - enums → `TEXT` + `CHECK`; `text[]` → JSON TEXT; `timestamptz` → ISO-8601 UTC TEXT;
    `gen_random_uuid()` → `DEFAULT (lower(hex(randomblob(16))))`.

- **Analyzer core built (worker, the Phase-1 differentiator — CLAUDE.md §12.2).**
  `pipeline/analyze.py`: two-pass over the existing hybrid `llm_client` slots —
  **pass 1** (cheap extraction, DeepSeek via OpenRouter) pulls the factual fields;
  **pass 2** (`claude-sonnet-4-6`, Anthropic-direct, the never-downgrade slot)
  decides eligibility (مؤهل / غير مؤهل / يتطلب مراجعة) + Arabic reasoning + risk
  flags + confidence. Output is the existing `AnalyzerBrief` pydantic contract;
  `db.persist_analysis` writes the `analyses` row (result JSON, pages, cost_usd).
  **Cost discipline (CLAUDE.md §7):** inputs are hard-capped (`MAX_DOC_CHARS`/
  `MAX_PASS2_CHARS`), worst-case documented + verified at **~0.049 JOD/doc** (ceiling
  1.0, target ~0.3) using the authoritative Sonnet 4.6 rates ($3/$15 per M); a budget
  guard refuses pass 2 if the running estimate breaches 1.0 JOD. The LLM façade is
  **injected** so the 6 new tests run fully offline (worker suite 55→61). No new deps
  (`pypdf`/`anthropic`/`openai` already present). **Not yet wired:** document fetch
  (gov doc links blocked by the build network — fixture-first, like the scrapers),
  the queue stage, and the web UI panel behind the `analyzer` (pro+) gate.
- **Tier gating (`lib/entitlements.ts`, unit-tested).** `effectiveTier` →
  `can(sub, feature)` over a tier ranking (radar<pro<intelligence). **Deliberate
  product call:** an *active trial* grants FULL (intelligence-level) access so
  prospects try everything before paying; once it ends, access needs an `active`
  paid sub (pending_payment/past_due/cancelled/expired-trial = no access). Wired
  today on the one feature that exists: the dashboard is **paywalled** without access
  (`Paywall` → /pricing), and *saving* is a pro+ feature — gated in the UI (hidden
  ★المحفوظة tab + per-card save button) **and** server-side in `saveMatchAction`
  (defense-in-depth). `analyzer`/`pricing_intel` ranks are pre-defined for when those
  features land. Local dev (no D1) bypasses gating so the UI is always inspectable.
- **Billing loop closed — admin CliQ activation.** Platform admins (emails in the
  new `ADMIN_EMAILS` env, `lib/admin.ts`, unit-tested) get an `/admin` queue of
  `pending_payment` subscriptions (`listPendingSubscriptions`, org + cliq_reference).
  "تفعيل" calls `activateSubscription(orgId, adminUserId)` — a guarded
  `UPDATE ... WHERE status='pending_payment' RETURNING` that flips to `active`, sets
  `current_period_end` (+30d) and `activated_by`; idempotent (a second click hits no
  row). Page + action both re-check `isAdminEmail`; non-admins see "غير مصرّح". SQL
  validated against live D1 and cleaned up. This is platform-admin (env list), not an
  org role. **Remaining billing work:** tier gating by `subscriptions.tier`, renewals/
  expiry, and a real CliQ webhook (still manual confirmation for now).
- **Auth provider DECIDED + implemented: Auth.js (NextAuth v5) + Resend.** Owner
  chose passwordless **email magic-links via Resend** (reuses the existing Resend
  account; no SMS/extra vendor), **JWT sessions**, no vendor lock-in. Auth.js tables
  (`users`/`accounts`/`verification_token`) added in `infra/cloudflare/d1/0002_auth.sql`
  and applied to live D1; tenancy links through the existing `org_members.user_id`.
  Because we run on Node/Vercel (not Workers), a **custom D1 REST adapter**
  (`src/lib/auth-adapter.ts`) implements the user + verification-token methods over
  the same `lib/d1.ts` client (adapter SQL validated against live D1, rows cleaned
  up). `getCurrentOrgId` now resolves the **signed-in user's** org via `org_members`
  (strict — a logged-in user with no org gets `null`, never another tenant's data);
  the cookie/`DEMO_ORG_ID`/first-org seam remains **only** as the fallback when auth
  is unconfigured (`getSessionSafe` returns null with no `AUTH_SECRET`), so
  `next build`/CI/local dev still run secret-free. Onboarding links the new org's
  owner into `org_members`. Sign-in page + sign-out in the nav. New env:
  `AUTH_SECRET`, `AUTH_RESEND_KEY` (falls back to `RESEND_API_KEY`), `AUTH_URL`;
  `trustHost: true`. This **resolves the "auth provider still open" note** above.
- **Phase 1 web app started** (`apps/web`). Stack: **Next.js 15 (App Router) +
  React 19 + TypeScript + Tailwind v3**, Arabic-first RTL (`<html dir="rtl" lang="ar">`,
  Tajawal font). The web app reads/writes **D1 via the same Cloudflare REST API the
  worker uses** (`src/lib/d1.ts` mirrors the Python `d1.py`) rather than a Workers
  binding — this keeps the app deployable on Vercel/Node and reuses the one auth seam.
  Every D1 read degrades to `[]` when unconfigured so `next build`/local dev work with
  no creds. **Auth provider is still undecided**; until it lands, the "current org" is
  resolved from an `org_id` cookie (set by onboarding) → `DEMO_ORG_ID` env → first org
  in the DB. This is a temporary dev seam, flagged in code, to be replaced when auth is
  chosen. First slice: RTL shell, D1 client + typed repo, dashboard reading `matches`,
  and an onboarding wizard writing `orgs` + a 14-day `trial` subscription.
- **Phase 1 web — interactivity + billing surface.** Added match **save/dismiss**
  (server actions on `matches.saved`/`dismissed`, optimistic buttons, All vs
  ★المحفوظة tabs via `?view=saved`); a **trial/subscription banner**
  (`getSubscription` + `lib/billing.ts` countdown with Arabic grammar); and a
  **`/pricing`** page with a **CliQ upgrade-request** flow — `requestUpgrade` flips
  the subscription to `pending_payment` with a generated `cliq_reference`, and the
  page shows CliQ transfer instructions (alias via `CLIQ_ALIAS`). Payment is
  confirmed **manually** (CliQ); an admin later flips `pending_payment → active`,
  which needs the still-undecided auth. **Tier JOD prices in `lib/billing.ts` are
  PLACEHOLDERS** (rendered as إرشادية/قابلة للتغيير) pending the master brief's
  pricing table. New pure logic covered by `billing.test.ts` (12 web tests total).
  `d1.execute` REST seam (`d1.py`), with R2 snapshot storage (`storage.py`, boto3,
  local fallback). Writes: `ensure_org`, `persist_tenders` (upsert-by-hash = the
  cross-run dedupe), `persist_matches`, `log_notification`, `update_source_status`
  (alerts the founder at ≥2 consecutive failures), `sweep_closed_tenders`. The
  orchestrator persists inside `run_digest`; a new `sweep` stage/endpoint runs the
  closing sweep. Every write no-ops when D1 is unconfigured, so the offline pipeline
  and the 55-test suite still pass. The exact repository SQL (ON CONFLICT upserts,
  RETURNING, the match↔tender join, the sweep) was validated against the live D1
  database and the test rows cleaned up. Snapshot IO moved from Supabase Storage to
  R2. **Auth provider for Phase-1 multi-tenancy is still open.**

## 2026-06-12 · Phase 0 bootstrap

- **Scraper selectors deferred to a real fixture (rule §3 honored).** The build
  environment's network policy blocks the government sources: `gtd.gov.jo` returns
  empty 54-byte stub pages and `joneps.gov.jo` returns HTTP 403 to the bot UA. Per
  the hard rule "never invent source-site DOM structure," the source-specific HTML
  parsers in `scrapers/gtd.py` and `scrapers/joneps.py` are **not** hand-written
  against guessed markup. Instead each scraper implements the full fixture-first
  workflow (fetch → snapshot to Storage → parse) with the concrete CSS/row parsing
  left as a clearly-flagged `TODO(fixture)` that must be filled once a real snapshot
  exists under `apps/worker/fixtures/`. The **LLM extraction fallback** (CLAUDE.md §7)
  is wired as the working degradation path so the pipeline produces rows from a saved
  page even before the deterministic parser is written. **Next action when a network
  path to the sources exists:** run `python -m pipeline.scrapers.gtd --snapshot`,
  commit the fixture, write the deterministic parser, add a parser unit test.

- **No robots.txt at either source.** `gtd.gov.jo/robots.txt` (IIS) and
  `joneps.gov.jo/robots.txt` (Apache) both 404 → no crawl directives published. We
  still self-limit to ≤ 1 req/sec/source and send an identifying UA with a contact
  email (CLAUDE.md §14). Re-check robots.txt before each new source is added.

- **Pure-vs-IO split for testability.** Normalization, dedupe hashing, match scoring,
  and digest rendering are pure functions with **no** DB/network imports, so the test
  suite runs offline in CI against `fixtures/`. All Supabase/Resend/Telegram IO lives
  behind thin clients (`db.py`, `pipeline/transports/`) that are only touched by the
  orchestrator and FastAPI endpoints.

- **Embeddings load lazily with graceful degradation.** `pipeline/embed.py` uses
  `sentence-transformers` (`paraphrase-multilingual-MiniLM-L12-v2`, 384-dim) when
  installed; if the model/library is unavailable the matcher drops the embedding term
  and renormalizes the keyword + field weights so Phase 0 still produces matches. This
  keeps CI and first-run light while preserving the locked scoring design.

- **Timestamps stored UTC, rendered Asia/Amman.** Postgres `timestamptz` is UTC; a
  single `util/time.py` helper does Amman formatting for digests/alerts. Avoids
  double-offset bugs. `closing_at` comparisons happen in UTC.

- **`base.py` snapshots every fetch, even on parser success.** Storage is cheap and a
  saved snapshot is what makes "re-snapshot when a scraper breaks" (rule §3) and the
  parser unit tests possible. Anomaly rule: HTTP 200 + zero parsed rows ⇒ increment
  `consecutive_failures`, alert the founder at 2.
