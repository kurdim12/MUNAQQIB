# DECISIONS LOG

Append-only record of non-obvious choices. Newest at the top. Each entry:
**date · decision · rationale.**

---

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
