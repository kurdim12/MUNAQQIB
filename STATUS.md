# MUNAQQIB (منقّب) — STATUS & HANDOFF

_Last updated: 2026-06-12. Companion to `CLAUDE.md` (spec), `DECISIONS.md`
(running log), and `DEPLOYMENT.md` (runbook)._

## What it is now

An **Opportunity Intelligence Platform** for Jordanian contractors/suppliers:
a continuous engine that scrapes government tenders, matches them to a company
profile, scores/ranks them, analyzes the كرّاسة, and delivers a morning
briefing — surfaced through an Arabic-first "market terminal" web app.

> Not a tender website. The website is the interface; the worker is the engine.

---

## Architecture

```
apps/web   (Next.js 15)  → web app / interface         → Railway (Docker, standalone) or Vercel
apps/worker (Python)     → scrape→match→digest engine  → Railway cron (Docker), daily 04:30 UTC = 07:30 Amman
Cloudflare D1            → database (id c296c699-…)     → already provisioned, schema applied
Cloudflare R2            → HTML snapshots + كراسات      → optional (degrades gracefully)
Resend                   → digest + magic-link email
Telegram                 → deadline + ops alerts
Anthropic + OpenRouter   → analyzer (sonnet) + cheap slots
```

- DB schema: `infra/cloudflare/d1/0001_init.sql` + `0002_auth.sql` (applied).
- Both deployables are containerized: `apps/web/Dockerfile`, `apps/worker/Dockerfile`.
- **No GitHub Actions** (the account can't run runners) — see DECISIONS.md.

---

## The 13-layer pipeline — current state

| # | Layer | State |
|---|---|---|
| 1 | Source Discovery | **JONEPS live** (real parser, committed fixture); GTD blocked (bot-walled). Operator monitor built (`/operations`). |
| 2 | Normalization | ✅ `worker/pipeline/normalize.py` → unified Tender |
| 3 | Deduplication | ✅ `worker/pipeline/dedupe.py` (hash upsert); semantic dedupe = enhancement |
| 4 | Enrichment | ◐ embeddings + taxonomy; entity profiles = Phase 2 |
| 5 | Matching | ✅ `worker/pipeline/match.py` (keyword + embeddings, with "why") |
| 6 | **Opportunity Quality** | ✅ `web/lib/quality.ts` (High/Med/Low ranking), tested |
| 7 | Market Intelligence | ◐ `/intelligence` (top buyers, category mix); award/price DB = Phase 2 |
| 8 | Digest Generation | ✅ `worker/pipeline/digest.py` (insight-framed) |
| 9 | Notification | ✅ `worker/pipeline/notify.py` (Telegram) |
| 10 | **Watchlist** | ✅ `/watchlist` — monitors saved opps (status/deadline/report) |
| 11 | Document Intelligence | ✅ analyzer core (`worker/pipeline/analyze.py`, ~0.05 JOD/doc) + **war-room UX** + enqueue. Live doc-fetch = blocked. |
| 12 | Competitor Intelligence | ⬜ needs award data (Phase 2) |
| 13 | **Learning** | ✅ `web/lib/learning.ts` — save/dismiss → category affinity → personalized ranking, tested |

---

## Web surface (`apps/web`)

| Route | What |
|---|---|
| `/` | Landing (outcome-led, intelligence framing) |
| `/dashboard` | **Command Center** — morning briefing, ranked opportunity rows, deadlines + signals + learning rail |
| `/tenders/[id]` | **Opportunity Report** — score, days, verdict, why-matched, intelligence report, war-room |
| `/watchlist` | Monitored saved opportunities |
| `/intelligence` | **Market Intelligence** (dark terminal) — buyers/categories; award data gated to intelligence tier |
| `/pricing` | Tier cards + CliQ upgrade request |
| `/signin` | Passwordless magic-link (Auth.js + Resend) |
| `/onboarding` | Company profile wizard |
| `/admin` | CliQ payment activation (operator) |
| `/operations` | Source-health monitor (operator) |
| ⌘K | Global command palette |

Design: V2 "market terminal" — Petra-sandstone + warm-ink, Amiri serif
headlines, semantic color (green=qualified, amber=review, red=risk).

---

## The demo

`demo_org_v1` ("شركة الإعمار والتوريدات الأردنية", Pro plan) is seeded in D1 with
**10 real JONEPS tenders** across 4 categories, matches, 2 saved, and 1 full
analyzer report. With no login, the app defaults to this org — so `/dashboard`,
`/watchlist`, `/intelligence`, and `/tenders/jn_2026001840-01` all show real data.

---

## Verified

- Web: 35 unit tests (billing, entitlements, analysis, quality, learning, admin),
  `tsc`/`next lint`/`next build` clean.
- Worker: 65 tests; JONEPS parser against a committed fixture; full pipeline run
  end-to-end on live data (scrape → normalize → dedupe → match).
- All DB-backed reads/writes validated against the live D1 instance.

---

## Known gaps / blockers (honest)

**Data-blocked (Phase 2 — a data-acquisition project, not UI):**
- L7 award/pricing DB + L12 competitor profiles need **historical award results**
  scraped over time. Framing exists; the data pipeline does not.
- More sources (GAM, ministries, universities) — need network access or fixtures.
- GTD source — serves an empty shell to the honest bot UA; needs a headless
  browser (Playwright) path or a saved fixture.
- Analyzer live doc-fetch — gov doc links blocked from the build env; fixture-first
  like the scrapers. Enqueue + war-room exist; the fetch→extract→LLM run needs a
  reachable كرّاسة + API keys.

**Operational (yours to drive):**
- Run the worker daily on Railway with real secrets (see DEPLOYMENT.md §4).
- Verify a domain in Resend so digest + login email reach addresses other than
  the Resend signup address (test mode only delivers to that one).
- Replace placeholder tier prices in `web/lib/billing.ts` with the master brief's.
- Admin activation (`pending_payment → active`) needs `ADMIN_EMAILS` + a logged-in
  admin.

---

## Next moves (recommended order)

1. **Operate it**: worker secrets on Railway → first real digest → Resend domain.
2. **Unblock GTD** (Playwright scraper or committed fixture) → second live source.
3. **Analyzer producer**: a `run_analyze` worker stage that drains
   `analyses.status='queued'`, fetches the doc, runs `analyze_document`, persists.
4. **Phase 2 data**: scrape award results → populate L7/L12 (the real moat).

---

## Credentials / env

Full template in `.env.example`. Minimum for the live morning digest:
`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `D1_DATABASE_ID`,
`RESEND_API_KEY`, `EMAIL_FROM`. Web adds `AUTH_SECRET`, `ADMIN_EMAILS`,
`CLIQ_ALIAS`. Analyzer/GTD-fallback add `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`.
