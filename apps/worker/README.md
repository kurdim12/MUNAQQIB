# MUNAQQIB worker (FastAPI · Python 3.12)

The Phase 0 Lifeline pipeline + the FastAPI service Railway cron hits.

## Layout

```
apps/worker/
├── main.py                 FastAPI: GET /health · POST /run/{stage}
├── config.py               env-driven settings (.env.example is the template)
├── db.py                   Supabase service-role client + Storage snapshot helper
├── llm_client.py           hybrid LLM router (OpenRouter cheap slots / Anthropic direct)
├── partner_profile.yaml    Phase 0 design-partner org profile (the one match target)
├── taxonomy.yaml           classification fields + supply categories + lexicons
├── models/schemas.py       Pydantic contracts (RawTender, Tender, OrgProfile, AnalyzerBrief…)
├── pipeline/
│   ├── run.py              orchestrator + CLI (scrape | digest | deadlines)
│   ├── normalize.py        norm_ar() + RawTender→Tender
│   ├── dedupe.py           content-hash dedupe
│   ├── embed.py            MiniLM embeddings (lazy, degrades to keyword-only)
│   ├── taxonomy.py         taxonomy loader / lexicon index
│   ├── match.py            hybrid matcher v0 (0.45 kw + 0.35 emb + 0.20 field)
│   ├── digest.py           Arabic RTL HTML email + plain-text fallback
│   ├── notify.py           send digest + T-7/T-3/T-1 alerts, log to notifications
│   ├── scrapers/           base.py · gtd.py · joneps.py · llm_fallback.py
│   └── transports/         email.py (Resend) · telegram.py · whatsapp.py (stub)
├── util/timez.py           Asia/Amman formatting (storage is UTC)
├── fixtures/               saved HTML snapshots per source (parser source of truth)
└── tests/                  offline unit tests (norm_ar golden, dedupe, match, digest)
```

## Setup

```bash
cd apps/worker
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../../.env.example ../../.env   # then fill in secrets
```

The embedding model (`paraphrase-multilingual-MiniLM-L12-v2`) downloads on first
use. Without it, the matcher runs keyword-only (see DECISIONS.md). OCR fallback in
Phase 2 needs the system packages `tesseract-ocr` + `tesseract-ocr-ara`.

## Run

```bash
# Tests (offline, no network/secrets needed)
python -m pytest

# Pipeline stages (CLI)
python -m pipeline.run scrape                 # fetch + snapshot + parse enabled sources
python -m pipeline.run digest --dry-run       # full pipeline, render digest, don't send
python -m pipeline.run deadlines --dry-run    # T-7/T-3/T-1 reminders, don't send

# Capture a scraper fixture (rule §3) once a network path to the source exists
python -m pipeline.scrapers.gtd --snapshot
python -m pipeline.scrapers.joneps --snapshot

# Service (Railway)
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Railway cron (CLAUDE.md §6.8)

| job       | schedule (Asia/Amman)     | endpoint              |
|-----------|---------------------------|-----------------------|
| scrape    | every 2h, 07:00–19:00     | `POST /run/scrape`    |
| digest    | 07:30                     | `POST /run/digest`    |
| deadlines | 08:00                     | `POST /run/deadlines` |

## Status / next actions

- **Scraper parsers are deferred to real fixtures** (rule §3). The build container
  cannot reach the government sources, so `gtd._parse_listing` / `joneps._parse_results`
  are flagged `TODO(fixture)` and the pipeline currently degrades to the LLM-fallback
  extractor. **Next:** capture a snapshot (`--snapshot`), commit it under `fixtures/`,
  write the deterministic parser against it, add a parser unit test. See DECISIONS.md
  and SOURCES.md.
