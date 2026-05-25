-- =====================================================================
-- Re-pointage de poses.poseur_id : profiles → poseurs
--
-- Avant : poses.poseur_id REFERENCES profiles(id)
--   → utilisable uniquement avec des comptes profil, pas adapté à la
--   gestion d'équipe (sous-traitants, employés sans login Supabase, etc.)
--
-- Après : poses.poseur_id REFERENCES poseurs(id)
--   → s'aligne avec l'UI /parametres → Équipe et le sélecteur de la fiche
--   pose.
--
-- Toutes les valeurs actuelles de poses.poseur_id sont NULL, donc safe.
-- =====================================================================

ALTER TABLE public.poses
  DROP CONSTRAINT IF EXISTS poses_poseur_id_fkey;

ALTER TABLE public.poses
  ADD CONSTRAINT poses_poseur_id_fkey
  FOREIGN KEY (poseur_id) REFERENCES public.poseurs(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.poses.poseur_id IS
  'Référence à public.poseurs (équipe interne ou sous-traitants gérés dans /parametres).';
