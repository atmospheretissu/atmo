-- =====================================================================
-- RLS pour couturiere_externe :
--   - is_workshop() inclut désormais ce rôle → INSERT/UPDATE
--     dossier_items + UPDATE dossiers (statut)
--   - SELECT explicite sur toutes les dossiers + dossier_items
--   - SELECT sur clients (nom uniquement nécessaire pour l'affichage)
--     et sur devis_lines (mesures/références des confections)
-- =====================================================================

create or replace function public.is_workshop()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid())
      in ('admin', 'resp_confection', 'couturiere', 'couturiere_externe'),
    false
  );
$$;

-- Lecture explicite des dossiers : la couturière externe voit TOUTES
-- les fiches de confection (pas de système d'assignation pour l'instant).
drop policy if exists "couturiere_externe reads all dossiers" on public.dossiers;
create policy "couturiere_externe reads all dossiers" on public.dossiers
  for select using (
    (select role from public.profiles where id = auth.uid()) = 'couturiere_externe'
  );

-- dossier_items et clients/devis_lines sont déjà ouverts en lecture aux
-- utilisateurs authentifiés (auth.role() = 'authenticated') → la couturière
-- externe y a accès. Les écritures sur dossier_items passent par
-- is_workshop() qui inclut maintenant le rôle.
