-- =====================================================================
-- Phase 4 review : pourcentage d'acompte configurable + options client
--
--   - acompte_pct (5,2) : par défaut 50, peut être 100 pour petits montants
--   - acompte_ttc devient generated based on acompte_pct
--   - hide_measurements_for_client : masque les dimensions/laize sur le PDF
--     destiné au client (Atmo voit toujours tout)
--   - client_viewed_at : 1er accès au portail (notif interne)
-- =====================================================================

-- 1. Recrée acompte_ttc comme une colonne calculée à partir de acompte_pct
--    (sinon l'option 100% acompte n'est pas possible avec * 0.5 figé)
ALTER TABLE public.devis
  ADD COLUMN IF NOT EXISTS acompte_pct numeric(5,2) NOT NULL DEFAULT 50;

-- On ne peut pas modifier l'expression d'une GENERATED column → DROP/RECREATE
ALTER TABLE public.devis DROP COLUMN IF EXISTS acompte_ttc;
ALTER TABLE public.devis
  ADD COLUMN acompte_ttc numeric(12,2)
  GENERATED ALWAYS AS (round(total_ttc * acompte_pct / 100.0, 2)) STORED;

-- 2. Options affichage côté client
ALTER TABLE public.devis
  ADD COLUMN IF NOT EXISTS hide_measurements_for_client boolean NOT NULL DEFAULT false;

-- 3. Suivi de la première visite du portail client
ALTER TABLE public.devis
  ADD COLUMN IF NOT EXISTS client_viewed_at timestamptz;

-- Index utile pour requêter les devis non encore vus
CREATE INDEX IF NOT EXISTS devis_client_viewed_idx ON public.devis (client_viewed_at);

COMMENT ON COLUMN public.devis.acompte_pct IS
  'Pourcentage d''acompte (50 par défaut, 100 = paiement intégral à la validation)';
COMMENT ON COLUMN public.devis.hide_measurements_for_client IS
  'Si true, le PDF envoyé au client masque les dimensions / mesures (Atmo voit tout)';
COMMENT ON COLUMN public.devis.client_viewed_at IS
  'Timestamp de la 1ère ouverture du portail client (déclenche notif interne)';
