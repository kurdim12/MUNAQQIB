# apps/web — MUNAQQIB dashboard (Phase 1)

Arabic-first (RTL) web app: **Next.js 15 (App Router) · React 19 · TypeScript ·
Tailwind v3**. It reads/writes Cloudflare **D1 over the REST API** — the same
account/token/database the worker uses (`src/lib/d1.ts` is the TS twin of the
worker's `d1.py`). No Workers binding, so it deploys on Node/Vercel.

## Run

```bash
npm install
npm run dev        # http://localhost:3000  (RTL Arabic UI)
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
npm run test       # vitest (pure helpers)
```

With no `CLOUDFLARE_*` / `D1_DATABASE_ID` set, all D1 reads return `[]`, so the
app builds and renders empty states (a "database not configured" banner shows on
the dashboard). Set the vars (see root `.env.example`) to talk to the live DB.

## Routes

| Route         | Render  | What it does |
| ------------- | ------- | ------------ |
| `/`           | static  | Landing + CTA |
| `/onboarding` | client  | 2-step wizard → server action inserts `orgs` + a 14-day `trial` subscription, sets the `org_id` cookie, redirects to the dashboard |
| `/dashboard`  | dynamic | Reads `matches ⋈ tenders` for the current org; cards (score, Amman closing + deadline label, JOD doc price, reasons) with **save/dismiss**; All vs ★المحفوظة tabs; trial/subscription banner |
| `/pricing`    | dynamic | Tier cards (placeholder JOD prices); **CliQ upgrade request** → sets `pending_payment` + `cliq_reference`, shows transfer instructions |

## Layout

```
src/
  app/        layout.tsx (RTL, Tajawal font) · page · dashboard · onboarding (+actions)
  components/ TenderCard · ChipInput
  lib/        d1.ts (REST client) · repo.ts (typed reads/writes) · format.ts · strings.ts
```

## Auth

**Auth.js (NextAuth v5) + Resend** passwordless email magic-links, JWT sessions,
D1-backed via a custom REST adapter (`src/lib/auth-adapter.ts` + tables in
`infra/cloudflare/d1/0002_auth.sql`). `getCurrentOrgId()` resolves the signed-in
user's org via `org_members`; with no `AUTH_SECRET` set it degrades to the dev
seam (cookie → `DEMO_ORG_ID` → first org) so build/CI/dev run secret-free. Set
`AUTH_SECRET` + `AUTH_RESEND_KEY` (or `RESEND_API_KEY`) to enable real login.

## Admin

`/admin` (platform staff in `ADMIN_EMAILS`) lists `pending_payment` subscriptions
and activates them after a CliQ transfer — `activateSubscription` flips to `active`,
sets `current_period_end` (+30d) + `activated_by`, idempotent via a guarded
`RETURNING`. Page + action re-check `isAdminEmail`.

## Entitlements

`lib/entitlements.ts` maps a subscription to what it unlocks. An active trial =
full access; after it ends, access needs an `active` paid sub. The dashboard is
paywalled without access; *saving* is pro+ (gated in UI and in `saveMatchAction`).
`analyzer`/`pricing_intel` ranks are defined, ready for those features.

## Open items

- **Analyzer UI** — the كرّاسة-analysis feature (pro+); the Phase-1 differentiator.
- Renewals/expiry handling and a real CliQ webhook (manual confirmation for now).

All timestamps render in `Asia/Amman`; all money in JOD; numbers use Latin
digits with Arabic words for consistency (see `DECISIONS.md`).
