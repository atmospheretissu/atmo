-- =====================================================================
-- Phase 6 review : date limite atelier + notes/commentaires sur dossier
--
--   - dossiers.atelier_deadline_at : J+10 calculé auto à l'envoi à l'atelier
--   - Table dossier_notes : commentaires internes (auteur, body, timestamps)
-- =====================================================================

-- 1. Deadline atelier
ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS atelier_deadline_at TIMESTAMPTZ;

COMMENT ON COLUMN public.dossiers.atelier_deadline_at IS
  'Date limite de retour de confection (J+10 après envoi à l''atelier par défaut, modifiable manuellement).';

-- Trigger : à l'envoi à l'atelier, pré-remplit la deadline J+10 si NULL
CREATE OR REPLACE FUNCTION public.set_atelier_deadline_on_send()
RETURNS trigger
LANGUAGE plpgsql
AS $$
begin
  if new.atelier_sent_at is not null
     and (old.atelier_sent_at is distinct from new.atelier_sent_at)
     and new.atelier_deadline_at is null then
    new.atelier_deadline_at := new.atelier_sent_at + interval '10 days';
  end if;
  return new;
end;
$$;

DROP TRIGGER IF EXISTS dossiers_set_atelier_deadline ON public.dossiers;
CREATE TRIGGER dossiers_set_atelier_deadline
  BEFORE UPDATE OF atelier_sent_at ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.set_atelier_deadline_on_send();

-- 2. Table de notes/commentaires sur un dossier
CREATE TABLE IF NOT EXISTS public.dossier_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL,
  -- 'internal' (visible Atmo uniquement) ou 'atelier' (réservé pour future
  -- messagerie atelier — pour l'instant tous internes)
  kind text NOT NULL DEFAULT 'internal',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dossier_notes_dossier_idx
  ON public.dossier_notes (dossier_id, created_at DESC);

ALTER TABLE public.dossier_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dossier_notes_select ON public.dossier_notes;
CREATE POLICY dossier_notes_select ON public.dossier_notes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS dossier_notes_insert ON public.dossier_notes;
CREATE POLICY dossier_notes_insert ON public.dossier_notes
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS dossier_notes_delete ON public.dossier_notes;
CREATE POLICY dossier_notes_delete ON public.dossier_notes
  FOR DELETE TO authenticated USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
