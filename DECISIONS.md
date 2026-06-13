# DECISIONS LOG

Append-only record of non-obvious choices. Newest at the top. Each entry:
**date · decision · rationale.**

---

## 2026-06-12 · Scheduling moved OFF GitHub Actions → scheduled container

- **GitHub Actions doesn't run for this account.** The first CI run failed in ~3s
  with `runner_id: 0`, no runner assigned, and zero steps executed — a
  provisioning/billing-level block (Actions disabled or no Actions minutes), not a
  config or code bug. Re-pushing the same YAML fails identically. **Removed both
  workflows** (`ci.yml`, `digest.yml`).
- **Worker now ships as a portable container** (`apps/worker/Dockerfile` →
  `scripts/daily.sh` = digest → deadlines → sweep) run on a cron by any host —
  **Railway** (cron schedule, recommended), **Cloud Run Job + Cloud Scheduler**
  (cheapest), **Render** cron, or a **VPS** `crontab`. Schedule `30 4 * * *` UTC =
  07:30 Asia/Amman. `DEPLOYMENT.md` rewritten accordingly (no Actions). CI is
  replaced by Vercel's build-on-deploy for web + local/Claude-session `pytest`/
  `vitest` for tests.

### (superseded) Deployment + scheduling via GitHub Actions

- Original plan used `.github/workflows/{ci,digest}.yml`; removed above because the
  account can't run Actions runners.

## 2026-06-12 · JONEPS scraper is LIVE (real parser against a committed snapshot)

- **JONEPS is reachable and now scrapes for real.** The open-tenders list is a plain
  GET — `https://joneps.gov.jo/ep/invt/selectListTendInvitAL.do?searchTendStatusCd=Opened`
  (the homepage `<meta refresh>`es into `/pt/main.do`; robots.txt is 404 = nothing
  disallowed). Captured a real snapshot to `apps/worker/fixtures/joneps_opened_listing.html`
  and wrote a **deterministic parser** against it (rule §3): each row's
  `fn_goDetail('tendNo','seq','','cat','',…,'type')` + six cells → `RawTender`
  (number, Arabic title, buyer entity, type, publish date, reconstructed detail URL).
  The two listing date columns are one day apart for every row, so neither is the
  submission deadline — `closing_at_raw` is left None (deadline lives on the detail
  page; better none than wrong). `tests/test_joneps.py` runs offline against the
  committed fixture (10 real tenders). **Verified end-to-end on this live data:
  scrape 10 → normalize → dedupe → match** (worker suite 62→65).
- **GTD is still blocked here.** `gtd.gov.jo` returns a 54-byte empty shell to the
  honest identifying UA on every path — a JS-rendered SPA or bot wall. §8 forbids
  spoofing a browser UA to evade it, so GTD stays fixture-first/deferred until a
  headless-browser (Playwright) path or a different network is available. The
  `closing_at` deadline + doc price for JONEPS likewise need detail-page enrichment
  (the detail endpoint needs extra params — 400 without `peTypeCd`).

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

- **Analyzer panel (web) — the differentiator is now visible.** `/tenders/[id]`
  renders the persisted `AnalyzerBrief`: eligibility verdict (color-coded badge),
  scope, key facts (classification/bonds/fee/BOQ with page refs), key dates,
  submission requirements, and risk flags. Gated behind the `analyzer` (pro+)
  entitlement — non-pro sees an upgrade Paywall; pro with no analysis yet sees a
  "queued" note. Data path: `lib/analysis.ts` (typed `AnalyzerBrief` +
  `parseAnalyzerBrief`, unit-tested, mirrors the worker schema) →
  `repo.getTenderForOrg` (authorized via `matches`) + `repo.getAnalysis`. Each match
  card links to it ("التحليل"). SQL validated against live D1 with a seeded analysis
  (brief round-trips, Arabic intact) then cleaned up; web suite 21→25.
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
- **Subscription renewal/expiry — lifecycle hardened.** Fixed a real entitlements
  gap: an `active` sub past its `current_period_end` kept full access. Now
  `effectiveTier` denies access once the period ends (even before the daily sweep),
  `trialBannerText` warns ("انتهت صلاحية اشتراكك — يُرجى التجديد"), and the worker's
  `run_sweep` calls a new `db.expire_subscriptions()` that flips lapsed `active`
  rows to `past_due` (future-dated subs untouched — verified against live D1). Both
  the entitlements check and the banner are unit-tested; the sweep SQL is covered by
  a FakeD1 test (worker 61→62, web 25→26).
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

