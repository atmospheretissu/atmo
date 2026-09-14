-- ==========================================================================
-- Progression linéaire du statut devis : ajout de "solde_recu"
--
-- Avant : brouillon → envoye → valide → acompte_recu (fin)
-- Après : brouillon → envoye → valide → acompte_recu → solde_recu (fin)
--
-- Motivation (David, 14/09/2026) : le paiement du solde ne faisait avancer
-- QUE dossier.solde_paid, jamais devis.status. Résultat visuel absurde :
-- le devis affichait "Acompte reçu" alors que la barre de paiement montrait
-- 100% payé (acompte + solde). L'utilisateur voyait "brouillon avec acompte
-- payé" et "acompte reçu avec tout payé" — incohérent.
--
-- Postgres exige que ALTER TYPE ... ADD VALUE soit hors transaction pour
-- les nouvelles valeurs → wrapper DO $$ ... EXCEPTION pour idempotence.
-- ==========================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.devis_status'::regtype
      AND enumlabel = 'solde_recu'
  ) THEN
    ALTER TYPE public.devis_status ADD VALUE 'solde_recu' AFTER 'acompte_recu';
  END IF;
END$$;
