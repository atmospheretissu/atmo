-- =====================================================================
-- Migration des statuts dossiers existants vers le nouveau workflow
-- (séparé de la migration d'ajout d'enum values car ALTER TYPE doit
--  être commité avant qu'on puisse utiliser les nouvelles valeurs)
-- =====================================================================

-- Mapping ancien → nouveau :
--   en_cours              → attente_matiere   (en attente que les fournisseurs livrent)
--   tout_commande         → attente_matiere   (tout est commandé, on attend)
--   reception_partielle   → attente_matiere   (partiellement reçu)
--   en_confection         → confection_en_cours (déjà similaire)
--   pret_pose             → pret_pose         (inchangé)
--   planifie              → pose_a_venir      (renommage)
--   pose                  → cloture           (projet terminé)

UPDATE public.dossiers SET status = 'attente_matiere', attente_matiere_at = COALESCE(updated_at, created_at)
  WHERE status::text IN ('en_cours', 'tout_commande', 'reception_partielle');

UPDATE public.dossiers SET status = 'confection_en_cours', confection_started_at = COALESCE(updated_at, created_at)
  WHERE status::text = 'en_confection';

UPDATE public.dossiers SET status = 'pose_a_venir'
  WHERE status::text = 'planifie';

UPDATE public.dossiers SET status = 'cloture', cloture_at = COALESCE(updated_at, created_at)
  WHERE status::text = 'pose';
