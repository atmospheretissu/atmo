-- =====================================================================
-- Grilles tarifaires "New Collection Atmosphère" en base
-- Remplace le JSON statique src/lib/boutique/new-collection-tarifs.json
-- par un stockage éditable depuis /paramètres → Boutique tarifs
-- =====================================================================

create table if not exists public.boutique_tarif_tissus (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,        -- 'rideau' | 'store_bateau' | 'store_enrouleur' | 'store_screen'
  family text not null,           -- 'LIN' | 'POLYESTER' | 'POLYESTER_DOUBLE' | 'COLLECTION'
  laize_cm integer,
  coefficient numeric(5,3),
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, category, family)
);

create index if not exists boutique_tarif_tissus_cat_idx
  on public.boutique_tarif_tissus (category, family, active);

create table if not exists public.boutique_tarif_grids (
  id uuid primary key default gen_random_uuid(),
  tissu_id uuid not null references public.boutique_tarif_tissus(id) on delete cascade,
  confection text not null,      -- 'pli_simple' | 'wave' | 'oeillet' | 'store'
  largeurs jsonb not null,        -- number[] — seuils largeur en cm
  hauteurs jsonb not null,        -- number[] — seuils hauteur en cm
  grid jsonb not null,            -- number[][] — grid[i_hauteur][i_largeur] = prix HT
  updated_at timestamptz not null default now(),
  unique (tissu_id, confection)
);

create index if not exists boutique_tarif_grids_tissu_idx
  on public.boutique_tarif_grids (tissu_id);

-- Trigger updated_at
create or replace function public.tick_boutique_tarifs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists boutique_tarif_tissus_touched on public.boutique_tarif_tissus;
create trigger boutique_tarif_tissus_touched
  before update on public.boutique_tarif_tissus
  for each row execute function public.tick_boutique_tarifs_updated_at();

drop trigger if exists boutique_tarif_grids_touched on public.boutique_tarif_grids;
create trigger boutique_tarif_grids_touched
  before update on public.boutique_tarif_grids
  for each row execute function public.tick_boutique_tarifs_updated_at();

-- RLS
alter table public.boutique_tarif_tissus enable row level security;
alter table public.boutique_tarif_grids enable row level security;

drop policy if exists "staff reads boutique_tarif_tissus" on public.boutique_tarif_tissus;
create policy "staff reads boutique_tarif_tissus" on public.boutique_tarif_tissus
  for select using (auth.role() = 'authenticated');
drop policy if exists "staff writes boutique_tarif_tissus" on public.boutique_tarif_tissus;
create policy "staff writes boutique_tarif_tissus" on public.boutique_tarif_tissus
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff reads boutique_tarif_grids" on public.boutique_tarif_grids;
create policy "staff reads boutique_tarif_grids" on public.boutique_tarif_grids
  for select using (auth.role() = 'authenticated');
drop policy if exists "staff writes boutique_tarif_grids" on public.boutique_tarif_grids;
create policy "staff writes boutique_tarif_grids" on public.boutique_tarif_grids
  for all using (public.is_staff()) with check (public.is_staff());
