# MUNAQQIB (منقّب) — Tender Copilot for Jordan

## Full Build Documentation for Claude Code

> **Working codename:** `munaqqib` (prospector). Rename freely — nothing in the code should hard-code the brand.
> **Owner:** Abdelrahman Elkurdi — solo founder, full-stack + AI engineer.
> **This file is the single source of truth.** If a decision is not in this file, propose it, get approval, then add it here.

---

## 0. MISSION

Build a subscription SaaS that finds, matches, analyzes, and tracks tenders (عطاءات/مناقصات) for Jordanian contractors, suppliers, and engineering offices — delivered where this corporate buyer actually works: **a clean, matched morning email digest** (optional free Telegram instant alerts for deadlines), backed by an Arabic-first web dashboard. We beat the incumbent **inside its own channel**: same inbox, ten times smarter.

**One-line pitch:** “كل عطاء بيناسب تصنيفك، بإيميل واحد نظيف كل صباح — مع التحليل والأسعار اللي ما حدا غيرنا بيعطيك ياها.”

For the complete, authoritative specification (personas, pricing tiers, journeys,
architecture, schema, phases, scraper anti-fragility, taxonomy, delivery, the
analyzer contract, pricing intelligence, legal constraints, env vars, testing),
this repository was bootstrapped from the master brief. Keep that brief and this
file in sync; record every non-obvious choice in `DECISIONS.md`.

---

## OPERATING INSTRUCTIONS (condensed — see DECISIONS.md for the running log)

1. **Work phase by phase.** Never start phase N+1 before phase N's acceptance criteria pass.
2. **Small commits, conventional messages:** `feat(scraper): gtd open-tenders parser`.
3. **Never invent source-site DOM structure.** Fetch the live page, save a snapshot to `apps/worker/fixtures/`, write the parser against the snapshot. Re-snapshot when a scraper breaks.
4. **All user-facing strings are Arabic-first** with English secondary. All timestamps in `Asia/Amman`. All currency in JOD.
5. **Secrets only via env vars.** Never commit keys. `.env.example` must always be current.
6. **When a decision is ambiguous,** choose the option that ships Phase 0 faster, note it in `DECISIONS.md`, and move on.
7. **Cost discipline:** any LLM call path documents a worst-case cost per unit in code comments. Analyzer budget: **< 1.0 JOD per document** (target ~0.3).
8. **Legal/ethical scraping rules are hard constraints,** not suggestions: public pages only; respect robots.txt; identifying User-Agent with contact email; ≤ 1 req/sec/source.

---

## PHASE 0 — THE LIFELINE (current)

**Scope:** scrapers for **GTD + JONEPS only** → normalize → dedupe → match against ONE
hard-coded org profile (design partner, `apps/worker/partner_profile.yaml`) → send one
daily Arabic email digest at 07:30 Asia/Amman (+ optional Telegram deadline alerts).

Pipeline (sequential, idempotent, DB-backed; no queues in v1):
`scrapers → normalize → dedupe → match → digest → notify`

See `apps/worker/README.md` for how to run each stage and the repo layout, and
`DECISIONS.md` for the environment/scraping decisions made while bootstrapping.

**Acceptance gate to Phase 1:** 3 consecutive days where the design partner confirms
zero relevant tenders missed and ≥ 80% of digest items judged relevant; scraper-failure
alerts reach the founder over Telegram.

---

*This in-repo CLAUDE.md is the condensed working copy. The exhaustive brief lives with
the owner and governs ties. Keep both updated as decisions evolve.*
