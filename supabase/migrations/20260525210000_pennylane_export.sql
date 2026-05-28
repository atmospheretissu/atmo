-- =====================================================================
-- Export comptable vers Pennylane — tracking par paiement / ticket
--
-- Ajoute le statut "exporté vers Pennylane" sur les paiements (payments)
-- ET sur les tickets de caisse (caisse_tickets). Permet l'onglet Comptabilité
-- de /caisse qui liste tout et permet l'envoi sélectif vers Pennylane avec
-- double-check.
-- =====================================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS pennylane_exported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pennylane_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS pennylane_export_notes TEXT;

ALTER TABLE public.caisse_tickets
  ADD COLUMN IF NOT EXISTS pennylane_exported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pennylane_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS pennylane_export_notes TEXT;

CREATE INDEX IF NOT EXISTS payments_pennylane_exported_idx
  ON public.payments (pennylane_exported_at);
CREATE INDEX IF NOT EXISTS caisse_tickets_pennylane_exported_idx
  ON public.caisse_tickets (pennylane_exported_at);

COMMENT ON COLUMN public.payments.pennylane_exported_at IS
  'Horodatage d''export vers Pennylane. NULL = pas encore exporté.';
COMMENT ON COLUMN public.caisse_tickets.pennylane_exported_at IS
  'Horodatage d''export vers Pennylane. NULL = pas encore exporté.';
