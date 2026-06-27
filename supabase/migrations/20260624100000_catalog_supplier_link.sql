-- =====================================================================
-- Lien catalog_products → suppliers
--
-- Avant : pas de FK supplier sur catalog_products → impossible de
--         grouper automatiquement les lignes d'un devis par fournisseur
--         lors de la génération des BCs.
-- Après : colonne supplier_id nullable. Si renseignée, la ligne devis
--         qui pointe vers ce produit catalogue tombera dans la section
--         de ce fournisseur. Sinon → section "Sans fournisseur".
-- =====================================================================

alter table public.catalog_products
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;

create index if not exists catalog_products_supplier_idx
  on public.catalog_products(supplier_id) where supplier_id is not null;
