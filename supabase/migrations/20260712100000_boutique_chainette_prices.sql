-- Tarifs éditables des couleurs de chaînette (store bateau).
create table if not exists public.boutique_chainette_prices (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  price numeric(10, 2) not null default 0,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists boutique_chainette_prices_active_idx
  on public.boutique_chainette_prices (active, position);

drop trigger if exists boutique_chainette_prices_touched on public.boutique_chainette_prices;
create trigger boutique_chainette_prices_touched
  before update on public.boutique_chainette_prices
  for each row execute function public.tick_boutique_tarifs_updated_at();

alter table public.boutique_chainette_prices enable row level security;

drop policy if exists "staff reads boutique_chainette_prices" on public.boutique_chainette_prices;
create policy "staff reads boutique_chainette_prices" on public.boutique_chainette_prices
  for select using (public.is_staff());

drop policy if exists "staff writes boutique_chainette_prices" on public.boutique_chainette_prices;
create policy "staff writes boutique_chainette_prices" on public.boutique_chainette_prices
  for all using (public.is_staff()) with check (public.is_staff());

-- Seed initial : blanc offert, autres à 4,42 €.
insert into public.boutique_chainette_prices (code, label, price, position) values
  ('blanc', 'Blanc', 0.00, 0),
  ('alu', 'Aluminium', 4.42, 1),
  ('noir', 'Noir', 4.42, 2),
  ('laiton', 'Laiton', 4.42, 3)
on conflict (code) do nothing;
