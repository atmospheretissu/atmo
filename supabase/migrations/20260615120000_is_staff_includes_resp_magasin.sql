-- =====================================================================
-- Fix RLS : is_staff() n'incluait pas le rôle resp_magasin (ajouté Phase 2)
-- → tout resp_magasin (responsable de magasin) se prenait un RLS deny en
--   essayant d'encaisser à la caisse / créer un ticket, créer un BC, etc.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid())
      IN ('admin', 'resp_magasin', 'commercial', 'resp_confection', 'decoratrice'),
    false
  );
$$;
