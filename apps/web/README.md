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
| `/dashboard`  | dynamic | Reads `matches ⋈ tenders` for the current org; renders cards (score, Amman closing date + deadline label, JOD doc price, match reasons) |

## Layout

```
src/
  app/        layout.tsx (RTL, Tajawal font) · page · dashboard · onboarding (+actions)
  components/ TenderCard · ChipInput
  lib/        d1.ts (REST client) · repo.ts (typed reads/writes) · format.ts · strings.ts
```

## Open items

- **Auth provider undecided.** The "current org" is resolved from the `org_id`
  cookie → `DEMO_ORG_ID` → first org in the DB (temporary dev seam, flagged in
  `repo.ts`). Replace `getCurrentOrgId()` once auth is chosen.
- Billing (CliQ), saved/dismissed actions on matches, and tier gating are next.

All timestamps render in `Asia/Amman`; all money in JOD; numbers use Latin
digits with Arabic words for consistency (see `DECISIONS.md`).
