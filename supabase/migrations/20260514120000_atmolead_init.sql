-- =====================================================================
-- Atmolead — scraping orchestration tables
-- Shares the same Supabase project as Atmo. Leads themselves go to the
-- existing `lm_leads` + `clients` tables (channel='leroy_merlin').
-- These tables only hold the scraping pipeline state.
-- =====================================================================

set local search_path = public, extensions;

-- DEV RESET — safe in dev only
drop table if exists public.atmolead_leads_raw cascade;
drop table if exists public.atmolead_jobs cascade;
drop table if exists public.atmolead_executions cascade;
drop table if exists public.atmolead_config cascade;

drop type if exists public.atmolead_execution_status cascade;
drop type if exists public.atmolead_job_status cascade;
drop type if exists public.atmolead_trigger cascade;

-- =====================================================================
-- ENUMS
-- =====================================================================

create type public.atmolead_execution_status as enum (
  'running',
  'success',
  'failed',
  'partial'
);

create type public.atmolead_job_status as enum (
  'pending',
  'running',
  'done',
  'failed',
  'cancelled'
);

create type public.atmolead_trigger as enum (
  'cron',
  'manual',
  'startup'
);

-- =====================================================================
-- TABLE: atmolead_config (singleton — id must equal true)
-- =====================================================================

create table public.atmolead_config (
  id boolean primary key default true,
  target_url text not null default 'https://partenaires.leroymerlin.fr/',
  cron_expression text not null default '0 */6 * * *',  -- every 6h
  enabled boolean not null default true,
  css_selectors jsonb not null default '{}'::jsonb,
  last_run_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atmolead_config_singleton check (id = true)
);

insert into public.atmolead_config (id) values (true)
  on conflict (id) do nothing;

-- =====================================================================
-- TABLE: atmolead_executions — one row per scraping run
-- =====================================================================

create table public.atmolead_executions (
  id uuid primary key default gen_random_uuid(),
  status public.atmolead_execution_status not null default 'running',
  triggered_by public.atmolead_trigger not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  leads_found integer not null default 0,
  leads_inserted integer not null default 0,
  leads_skipped integer not null default 0,
  error_message text,
  worker_version text,
  logs jsonb,
  created_at timestamptz not null default now()
);

create index atmolead_executions_started_idx
  on public.atmolead_executions(started_at desc);
create index atmolead_executions_status_idx
  on public.atmolead_executions(status);

-- =====================================================================
-- TABLE: atmolead_jobs — queue for manual or scheduled runs
-- =====================================================================

create table public.atmolead_jobs (
  id uuid primary key default gen_random_uuid(),
  status public.atmolead_job_status not null default 'pending',
  triggered_by public.atmolead_trigger not null,
  scheduled_at timestamptz not null default now(),
  picked_at timestamptz,
  finished_at timestamptz,
  execution_id uuid references public.atmolead_executions(id) on delete set null,
  requested_by uuid references public.profiles(id) on delete set null,
  payload jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index atmolead_jobs_status_scheduled_idx
  on public.atmolead_jobs(status, scheduled_at);

-- =====================================================================
-- TABLE: atmolead_leads_raw — audit trail of every scraped item BEFORE
-- it is normalized into clients + lm_leads. Lets us debug parsing.
-- =====================================================================

create table public.atmolead_leads_raw (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid references public.atmolead_executions(id) on delete cascade,
  external_ref text,                            -- LM partner reference, e.g. "P-123456"
  raw_data jsonb not null,                      -- everything parsed from the DOM
  source_url text,
  client_id uuid references public.clients(id) on delete set null,
  lm_lead_id uuid references public.lm_leads(id) on delete set null,
  inserted boolean not null default false,      -- did it become a lm_leads row?
  skip_reason text,                             -- "duplicate", "missing_fields", ...
  created_at timestamptz not null default now()
);

create index atmolead_leads_raw_execution_idx
  on public.atmolead_leads_raw(execution_id);
create unique index atmolead_leads_raw_external_ref_idx
  on public.atmolead_leads_raw(external_ref)
  where external_ref is not null;

-- =====================================================================
-- updated_at triggers (re-uses Atmo's handle_updated_at function)
-- =====================================================================

create trigger atmolead_config_updated_at
  before update on public.atmolead_config
  for each row execute function public.handle_updated_at();

-- =====================================================================
-- RLS — same convention as Atmo: service_role bypasses, staff manages
-- =====================================================================

alter table public.atmolead_config enable row level security;
alter table public.atmolead_executions enable row level security;
alter table public.atmolead_jobs enable row level security;
alter table public.atmolead_leads_raw enable row level security;

create policy "staff reads atmolead_config" on public.atmolead_config
  for select using (auth.role() = 'authenticated');
create policy "admin manages atmolead_config" on public.atmolead_config
  for all using (public.is_admin()) with check (public.is_admin());

create policy "staff reads executions" on public.atmolead_executions
  for select using (auth.role() = 'authenticated');
create policy "staff manages executions" on public.atmolead_executions
  for all using (public.is_staff()) with check (public.is_staff());

create policy "staff reads jobs" on public.atmolead_jobs
  for select using (auth.role() = 'authenticated');
create policy "staff manages jobs" on public.atmolead_jobs
  for all using (public.is_staff()) with check (public.is_staff());

create policy "staff reads raw leads" on public.atmolead_leads_raw
  for select using (auth.role() = 'authenticated');
create policy "staff manages raw leads" on public.atmolead_leads_raw
  for all using (public.is_staff()) with check (public.is_staff());
