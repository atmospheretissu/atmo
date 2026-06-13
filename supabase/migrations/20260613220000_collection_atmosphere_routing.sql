-- =====================================================================
-- Phase 11 review : Collection Atmosphère — matière + routing fournisseur
--
-- Règles métier (review p.13) :
--   - Tissu d'éditeur (sur mesure classique) → Pologne (Polo)
--   - Collection Atmosphère LIN → Pologne (Polo)
--   - Collection Atmosphère Polyester + confection → Ukraine (XML)
--   - Collection Atmosphère Polyester seul (sans confection) → Pologne (Polo)
-- =====================================================================

-- 1. dossier_items : marqueur "collection Atmosphère" + matière
ALTER TABLE public.dossier_items
  ADD COLUMN IF NOT EXISTS collection boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS matiere text;

COMMENT ON COLUMN public.dossier_items.collection IS
  'Article de la Collection Atmosphère (tissu LIN ou Polyester maison).';
COMMENT ON COLUMN public.dossier_items.matiere IS
  'Matière (lin / polyester / mixte). NULL pour les items hors collection.';

CREATE INDEX IF NOT EXISTS dossier_items_collection_idx
  ON public.dossier_items (collection, matiere)
  WHERE collection = true;

-- 2. bons_commande : matière dominante + routing fournisseur
ALTER TABLE public.bons_commande
  ADD COLUMN IF NOT EXISTS matiere text,
  ADD COLUMN IF NOT EXISTS routing text NOT NULL DEFAULT 'standard';

COMMENT ON COLUMN public.bons_commande.matiere IS
  'Matière dominante du BC : lin / polyester / mixte. NULL pour BC classique.';
COMMENT ON COLUMN public.bons_commande.routing IS
  'Acheminement : standard (fournisseur classique), pologne (Polo BC), ukraine (XML).';

CREATE INDEX IF NOT EXISTS bons_commande_routing_idx
  ON public.bons_commande (routing, status)
  WHERE routing <> 'standard';
