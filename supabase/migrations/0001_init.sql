-- ============================================================================
-- MUNAQQIB (منقّب) — initial schema  (Phase 0 → Phase 3)
-- Source of truth: CLAUDE.md §4
-- All timestamps are stored UTC (timestamptz); the app renders in Asia/Amman.
-- ============================================================================

-- pgvector for embedding similarity (matcher backbone).
create extension if not exists vector;
-- gen_random_uuid()
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
create type sector        as enum ('contracting','supplies','consulting','services');
create type tier          as enum ('trial','radar','pro','intelligence');
create type sub_status    as enum ('trial','pending_payment','active','past_due','cancelled');
create type tender_status as enum ('open','closed','awarded','cancelled');

-- ---------------------------------------------------------------------------
-- TENANCY
-- ---------------------------------------------------------------------------
create table orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sector sector not null,
  classification_fields text[] default '{}',   -- e.g. {'أبنية','طرق'}
  classification_grade int,                     -- 1..6, contractors only
  supply_categories text[] default '{}',        -- JordanBids-style category slugs
  governorates text[] default '{}',             -- empty = all governorates
  min_value_jod numeric, max_value_jod numeric,
  include_keywords text[] default '{}',
  exclude_keywords text[] default '{}',
  digest_emails text[] default '{}',            -- verified delivery addresses
  telegram_chat_id text,                        -- optional instant alerts
  whatsapp_msisdn text,                          -- reserved, unused in v1
  founding boolean default false,
  comp boolean default false,
  created_at timestamptz default now()
);

create table org_members (
  org_id uuid references orgs on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text default 'member',
  primary key (org_id, user_id)
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs on delete cascade,
  tier tier not null default 'trial',
  status sub_status not null default 'trial',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cliq_reference text,
  activated_by uuid,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- PIPELINE
-- ---------------------------------------------------------------------------
create table sources (
  id text primary key,            -- 'gtd','joneps','gam','mit'
  base_url text,
  enabled boolean default true,
  last_run_at timestamptz,
  last_ok_at timestamptz,
  consecutive_failures int default 0
);

create table tenders (
  id uuid primary key default gen_random_uuid(),
  source_id text references sources,
  source_ref text,                 -- the source's own id/number
  title text not null,
  entity text,
  entity_type text,                -- حكومي / خاص / عسكري / منظمات
  category text,
  governorate text,
  published_at date,
  closing_at timestamptz,
  site_visit_at timestamptz,
  doc_price_jod numeric,
  bond_pct numeric,
  url text not null,
  raw_html_path text,              -- Storage path of the parsed snapshot
  status tender_status default 'open',
  embedding vector(384),
  hash text unique,                -- dedupe: sha256(norm_ar(title)+entity+closing_date)
  created_at timestamptz default now()
);
create index tenders_embedding_idx on tenders using hnsw (embedding vector_cosine_ops);
create index tenders_status_idx    on tenders (status);
create index tenders_closing_idx   on tenders (closing_at);

create table matches (
  org_id uuid references orgs on delete cascade,
  tender_id uuid references tenders on delete cascade,
  score numeric not null,
  reasons jsonb,                   -- {'keyword':..,'embedding':..,'field':..}
  notified_at timestamptz,
  dismissed boolean default false,
  saved boolean default false,
  created_at timestamptz default now(),
  primary key (org_id, tender_id)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs on delete cascade,
  kind text,                       -- 'digest','deadline_t7','deadline_t3','deadline_t1','trial_hook'
  payload jsonb,
  transport text,                  -- 'email','telegram'
  sent_at timestamptz,
  delivery_status text
);

-- ---------------------------------------------------------------------------
-- PHASE 2 / 3
-- ---------------------------------------------------------------------------
create table analyses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs on delete cascade,
  tender_id uuid references tenders on delete set null,
  file_path text not null,
  status text default 'queued',
  result jsonb,                    -- conforms to AnalyzerBrief (CLAUDE.md §12.2)
  pages int,
  cost_usd numeric,
  created_at timestamptz default now()
);

create table awards (
  id uuid primary key default gen_random_uuid(),
  source_id text references sources,
  tender_ref text,
  tender_title text,
  entity text,
  category text,
  opened_at date,
  bidders jsonb,                   -- [{name, price_jod, rank}]
  winner text,
  winning_price_jod numeric,
  url text,
  hash text unique,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Members read only their org's rows. tenders/awards/sources are service-role
-- only; the web app reads tenders THROUGH matches joins (keeps the corpus from
-- being trivially scraped by free accounts).  CLAUDE.md §4 / §14.
-- ---------------------------------------------------------------------------
alter table orgs          enable row level security;
alter table org_members   enable row level security;
alter table subscriptions enable row level security;
alter table matches       enable row level security;
alter table notifications enable row level security;
alter table analyses      enable row level security;
alter table tenders       enable row level security;  -- no policy => deny to anon/auth
alter table awards        enable row level security;  -- no policy => deny to anon/auth
alter table sources       enable row level security;  -- no policy => deny to anon/auth

-- Helper: is the current auth user a member of :org_id ?
create or replace function is_org_member(target_org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from org_members m
    where m.org_id = target_org and m.user_id = auth.uid()
  );
$$;

-- orgs
create policy orgs_member_read on orgs
  for select using (is_org_member(id));
create policy orgs_member_update on orgs
  for update using (is_org_member(id));

-- org_members
create policy members_self_read on org_members
  for select using (user_id = auth.uid() or is_org_member(org_id));

-- subscriptions
create policy subs_member_read on subscriptions
  for select using (is_org_member(org_id));

-- matches  (the web app's window onto the tender corpus)
create policy matches_member_read on matches
  for select using (is_org_member(org_id));
create policy matches_member_write on matches
  for update using (is_org_member(org_id));   -- dismiss / save feedback

-- notifications
create policy notif_member_read on notifications
  for select using (is_org_member(org_id));

-- analyses
create policy analyses_member_read on analyses
  for select using (is_org_member(org_id));
create policy analyses_member_insert on analyses
  for insert with check (is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- SEED: Phase 0 sources
-- ---------------------------------------------------------------------------
insert into sources (id, base_url, enabled) values
  ('gtd',    'https://gtd.gov.jo',     true),
  ('joneps', 'https://www.joneps.gov.jo', true),
  ('gam',    'https://gamtenders.gov.jo', false),  -- Phase 1
  ('mit',    'https://www.mit.gov.jo',    false)   -- Phase 1
on conflict (id) do nothing;
