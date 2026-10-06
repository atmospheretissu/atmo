-- ==========================================================================
-- Collection Atmosphère : table de suivi des commandes de confection
--
-- Correction d'un parti pris initial erroné (migration 20261006140000).
-- J'avais traité l'onglet comme une simple vue sur les lignes de dossier
-- marquées `collection`. Or le suivi fourni par David porte 185 commandes
-- de confection déjà existantes — 133 en Pologne, 52 en Ukraine — qui
-- n'ont ni devis ni dossier dans l'outil : elles viennent du suivi tenu
-- jusqu'ici hors logiciel. Une vue ne peut pas les porter.
--
-- D'où une table dédiée, qui réunit les deux origines :
--   • `source = 'import'` — les commandes reprises du suivi existant
--   • `source = 'devis'`  — celles créées automatiquement quand un client
--     accepte un devis comportant un article Collection ; `dossier_item_id`
--     fait alors le lien avec la ligne de dossier correspondante
--   • `source = 'manuel'` — saisie directe depuis l'onglet
--
-- L'atelier est un texte libre et non une référence à `ateliers` :
-- « Pologne » et « Ukraine » désignent ici des usines partenaires qui ne
-- sont pas (encore) des ateliers déclarés, et la reprise des 185 lignes ne
-- doit pas dépendre de la création préalable de fiches.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS public.collection_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rattachement à l'outil, renseigné pour les commandes nées d'un devis.
  -- ON DELETE CASCADE : supprimer la ligne de dossier supprime son suivi,
  -- qui n'aurait plus d'objet.
  dossier_item_id UUID UNIQUE REFERENCES public.dossier_items(id) ON DELETE CASCADE,
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE SET NULL,
  devis_id UUID REFERENCES public.devis(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,

  source TEXT NOT NULL DEFAULT 'manuel',
  statut TEXT NOT NULL DEFAULT 'En cours',

  ref TEXT,
  -- Dénormalisé : les 185 commandes reprises n'ont pas de fiche client dans
  -- l'outil, et le nom reste lisible même si la fiche est supprimée.
  client_name TEXT NOT NULL,
  date_commande DATE,
  atelier TEXT,
  description TEXT,
  fournisseur TEXT,

  date_envoi DATE,          -- envoi à l'atelier
  date_prevue DATE,         -- livraison prévue
  date_butoir DATE,         -- échéance
  retard_source TEXT,       -- retard tel qu'il figurait dans le suivi repris
  date_reception DATE,      -- constatée par Atmosphère → archive la commande

  -- Renseignées par l'usine
  date_reception_tissu DATE,
  date_expedition_usine DATE,

  commentaire TEXT,
  commentaire_sav TEXT,     -- rédigé par Atmosphère, lu par l'usine

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collection_orders_statut_check') THEN
    ALTER TABLE public.collection_orders ADD CONSTRAINT collection_orders_statut_check
      CHECK (statut IN ('En cours', 'Terminée', 'Archivée', 'SAV', 'Annulé'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collection_orders_source_check') THEN
    ALTER TABLE public.collection_orders ADD CONSTRAINT collection_orders_source_check
      CHECK (source IN ('import', 'devis', 'manuel'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS collection_orders_statut_idx ON public.collection_orders (statut);
CREATE INDEX IF NOT EXISTS collection_orders_atelier_idx ON public.collection_orders (atelier);
CREATE INDEX IF NOT EXISTS collection_orders_client_idx ON public.collection_orders (client_id);

COMMENT ON TABLE public.collection_orders IS
  'Suivi des commandes de confection Collection Atmosphère, partagé avec les usines. Réunit le suivi repris de l''existant et les commandes nées d''un devis accepté.';
COMMENT ON COLUMN public.collection_orders.source IS
  'import = repris du suivi existant · devis = créé à l''acceptation d''un devis · manuel = saisi depuis l''onglet.';
COMMENT ON COLUMN public.collection_orders.atelier IS
  'Usine partenaire, en texte libre (Pologne, Ukraine…). Volontairement pas une référence à `ateliers`.';

-- updated_at tenu à jour automatiquement.
CREATE OR REPLACE FUNCTION public.touch_collection_orders()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS collection_orders_touch ON public.collection_orders;
CREATE TRIGGER collection_orders_touch
  BEFORE UPDATE ON public.collection_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_collection_orders();

-- ─── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.collection_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff reads collection orders" ON public.collection_orders;
CREATE POLICY "staff reads collection orders" ON public.collection_orders
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "staff writes collection orders" ON public.collection_orders;
CREATE POLICY "staff writes collection orders" ON public.collection_orders
  FOR INSERT WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "staff updates collection orders" ON public.collection_orders;
CREATE POLICY "staff updates collection orders" ON public.collection_orders
  FOR UPDATE USING (public.is_staff());

DROP POLICY IF EXISTS "staff deletes collection orders" ON public.collection_orders;
CREATE POLICY "staff deletes collection orders" ON public.collection_orders
  FOR DELETE USING (public.is_staff());

-- ─── Les trois colonnes de la migration 20261006140000 déménagent ─────────
-- Elles vivaient sur dossier_items faute de table dédiée. Les garder ferait
-- deux domiciles pour le même fait. Aucune n'avait encore de valeur en base.
ALTER TABLE public.dossier_items
  DROP COLUMN IF EXISTS collection_tissu_recu_at,
  DROP COLUMN IF EXISTS collection_expedie_at,
  DROP COLUMN IF EXISTS sav_comment;
