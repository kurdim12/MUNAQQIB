-- ============================================================================
-- MUNAQQIB (منقّب) — Cloudflare D1 (SQLite) schema.
-- Port of supabase/migrations/0001_init.sql to SQLite/D1 (DECISIONS.md 2026-06-12).
--
-- D1 is SQLite, so the following Postgres features have no equivalent here and
-- are handled differently than the locked Supabase design:
--   • pgvector vector(384)  → embeddings stored as JSON TEXT; Phase-0 matching is
--     done in Python. Phase 1+ moves vectors to Cloudflare Vectorize.
--   • RLS / auth.users       → no row-level security and no Supabase Auth; tenancy
--     is enforced in the application layer; user_id is an external auth id (TEXT).
--   • Storage (snapshots/PDFs)→ Cloudflare R2.
--   • enums                  → TEXT + CHECK constraints.
--   • text[] arrays          → JSON TEXT (default '[]').
--   • timestamptz            → TEXT ISO-8601 (UTC); display layer renders Amman.
--   • gen_random_uuid()      → DEFAULT (lower(hex(randomblob(16)))).
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- TENANCY
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orgs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  sector TEXT NOT NULL CHECK (sector IN ('contracting','supplies','consulting','services')),
  classification_fields TEXT NOT NULL DEFAULT '[]',   -- JSON array
  classification_grade INTEGER,                        -- 1..6, contractors only
  supply_categories TEXT NOT NULL DEFAULT '[]',        -- JSON array
  governorates TEXT NOT NULL DEFAULT '[]',             -- JSON array; empty = all
  min_value_jod REAL,
  max_value_jod REAL,
  include_keywords TEXT NOT NULL DEFAULT '[]',         -- JSON array
  exclude_keywords TEXT NOT NULL DEFAULT '[]',         -- JSON array
  digest_emails TEXT NOT NULL DEFAULT '[]',            -- JSON array
  telegram_chat_id TEXT,
  whatsapp_msisdn TEXT,                                -- reserved, unused in v1
  founding INTEGER NOT NULL DEFAULT 0,                 -- boolean 0/1
  comp INTEGER NOT NULL DEFAULT 0,                     -- boolean 0/1
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS org_members (
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,                               -- external auth user id
  role TEXT NOT NULL DEFAULT 'member',
  PRIMARY KEY (org_id, user_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'trial'
    CHECK (tier IN ('trial','radar','pro','intelligence')),
  status TEXT NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial','pending_payment','active','past_due','cancelled')),
  trial_ends_at TEXT,
  current_period_end TEXT,
  cliq_reference TEXT,
  activated_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- ---------------------------------------------------------------------------
-- PIPELINE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,                 -- 'gtd','joneps','gam','mit'
  base_url TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_run_at TEXT,
  last_ok_at TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tenders (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  source_id TEXT REFERENCES sources(id),
  source_ref TEXT,
  title TEXT NOT NULL,
  entity TEXT,
  entity_type TEXT,                    -- حكومي / خاص / عسكري / منظمات
  category TEXT,
  governorate TEXT,
  published_at TEXT,                    -- date (ISO yyyy-mm-dd)
  closing_at TEXT,                     -- datetime ISO UTC
  site_visit_at TEXT,
  doc_price_jod REAL,
  bond_pct REAL,
  url TEXT NOT NULL,
  raw_html_path TEXT,                  -- R2 object key of the snapshot
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','closed','awarded','cancelled')),
  embedding TEXT,                      -- JSON array (384 floats); NULL if unavailable
  hash TEXT UNIQUE,                    -- dedupe: sha256(norm_ar(title)+entity+closing)
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS tenders_status_idx  ON tenders (status);
CREATE INDEX IF NOT EXISTS tenders_closing_idx ON tenders (closing_at);

CREATE TABLE IF NOT EXISTS matches (
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  tender_id TEXT NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  score REAL NOT NULL,
  reasons TEXT,                        -- JSON: {keyword, embedding, field}
  notified_at TEXT,
  dismissed INTEGER NOT NULL DEFAULT 0,
  saved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (org_id, tender_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT REFERENCES orgs(id) ON DELETE CASCADE,
  kind TEXT,                           -- digest / deadline_t7 / deadline_t3 / deadline_t1 / trial_hook
  payload TEXT,                        -- JSON
  transport TEXT,                      -- email / telegram
  sent_at TEXT,
  delivery_status TEXT
);

-- ---------------------------------------------------------------------------
-- PHASE 2 / 3
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT REFERENCES orgs(id) ON DELETE CASCADE,
  tender_id TEXT REFERENCES tenders(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,             -- R2 object key
  status TEXT NOT NULL DEFAULT 'queued',
  result TEXT,                         -- JSON (AnalyzerBrief, CLAUDE.md §12.2)
  pages INTEGER,
  cost_usd REAL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS awards (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  source_id TEXT REFERENCES sources(id),
  tender_ref TEXT,
  tender_title TEXT,
  entity TEXT,
  category TEXT,
  opened_at TEXT,                      -- date
  bidders TEXT,                        -- JSON: [{name, price_jod, rank}]
  winner TEXT,
  winning_price_jod REAL,
  url TEXT,
  hash TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- ---------------------------------------------------------------------------
-- SEED: Phase 0 sources
-- ---------------------------------------------------------------------------
INSERT INTO sources (id, base_url, enabled) VALUES
  ('gtd',    'https://gtd.gov.jo',        1),
  ('joneps', 'https://www.joneps.gov.jo', 1),
  ('gam',    'https://gamtenders.gov.jo', 0),   -- Phase 1
  ('mit',    'https://www.mit.gov.jo',    0)    -- Phase 1
ON CONFLICT (id) DO NOTHING;
