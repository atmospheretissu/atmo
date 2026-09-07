-- Deux fournisseurs différents peuvent utiliser la même référence produit.
-- On remplace donc l'unique(ref) par un unique composite (ref, supplier_name).
-- COALESCE avec chaîne vide pour que 2 lignes sans fournisseur et même ref
-- entrent en conflit (comportement attendu).

alter table public.catalog_products
  drop constraint if exists catalog_products_ref_key;

create unique index if not exists catalog_products_ref_supplier_key
  on public.catalog_products (ref, coalesce(supplier_name, ''));

comment on index public.catalog_products_ref_supplier_key is
  'Clé naturelle composite : (ref + supplier_name). Permet à 2 fournisseurs d''utiliser la même ref pour des produits différents. NULL supplier = coalesce en '''' pour empêcher 2 lignes sans fournisseur avec la même ref.';
