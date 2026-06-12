# Deployment & Operations — MUNAQQIB (منقّب)

How to take this repo from "tested in CI" to "running in production." Two
deployables, plus the managed services they talk to.

```
┌─────────────┐   magic-link login, dashboard, analyzer, billing
│  apps/web   │   Next.js 15 → Vercel (serverless)
└──────┬──────┘
       │  reads/writes (D1 REST)
┌──────▼──────┐   D1 (DB) · R2 (snapshots + كراسات) · Resend (email) · Telegram
│ Cloudflare  │
└──────▲──────┘
       │  scrape → match → digest → notify (daily 07:30 Amman)
┌──────┴──────┐
│ apps/worker │   Python → GitHub Actions cron (.github/workflows/digest.yml)
└─────────────┘
```

CI (`.github/workflows/ci.yml`) runs lint + typecheck + tests + build on every
push — no secrets required.

---

## 1. Managed services (one-time)

| Service | What | Notes |
|---|---|---|
| **Cloudflare D1** | The database | Already created: `munaqqib` (`D1_DATABASE_ID=c296c699-…`, region EEUR). Schema applied from `infra/cloudflare/d1/0001_init.sql` + `0002_auth.sql`. To re-provision elsewhere, run both SQL files. |
| **Cloudflare R2** | HTML snapshots + uploaded كراسات | Create bucket `munaqqib-snapshots`; mint an S3 access key pair; note the endpoint `https://<account>.r2.cloudflarestorage.com`. |
| **Resend** | Email (digest + auth magic-links) | Verify your sending domain; create an API key. Set `EMAIL_FROM` to a verified address. |
| **Telegram** | Deadline alerts + scraper-failure alerts to the founder | Create a bot via @BotFather → `TELEGRAM_BOT_TOKEN`; get your chat id → `ALERT_TELEGRAM_CHAT_ID`. |
| **Anthropic + OpenRouter** | Analyzer (pass-2 sonnet) + cheap slots | API keys. Budget is bounded to <1 JOD/doc in code. |

A single Cloudflare API token scoped to **D1 (read/write)** and **R2** covers
`CLOUDFLARE_API_TOKEN`.

---

## 2. Secrets

The full set lives in `.env.example`. They go in two places:

- **Vercel → Project → Settings → Environment Variables** (the web app): at
  minimum `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `D1_DATABASE_ID`,
  `AUTH_SECRET` (`openssl rand -base64 32`), `AUTH_RESEND_KEY` (or `RESEND_API_KEY`),
  `EMAIL_FROM`, `ADMIN_EMAILS`, `CLIQ_ALIAS`. Without `AUTH_SECRET` the app runs
  in the dev seam (no login) — **set it in production.**
- **GitHub → repo → Settings → Secrets and variables → Actions** (the worker
  cron): every var referenced in `.github/workflows/digest.yml` — the Cloudflare,
  R2, LLM, Resend, and Telegram secrets.

Never commit a real `.env`.

---

## 3. Deploy the web app (Vercel)

1. Import the repo in Vercel.
2. **Root Directory → `apps/web`** (monorepo). Framework auto-detects as Next.js.
3. Add the env vars from §2.
4. Deploy. Set `PUBLIC_BASE_URL` / `AUTH_URL` to the resulting domain.
5. Confirm `/signin` sends a magic-link and `/dashboard` loads.

`/admin` (CliQ activation) is gated to the emails in `ADMIN_EMAILS`.

---

## 4. Schedule the worker (GitHub Actions)

`.github/workflows/digest.yml` already runs **07:30 Asia/Amman** (04:30 UTC —
Jordan is permanently UTC+3). After adding the Actions secrets (§2):

1. Enable Actions for the repo.
2. Trigger the **first run by hand**: Actions → *Daily digest* → *Run workflow*.
3. Watch the logs: it scrapes JONEPS (live), matches against
   `apps/worker/partner_profile.yaml`, emails the digest, fires Telegram deadline
   alerts, then runs the housekeeping sweep.

> The cron job installs the full `requirements.txt` (embeddings + analyzer; torch
> is heavy). For higher cadence or scale, move the worker to a container host
> (Cloud Run / Railway / Fly) and keep this workflow as the scheduler trigger.

---

## 5. Known gaps before the Phase-0 acceptance gate

- **GTD source is not live.** `gtd.gov.jo` serves an empty shell to the honest
  identifying UA (§8 forbids spoofing a browser to evade it). It needs a headless
  browser (Playwright) path. **JONEPS is live and scraping for real.**
- **JONEPS closing date + doc price** need detail-page enrichment (the listing only
  has the publish date); until then deadline alerts won't fire for JONEPS tenders.
- **Tier prices** in `apps/web/src/lib/billing.ts` are placeholders pending the
  master brief.
- **CliQ** activation is manual by design (admin confirms at `/admin`).

The gate (`CLAUDE.md` Phase 0): 3 consecutive days where the design partner
confirms zero relevant tenders missed and ≥80% of digest items are relevant, and
scraper-failure alerts reach the founder over Telegram.
