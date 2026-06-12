# منقّب · MUNAQQIB

**Tender Copilot for Jordan** — finds, matches, analyzes, and tracks tenders
(عطاءات/مناقصات) for Jordanian contractors, suppliers, and engineering offices,
delivered as a clean, classification-matched morning email digest (with optional
free Telegram deadline alerts), backed by an Arabic-first web dashboard.

> One inbox, ten times smarter. See [`CLAUDE.md`](./CLAUDE.md) for the working
> spec and [`DECISIONS.md`](./DECISIONS.md) for the running decisions log.

## Status — Phase 0 (Lifeline)

The Lifeline pipeline is scaffolded and unit-tested end-to-end offline:

```
scrapers → normalize → dedupe → match → digest → notify
```

- ✅ DB migration (`supabase/migrations/0001_init.sql`) — full schema + RLS + pgvector
- ✅ `norm_ar()` Arabic normalization with golden tests
- ✅ content-hash dedupe · hybrid matcher (keyword + embedding + field)
- ✅ Arabic RTL email digest (+ plain-text fallback) · Resend / Telegram transports
- ✅ FastAPI worker (`/health`, `/run/{stage}`) for Railway cron
- ⏳ GTD + JONEPS deterministic parsers — **deferred to real fixtures** (rule §3;
  sources unreachable from the build container). LLM-fallback extractor is the
  interim path. See `DECISIONS.md` / `SOURCES.md`.

```bash
cd apps/worker && pip install -r requirements.txt && python -m pytest
```

## Repo layout

```
munaqqib/
├── CLAUDE.md · DECISIONS.md · SOURCES.md
├── apps/
│   ├── web/      ← Next.js 15 (Phase 1)
│   └── worker/   ← FastAPI pipeline (see apps/worker/README.md)
├── supabase/migrations/
└── .env.example
```

## Stack

Next.js 15 / Vercel (web) · Python 3.12 / FastAPI / Railway (worker) · Supabase
Postgres + pgvector · MiniLM embeddings (offline) · Anthropic + OpenRouter (hybrid
LLM) · Resend (email) · Telegram (instant alerts). Arabic-first, RTL, `Asia/Amman`, JOD.
