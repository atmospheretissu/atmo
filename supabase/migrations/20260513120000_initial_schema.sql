-- =====================================================================
-- Atmosphère Tissus — Initial schema
-- Covers all 8 modules of the CDC v5:
--   1. Simulator & Quotes
--   2. Workshop / Confections tracking
--   3. Supplier orders (POs)
--   4. QR code receiving
--   5. Customer SMS / communications
--   6. Installers (poseurs)
--   7. Collection Atmosphère & Leroy Merlin leads
--   8. POS / Checkout
-- =====================================================================

-- Extensions — created in `extensions` schema (Supabase convention)
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Make extension types/operators discoverable without qualification
set local search_path = public, extensions;

-- =====================================================================
-- DEV RESET — safe to re-run this migration in dev (drops user objects only)
-- =====================================================================
drop table if exists public.audit_log cascade;
drop table if exists public.notifications cascade;
drop table if exists public.alerts cascade;
drop table if exists public.sms_log cascade;
drop table if exists public.sms_templates cascade;
drop table if exists public.lm_leads cascade;
drop table if exists public.caisse_closures cascade;
drop table if exists public.caisse_ticket_lines cascade;
drop table if exists public.caisse_tickets cascade;
drop table if exists public.payments cascade;
drop table if exists public.poses cascade;
drop table if exists public.bc_lines cascade;
drop table if exists public.bons_commande cascade;
drop table if exists public.dossier_items cascade;
drop table if exists public.dossiers cascade;
drop table if exists public.devis_versions cascade;
drop table if exists public.devis_lines cascade;
drop table if exists public.devis cascade;
drop table if exists public.couturieres cascade;
drop table if exists public.suppliers cascade;
drop table if exists public.catalog_products cascade;
drop table if exists public.clients cascade;
drop table if exists public.profiles cascade;

drop function if exists public.handle_updated_at() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.refresh_dossier_status() cascade;
drop function if exists public.current_role() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.is_staff() cascade;
drop function if exists public.is_workshop() cascade;
drop function if exists public.is_poseur() cascade;

drop type if exists public.lead_status cascade;
drop type if exists public.supplier_type cascade;
drop type if exists public.lang cascade;
drop type if exists public.payment_kind cascade;
drop type if exists public.payment_method cascade;
drop type if exists public.pose_status cascade;
drop type if exists public.bc_status cascade;
drop type if exists public.dossier_item_status cascade;
drop type if exists public.dossier_item_type cascade;
drop type if exists public.dossier_status cascade;
drop type if exists public.devis_status cascade;
drop type if exists public.channel cascade;
drop type if exists public.user_role cascade;

-- =====================================================================
-- ENUMS
-- =====================================================================

create type public.user_role as enum (
  'admin',
  'commercial',
  'resp_confection',
  'couturiere',
  'poseur',
  'decoratrice'
);

create type public.channel as enum (
  'magasin',
  'leroy_merlin',
  'ecommerce',
  'decoratrice',
  'visio'
);

create type public.devis_status as enum (
  'brouillon',
  'envoye',
  'valide',
  'acompte_recu',
  'refuse',
  'expire'
);

create type public.dossier_status as enum (
  'en_cours',
  'tout_commande',
  'reception_partielle',
  'en_confection',
  'pret_pose',
  'planifie',
  'pose'
);

create type public.dossier_item_type as enum (
  'tissu',
  'rail',
  'accessoire',
  'autre',
  'confection'
);

create type public.dossier_item_status as enum (
  'en_attente',
  'commande',
  'expedie',
  'recu',
  'confection',
  'probleme'
);

create type public.bc_status as enum (
  'brouillon',
  'envoye',
  'confirme',
  'expedie',
  'recu',
  'probleme'
);

create type public.pose_status as enum (
  'a_planifier',
  'planifie',
  'confirme',
  'pose',
  'annule'
);

create type public.payment_method as enum (
  'stripe',
  'especes',
  'cb',
  'cheque',
  'virement'
);

create type public.payment_kind as enum (
  'acompte',
  'solde',
  'comptoir',
  'remboursement'
);

create type public.lang as enum ('FR', 'EN', 'PL', 'UA', 'DE');

create type public.supplier_type as enum (
  'tissu',
  'rail',
  'accessoire',
  'couture',
  'autre'
);

create type public.lead_status as enum (
  'nouveau',
  'visio_planifie',
  'echantillons',
  'devis_envoye',
  'valide',
  'perdu'
);

-- =====================================================================
-- TABLE: profiles (extends auth.users)
-- =====================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  full_name text not null,
  role public.user_role not null default 'commercial',
  phone text,
  avatar_initial char(1) generated always as (upper(substring(full_name from 1 for 1))) stored,
  active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Extends auth.users with role, name, etc. Auto-created via trigger.';

create index profiles_role_idx on public.profiles(role);

