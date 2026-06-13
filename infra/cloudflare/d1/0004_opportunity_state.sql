-- ============================================================================
-- MUNAQQIB (منقّب) — Layer 2: the opportunity lifecycle on the per-org match.
--
-- An opportunity (org × tender) now has a *state*, not just saved/dismissed flags.
-- The legal transitions live in apps/web/src/lib/opportunity.ts (enforced in the
-- server actions); the DB stores the current state, decision/outcome, and a
-- full event log so state changes feed L1 tuning and the "what we learned" panel.
--
--   جديد → قيد المراجعة → محلَّل → قرار: تقديم|تجاهل → متابعة → نتيجة: ربح|خسارة
-- ============================================================================

ALTER TABLE matches ADD COLUMN opportunity_status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE matches ADD COLUMN decision TEXT;            -- bid | pass
ALTER TABLE matches ADD COLUMN outcome TEXT;             -- won | lost
ALTER TABLE matches ADD COLUMN decided_at TEXT;          -- when bid/pass chosen
ALTER TABLE matches ADD COLUMN status_changed_at TEXT;   -- last transition

CREATE TABLE IF NOT EXISTS opportunity_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL,
  tender_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_opp_events ON opportunity_events (org_id, tender_id, at);