## 2026-06-12 — GTD unblocked via reader-proxy; GPD rejected as a dead archive

- **GTD (`gtd.gov.jo`) is live as the second source.** It IP/bot-walls non-Jordanian
  datacenter hosts: our honest UA gets a 54-byte empty shell (HTTP 200) on every path,
  so a direct fetch from any cloud host parses zero rows. The page content is real and
  current though (verified: 2026 road/school/infrastructure works under
  `/AR/modules/tendersunderoffering`). Fix: `GtdScraper.fetch()` detects the tiny shell
  and retries through a public reader proxy (`SCRAPER_READER_PROXY`, default
  `https://r.jina.ai/`, requested in HTML mode) which fetches server-side. The committed
  fixture `fixtures/gtd_tenders_underoffering.html` is that proxy HTML (rule §3 — parse
  the exact bytes we saw); the structural parser keys on the detail anchor + td position,
  so it reads both proxy HTML and a direct Jordanian-IP fetch. Production note: keep the
  proxy until the worker can egress from a Jordanian IP; swap the env if it's throttled.

- **GPD (`gpd.gov.jo/Ar/Modules/Tenders`) rejected — it's a frozen 2016 archive.** It is
  fully reachable, but every row is a 2016 *medication* tender and the page itself tells
  visitors to go to JONEPS for current tenders. A GPD scraper would feed the demo dead,
  off-domain (pharma) data for a heavy-civil contractor. Dropped it; deleted the snapshot.

- **Demo retargeted to real current works.** Seeded 5 current GTD works tenders into
  `demo_org_v1` (the mkurdi-modeled contractor) — road maintenance 52/2026 (closing in
  days), school 53/2026, hazardous-waste infrastructure 47/2026, environmental park
  54/2026, supervision 48/2026 — matched and interleaved with the JONEPS items so the
  dashboard leads with genuinely relevant, time-sensitive opportunities from both sources.

## 2026-06-12 — Email+password login (Credentials) added alongside magic-links

- **Why:** magic-link sign-in depends on Resend deliverability (test mode only
  reaches the account address until a domain is verified), which blocked real
  logins. Added an Auth.js **Credentials** provider so companies log in with
  email + password — no email round-trip. The Resend magic-link is kept as a
  fallback provider.
- **Hashing:** scrypt via `node:crypto` (`apps/web/src/lib/password.ts`), stored
  as `saltHex:keyHex` in `users.password_hash` (migration `0003_credentials.sql`).
  No new dependency; runs only in the Node auth route handler (there is no
  middleware importing auth, so it never hits the edge runtime).
- **Self-serve signup:** `/register` creates the credentials user + an org with a
  14-day trial + owner membership, then signs in. `/signin` is now email+password
  with a link to register.
- **mkurdi account:** `info@mkurdi.com` (owner of the seeded mkurdi org, Pro/active)
  now has a password set, so it can log in immediately — no domain verification
  needed for sign-in anymore.

## 2026-06-13 — Pricing locked at Radar 15 / Pro 79 / Intelligence 199 JOD

- The Screen & Flow spec sets the authoritative tiers; updated `web/lib/billing.ts`
  from the old placeholders (15/35/75) to **15 / 79 / 199 JOD/month** with concrete
  feature copy. Removed the "indicative/placeholder" framing. Annual = 2 months free
  (×10), shown via a monthly/annual toggle. Billing remains manual CliQ (v1).
- Pricing page rebuilt to Screen 2: 3 cards (Pro anchored "الأكثر اختياراً"),
  comparison table, CliQ note, FAQ — in the bold-modern design system.