-- =====================================================================
-- TABLE: clients
-- =====================================================================

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,                   -- "Mme Larochelle, Hélène"
  email citext,
  phone text,
  address_pose text,
  city text,
  postal_code text,
  channel public.channel not null default 'magasin',
  source_notes text,
  internal_notes text,
  preferences text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_channel_idx on public.clients(channel);
create index clients_name_idx on public.clients using gin (display_name extensions.gin_trgm_ops);

-- =====================================================================
-- TABLE: catalog_products (Collection Atmosphère + tissus catalogue simulator)
-- =====================================================================

create table public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,                     -- "CAS-204", "ATM-CS01"
  name text not null,                           -- "Casamance Saumon"
  category text not null,                       -- "Tissu", "Rideau", "Coussin", ...
  description text,
  unit_price_ht numeric(12,2) not null,
  unit_label text not null default 'm',         -- "m", "u"
  width_cm integer,                             -- laize tissu
  raccord_cm integer,                           -- raccord motif
  is_collection boolean not null default false, -- Collection Atmosphère ?
  stock_poland integer not null default 0,
  stock_ukraine integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index catalog_category_idx on public.catalog_products(category);
create index catalog_collection_idx on public.catalog_products(is_collection) where is_collection;

-- =====================================================================
-- TABLE: suppliers
-- =====================================================================

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type public.supplier_type not null,
  country text not null,                        -- ISO 2 letters
  language public.lang not null default 'FR',
  contact_email citext,
  contact_phone text,
  franco_ht numeric(12,2) not null default 0,
  notes text,
  portal_url text,                              -- portail pro Casamance/Linder
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- TABLE: couturieres
-- =====================================================================

