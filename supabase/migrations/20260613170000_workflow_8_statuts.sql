-- =====================================================================
-- Nouveau workflow 8 statuts + SAV (review client)
--
-- Étapes voulues (du devis à la clôture) :
--   1. DEVIS                              (côté table devis)
--   2. COMMANDE VALIDE - ACOMPTE REÇU     (côté devis 'acompte_recu' + dossier nouveau statut 'commande_validee')
--   3. ATTENTE MATIÈRE                    → nouveau statut dossier 'attente_matiere'  (alerte >10j)
--   4. CONFECTION EN COURS                → dossier 'confection_en_cours'             (alerte >12j)
--   5. PRÊT POUR LA POSE                  → dossier 'pret_pose' (existant)
--   6. POSE À PLANIFIER - SOLDE REÇU      → dossier 'pose_a_planifier' (solde reçu, à planifier la pose)
--   7. POSE À VENIR                       → dossier 'pose_a_venir' (planifié + créneau confirmé)
--   8. CLÔTURE                            → dossier 'cloture'
-- + Statut SAV                            → 'sav' (service après-vente, indépendant)
--
-- Stratégie :
--   - Ajouter les nouvelles valeurs à l'enum (ALTER TYPE ADD VALUE) — non destructif
--   - Migrer les dossiers existants vers les nouveaux statuts
--   - Conserver les anciens statuts dans l'enum pour rétrocompat (DB triggers)
-- =====================================================================

-- 1. Ajouter les nouveaux statuts à l'enum (commit par valeur car ALTER TYPE ADD VALUE
--    ne peut pas tourner dans une transaction multi-statements selon la version Postgres)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'commande_validee' AND enumtypid = 'public.dossier_status'::regtype) THEN
    ALTER TYPE public.dossier_status ADD VALUE 'commande_validee';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'attente_matiere' AND enumtypid = 'public.dossier_status'::regtype) THEN
    ALTER TYPE public.dossier_status ADD VALUE 'attente_matiere';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'confection_en_cours' AND enumtypid = 'public.dossier_status'::regtype) THEN
    ALTER TYPE public.dossier_status ADD VALUE 'confection_en_cours';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pose_a_planifier' AND enumtypid = 'public.dossier_status'::regtype) THEN
    ALTER TYPE public.dossier_status ADD VALUE 'pose_a_planifier';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pose_a_venir' AND enumtypid = 'public.dossier_status'::regtype) THEN
    ALTER TYPE public.dossier_status ADD VALUE 'pose_a_venir';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cloture' AND enumtypid = 'public.dossier_status'::regtype) THEN
    ALTER TYPE public.dossier_status ADD VALUE 'cloture';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'sav' AND enumtypid = 'public.dossier_status'::regtype) THEN
    ALTER TYPE public.dossier_status ADD VALUE 'sav';
  END IF;
END$$;

-- 2. Colonnes additionnelles pour suivre les transitions dans le temps (pour les alertes retard)
ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS attente_matiere_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confection_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pret_pose_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cloture_at TIMESTAMPTZ;

-- Index pour les requêtes d'alerte (dossiers en retard)
CREATE INDEX IF NOT EXISTS dossiers_attente_matiere_idx ON public.dossiers (status, attente_matiere_at);
CREATE INDEX IF NOT EXISTS dossiers_confection_started_idx ON public.dossiers (status, confection_started_at);
