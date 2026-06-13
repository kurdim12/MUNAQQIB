-- ============================================================================
-- MUNAQQIB (منقّب) — Layer 4: uploaded كرّاسة text for the analyzer.
--
-- Gov full كراسات aren't fetchable by URL (purchase/login-gated), so the user
-- uploads the PDF on the Opportunity Report. The web extracts its text and
-- stores it here; the worker's analyze stage consumes doc_text directly instead
-- of fetching a URL, then runs the same two-pass analyzer.
-- ============================================================================

ALTER TABLE analyses ADD COLUMN doc_text TEXT;
