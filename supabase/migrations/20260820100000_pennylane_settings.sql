-- Toggles activation Pennylane + colonnes de mapping.
-- Un seul row de settings (single-row pattern via check constraint).

create table if not exists public.pennylane_settings (
  id boolean primary key default true check (id),
  push_customer_enabled boolean not null default false,
  push_invoice_enabled boolean not null default false,
  pull_reconciliation_enabled boolean not null default false,
  last_push_at timestamptz,
  last_pull_at timestamptz,
  last_pull_stats jsonb,
  last_error text,
  updated_at timestamptz not null default now()
);

insert into public.pennylane_settings (id)
  values (true)
  on conflict (id) do nothing;

alter table public.pennylane_settings enable row level security;

drop policy if exists "staff reads pennylane_settings" on public.pennylane_settings;
create policy "staff reads pennylane_settings" on public.pennylane_settings
  for select using (public.is_staff());

drop policy if exists "admins write pennylane_settings" on public.pennylane_settings;
create policy "admins write pennylane_settings" on public.pennylane_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- Mapping id Pennylane sur nos clients (permet upsert stable).
alter table public.clients
  add column if not exists pennylane_customer_id bigint;

create index if not exists clients_pennylane_customer_idx
  on public.clients (pennylane_customer_id)
  where pennylane_customer_id is not null;

comment on column public.clients.pennylane_customer_id is
  'ID numérique du client Pennylane après upsert. Sert de clé pour éviter la recréation.';

comment on table public.pennylane_settings is
  'Toggles feature-flag pour l''intégration Pennylane. Une seule ligne (id=true).';