create table public.couturieres (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  internal boolean not null default true,
  specialties text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- TABLE: devis (quotes) — Module 1
-- =====================================================================

create table public.devis (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,                  -- "DEV-2026-0142"
  version integer not null default 1,
  client_id uuid not null references public.clients(id) on delete restrict,
  channel public.channel not null,
  status public.devis_status not null default 'brouillon',
  product_summary text not null,                -- "Rideaux sur mesure"
  product_detail text,                          -- "Salon + chambre · Casamance Saumon"
  qty integer not null default 1,
  total_ht numeric(12,2) not null default 0,
  total_ttc numeric(12,2) not null default 0,
  tva_rate numeric(5,2) not null default 20.0,
  acompte_ht numeric(12,2) generated always as (round(total_ht * 0.5, 2)) stored,
  acompte_ttc numeric(12,2) generated always as (round(total_ttc * 0.5, 2)) stored,
  pdf_url text,                                 -- Supabase Storage path
  workshop_notes text,
  commercial_id uuid references public.profiles(id) on delete set null,
  sent_at timestamptz,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index devis_status_idx on public.devis(status);
create index devis_client_idx on public.devis(client_id);
create index devis_created_idx on public.devis(created_at desc);

-- Lines on a quote
create table public.devis_lines (
  id uuid primary key default gen_random_uuid(),
  devis_id uuid not null references public.devis(id) on delete cascade,
  position integer not null default 0,
  ref text,
  label text not null,
  detail text,
  qty numeric(10,3) not null default 1,
  unit_label text not null default 'u',
  unit_price_ht numeric(12,2) not null,
  total_ht numeric(12,2) generated always as (round(qty * unit_price_ht, 2)) stored,
  catalog_product_id uuid references public.catalog_products(id) on delete set null,
  meta jsonb not null default '{}'              -- pièce, largeur, hauteur, tête, doublure...
);

create index devis_lines_devis_idx on public.devis_lines(devis_id);

-- Versions history
create table public.devis_versions (
  id uuid primary key default gen_random_uuid(),
  devis_id uuid not null references public.devis(id) on delete cascade,
  version integer not null,
  total_ttc numeric(12,2) not null,
  snapshot jsonb not null,
  pdf_url text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(devis_id, version)
);

-- =====================================================================
-- TABLE: dossiers (workshop dossiers) — Module 2
-- =====================================================================

create table public.dossiers (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,                  -- "DOS-2026-0142"
  devis_id uuid references public.devis(id) on delete set null,
  client_id uuid not null references public.clients(id) on delete restrict,
  status public.dossier_status not null default 'en_cours',
  total_ttc numeric(12,2) not null,
  acompte_paid boolean not null default false,
  acompte_paid_at timestamptz,
  solde_paid boolean not null default false,
  solde_paid_at timestamptz,
  scheduled_pose_at timestamptz,
  poseur_id uuid references public.profiles(id) on delete set null,
  workshop_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dossiers_status_idx on public.dossiers(status);
create index dossiers_client_idx on public.dossiers(client_id);

-- Items in a dossier (each has a unique QR code) — Module 4
create table public.dossier_items (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  type public.dossier_item_type not null,
  label text not null,
  ref text,                                     -- supplier ref
  supplier_id uuid references public.suppliers(id) on delete set null,
  couturiere_id uuid references public.couturieres(id) on delete set null,
  status public.dossier_item_status not null default 'en_attente',
  qr_code text not null unique,                 -- "QR-A1" — globally unique
  qty numeric(10,3) not null default 1,
  unit_label text not null default 'u',
  expected_at date,
  received_at timestamptz,
  received_by uuid references public.profiles(id) on delete set null,
  notes text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index dossier_items_dossier_idx on public.dossier_items(dossier_id);
create index dossier_items_status_idx on public.dossier_items(status);
create index dossier_items_qr_idx on public.dossier_items(qr_code);

-- =====================================================================
-- TABLE: bons_commande (supplier purchase orders) — Module 3
-- =====================================================================

create table public.bons_commande (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,                  -- "BC-2026-0089"
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  dossier_id uuid references public.dossiers(id) on delete set null,
  status public.bc_status not null default 'brouillon',
  amount_ht numeric(12,2) not null default 0,
  language public.lang not null default 'FR',
  expected_at date,
  received_at timestamptz,
  pdf_url text,
  sent_at timestamptz,
  notes text,
  franco_override boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bons_commande_supplier_idx on public.bons_commande(supplier_id);
create index bons_commande_status_idx on public.bons_commande(status);
create index bons_commande_dossier_idx on public.bons_commande(dossier_id);

create table public.bc_lines (
  id uuid primary key default gen_random_uuid(),
  bc_id uuid not null references public.bons_commande(id) on delete cascade,
  dossier_item_id uuid references public.dossier_items(id) on delete set null,
  position integer not null default 0,
  ref text,
  label text not null,
  qty numeric(10,3) not null default 1,
  unit_label text not null default 'u',
  unit_price_ht numeric(12,2) not null default 0,
  total_ht numeric(12,2) generated always as (round(qty * unit_price_ht, 2)) stored
);

create index bc_lines_bc_idx on public.bc_lines(bc_id);

-- =====================================================================
-- TABLE: poses (installations) — Module 6
-- =====================================================================

create table public.poses (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  status public.pose_status not null default 'a_planifier',
  scheduled_at timestamptz,
  duration_minutes integer not null default 120,
  poseur_id uuid references public.profiles(id) on delete set null,
  address text,
  notes text,
  completed_at timestamptz,
  completion_photo_url text,
  completion_signature_url text,
  client_confirmed boolean not null default false,
  client_confirmed_at timestamptz,
  satisfaction_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index poses_poseur_idx on public.poses(poseur_id);
create index poses_status_idx on public.poses(status);
create index poses_scheduled_idx on public.poses(scheduled_at);

-- =====================================================================
-- TABLE: payments (Stripe + comptoir) — Modules 1 + 8
-- =====================================================================

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  devis_id uuid references public.devis(id) on delete set null,
  dossier_id uuid references public.dossiers(id) on delete set null,
  ticket_id uuid,                               -- linked to caisse_tickets if comptoir
  client_id uuid references public.clients(id) on delete set null,
  kind public.payment_kind not null,
  method public.payment_method not null,
  amount_ttc numeric(12,2) not null,
  stripe_payment_intent_id text unique,
  stripe_charge_id text unique,
  stripe_link_url text,
  cheque_number text,
  reference text,
  notes text,
  paid_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id) on delete set null
);

create index payments_devis_idx on public.payments(devis_id);
create index payments_dossier_idx on public.payments(dossier_id);
create index payments_stripe_pi_idx on public.payments(stripe_payment_intent_id);

-- =====================================================================
-- TABLE: caisse_tickets (POS tickets) — Module 8
-- =====================================================================

create table public.caisse_tickets (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,                  -- "TKT-2026-0312"
  client_id uuid references public.clients(id) on delete set null,
  cashier_id uuid references public.profiles(id) on delete set null,
  total_ht numeric(12,2) not null default 0,
  total_ttc numeric(12,2) not null default 0,
  discount_pct numeric(5,2) not null default 0,
  payment_method public.payment_method not null,
  paid_amount numeric(12,2) not null,
  cash_received numeric(12,2),                  -- for change calculation
  change_due numeric(12,2),
  receipt_email text,
  closure_id uuid,
  created_at timestamptz not null default now()
);

create index caisse_tickets_cashier_idx on public.caisse_tickets(cashier_id);
create index caisse_tickets_created_idx on public.caisse_tickets(created_at);

create table public.caisse_ticket_lines (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.caisse_tickets(id) on delete cascade,
  catalog_product_id uuid references public.catalog_products(id) on delete set null,
  ref text,
  label text not null,
  qty numeric(10,3) not null default 1,
  unit_label text not null default 'u',
  unit_price_ht numeric(12,2) not null,
  total_ht numeric(12,2) generated always as (round(qty * unit_price_ht, 2)) stored,
  position integer not null default 0
);

create index caisse_ticket_lines_ticket_idx on public.caisse_ticket_lines(ticket_id);

-- Daily closures (clôture journalière)
create table public.caisse_closures (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  total_especes numeric(12,2) not null default 0,
  total_cb numeric(12,2) not null default 0,
  total_cheque numeric(12,2) not null default 0,
  total_virement numeric(12,2) not null default 0,
  cash_counted numeric(12,2),
  variance numeric(12,2) generated always as (cash_counted - total_especes) stored,
  closed_by uuid references public.profiles(id) on delete set null,
  closed_at timestamptz,
  exported_to_pennylane boolean not null default false,
  notes text
);

-- =====================================================================
-- TABLE: leroy_merlin_leads — Module 7
-- =====================================================================

create table public.lm_leads (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,                  -- "LM-2026-0212"
  client_id uuid references public.clients(id) on delete set null,
  region text not null,
  product_summary text not null,
  status public.lead_status not null default 'nouveau',
  visio_at timestamptz,
  samples_sent_at timestamptz,
  devis_id uuid references public.devis(id) on delete set null,
  poseur_id uuid references public.profiles(id) on delete set null,
  amount numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- TABLE: sms_templates + sms_log — Module 5
-- =====================================================================

create table public.sms_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,                     -- "devis_envoye", "pose_planifiee" ...
  label text not null,
  body text not null,                           -- "Bonjour {{prenom}}..."
  trigger_description text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.sms_log (
  id uuid primary key default gen_random_uuid(),
  template_key text references public.sms_templates(key) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  to_phone text not null,
  body text not null,
  brevo_message_id text,
  status text not null default 'pending',       -- pending|sent|delivered|failed|bounced
  error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index sms_log_client_idx on public.sms_log(client_id);
create index sms_log_status_idx on public.sms_log(status);

-- =====================================================================
-- TABLE: alerts (system alerts surfaced in dashboard)
-- =====================================================================

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null,                           -- "retard_acompte", "franco", ...
  severity text not null default 'info',        -- "info" | "warning" | "danger"
  title text not null,
  detail text,
  target_url text,
  target_ref text,
  resolved boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index alerts_resolved_idx on public.alerts(resolved) where not resolved;

-- =====================================================================
-- TABLE: notifications (per-user notification center)
-- =====================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  meta text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications(user_id, created_at desc);
create index notifications_unread_idx on public.notifications(user_id) where read_at is null;

-- =====================================================================
-- TABLE: audit_log (security-critical actions)
-- =====================================================================

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,                         -- "devis.created", "payment.recorded", ...
  entity_type text not null,
  entity_id uuid,
  meta jsonb not null default '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log(entity_type, entity_id);
create index audit_log_actor_idx on public.audit_log(actor_id, created_at desc);

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Auto-update updated_at columns
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger clients_updated before update on public.clients
  for each row execute function public.handle_updated_at();
create trigger devis_updated before update on public.devis
  for each row execute function public.handle_updated_at();
create trigger dossiers_updated before update on public.dossiers
  for each row execute function public.handle_updated_at();
create trigger bons_commande_updated before update on public.bons_commande
  for each row execute function public.handle_updated_at();
create trigger poses_updated before update on public.poses
  for each row execute function public.handle_updated_at();
create trigger lm_leads_updated before update on public.lm_leads
  for each row execute function public.handle_updated_at();
create trigger catalog_products_updated before update on public.catalog_products
  for each row execute function public.handle_updated_at();

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(
      (new.raw_user_meta_data->>'role')::public.user_role,
      'commercial'
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Update dossier status when items receive
create or replace function public.refresh_dossier_status()
returns trigger
language plpgsql
as $$
declare
  total_items integer;
  received_items integer;
  in_confection integer;
  new_status public.dossier_status;
begin
  select count(*),
         count(*) filter (where status = 'recu'),
         count(*) filter (where status = 'confection')
  into total_items, received_items, in_confection
  from public.dossier_items
  where dossier_id = coalesce(new.dossier_id, old.dossier_id);

  if total_items = 0 then
    return new;
  elsif received_items = total_items then
    new_status := 'pret_pose';
  elsif in_confection > 0 then
    new_status := 'en_confection';
  elsif received_items > 0 then
    new_status := 'reception_partielle';
  else
    new_status := 'tout_commande';
  end if;

  update public.dossiers
  set status = new_status
  where id = coalesce(new.dossier_id, old.dossier_id)
    and status not in ('planifie', 'pose');

  return new;
end;
$$;

create trigger dossier_items_refresh
  after insert or update of status or delete
  on public.dossier_items
  for each row execute function public.refresh_dossier_status();
