-- Rend le gros catalogue (47K produits externes) modifiable via l'onglet Data.
-- Auparavant importé statiquement depuis products-catalog.json — désormais
-- persisté en base pour permettre l'édition, l'import CSV et le bulk edit.

alter table public.catalog_products
  add column if not exists supplier_name text,
  add column if not exists catalog_source text not null default 'atmo';

-- unit_price_ht devient nullable : ~1300 produits externes n'ont pas de prix
-- connu ; on les garde en base (active=false) plutôt que de les perdre.
alter table public.catalog_products
  alter column unit_price_ht drop not null;

create index if not exists catalog_supplier_idx
  on public.catalog_products (supplier_name)
  where supplier_name is not null;

create index if not exists catalog_source_idx
  on public.catalog_products (catalog_source);

-- Recherche plein-texte simple sur ref + name + supplier — accélère la
-- recherche caisse / boutique avec 47K lignes.
create index if not exists catalog_ref_lower_idx
  on public.catalog_products (lower(ref));
create index if not exists catalog_name_lower_idx
  on public.catalog_products (lower(name));

comment on column public.catalog_products.supplier_name is
  'Nom du fournisseur externe (CAD, CAL, Casamance…). NULL pour les items de la Collection Atmosphère.';
comment on column public.catalog_products.catalog_source is
  'atmo = Collection Atmosphère (édition métier). external = catalogue fournisseurs importé.';

-- Fonction utilitaire : renvoie la liste distincte des fournisseurs,
-- utilisée par le filtre dans l'onglet Data > Catalogue. On la met en RPC
-- pour éviter que la couche client ait à scanner 45K lignes juste pour
-- déduire les valeurs distinctes.
create or replace function public.distinct_catalog_suppliers()
returns table (supplier_name text)
language sql
security definer
set search_path = public
as $$
  select distinct supplier_name
    from public.catalog_products
   where supplier_name is not null
   order by supplier_name asc
$$;

grant execute on function public.distinct_catalog_suppliers() to authenticated;
