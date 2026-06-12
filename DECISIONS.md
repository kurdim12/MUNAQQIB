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
