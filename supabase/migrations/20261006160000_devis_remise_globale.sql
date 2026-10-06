-- ==========================================================================
-- Remise globale sur les devis
--
-- Demande Pauline (06/10/2026) : « nous ne pouvons pas effectuer une remise
-- sur les devis pour le client ». C'était exact, et sans contournement : le
-- formulaire d'édition refuse explicitement un prix unitaire négatif, donc
-- même une ligne « Remise −50 € » était impossible. Le seul recours était de
-- bidouiller les prix unitaires, ce qui fausse les tarifs montrés au client.
--
-- ─── Parti pris : total_ht reste le montant FINAL ─────────────────────────
-- Le total du devis irrigue toute la chaîne : acompte, PDF, page de
-- signature, montant Stripe, facture, export Pennylane. Plutôt que
-- d'apprendre la remise à chacun de ces consommateurs, on garde
-- `total_ht` / `total_ttc` comme montants NETS, remise déduite, et on
-- ajoute `subtotal_ht` pour le montant brut. Tout l'existant continue donc
-- de fonctionner sans modification, et l'affichage de la remise devient un
-- simple enrichissement.
--
-- Deux formes acceptées, comme chez Axonaut : un pourcentage ou un montant
-- fixe en euros HT. `discount_kind` dit laquelle lire dans
-- `discount_value`, ce qui évite d'avoir deux colonnes dont une toujours
-- vide et de deviner laquelle fait foi.
-- ==========================================================================

ALTER TABLE public.devis
  ADD COLUMN IF NOT EXISTS subtotal_ht NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS discount_kind TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason TEXT;

-- Le contrôle est posé à part pour rester rejouable : ADD CONSTRAINT n'a
-- pas de IF NOT EXISTS avant PostgreSQL 17.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'devis_discount_kind_check'
  ) THEN
    ALTER TABLE public.devis
      ADD CONSTRAINT devis_discount_kind_check
      CHECK (discount_kind IN ('none', 'pct', 'amount'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'devis_discount_value_check'
  ) THEN
    ALTER TABLE public.devis
      ADD CONSTRAINT devis_discount_value_check
      CHECK (discount_value >= 0 AND (discount_kind <> 'pct' OR discount_value <= 100));
  END IF;
END $$;

COMMENT ON COLUMN public.devis.subtotal_ht IS
  'Total HT des lignes AVANT remise. total_ht reste le montant net, remise déduite, pour que acompte / Stripe / facture / Pennylane restent inchangés.';
COMMENT ON COLUMN public.devis.discount_kind IS
  'none | pct (pourcentage) | amount (montant fixe en euros HT). Dit comment lire discount_value.';
COMMENT ON COLUMN public.devis.discount_value IS
  'Valeur de la remise : un pourcentage de 0 à 100 si discount_kind = pct, un montant en euros HT si amount.';
COMMENT ON COLUMN public.devis.discount_reason IS
  'Motif de la remise, libre. Repris sur le PDF et utile à la compta.';

-- Backfill : sans remise, le brut égale le net.
UPDATE public.devis
SET subtotal_ht = total_ht
WHERE subtotal_ht IS NULL;
