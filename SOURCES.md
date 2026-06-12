# SOURCES — scraper registry & selector notes

One row per source. Keep selector notes here so a broken parser can be repaired fast.
robots.txt must be re-checked before any source is enabled. ≤ 1 req/sec/source, always.

| id     | name                                   | base_url                    | phase | status        | robots.txt        |
|--------|----------------------------------------|-----------------------------|-------|---------------|-------------------|
| gtd    | دائرة العطاءات الحكومية (GTD)           | https://gtd.gov.jo          | 0     | parser TODO   | 404 (none)        |
| joneps | المنصة الوطنية للشراء الإلكتروني JONEPS | https://www.joneps.gov.jo   | 0     | parser TODO   | 404 (none)        |
| gam    | عطاءات أمانة عمّان الكبرى               | https://gamtenders.gov.jo   | 1     | not started   | recheck           |
| mit    | وزارة الصناعة والتجارة                  | https://www.mit.gov.jo      | 1     | not started   | recheck           |

---

## gtd — Government Tenders Directorate

- **Target listing:** "مناقصات قيد الطرح" (open tenders currently advertised).
- **Tech:** IIS / ASP.NET, server-rendered. Try `httpx` first (no JS expected).
- **Fields to extract:** title · entity (الجهة) · published_at · closing_at · site_visit_at ·
  doc_price_jod (ثمن النسخة) · source_ref (رقم المناقصة) · detail URL.
- **Selector notes:** _TODO(fixture)_ — capture a real snapshot to
  `apps/worker/fixtures/gtd_listing_<date>.html`, then record the row selector,
  column order, and date format (Arabic-Indic digits expected → `norm_ar`) here.
- **Build-env note (2026-06-12):** sources unreachable from the build container
  (empty 54-byte stub). Deterministic parser deferred per DECISIONS.md; LLM-fallback
  extractor is the interim path.

## joneps — Jordan National e-Procurement System

- **Target listing:** public tender-invitation search results.
- **Tech:** Korean-built e-GP (ASP/JSP). Form POSTs; paging via `__doPostBack`-style
  params. Replicate the search POST with `httpx`; Playwright only if blocked.
- **Fields to extract:** same unified set as gtd.
- **Selector notes:** _TODO(fixture)_ — capture the POST body + a results snapshot to
  `apps/worker/fixtures/joneps_results_<date>.html`; record the form fields, paging
  params, and the result-row selectors here.
- **Build-env note (2026-06-12):** returns HTTP 403 to the bot UA from the build
  container. Deterministic parser deferred per DECISIONS.md.
