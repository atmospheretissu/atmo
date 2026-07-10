-- =====================================================================
-- Ajoute un champ decoratrice_id sur les devis
-- Référence un profil (rôle decoratrice) qui a suivi le devis avec le
-- client. Utilisé pour reporting + affichage sur le devis.
-- =====================================================================

alter table public.devis
  add column if not exists decoratrice_id uuid
    references public.profiles(id) on delete set null;

create index if not exists devis_decoratrice_idx
  on public.devis(decoratrice_id) where decoratrice_id is not null;
