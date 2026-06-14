-- =====================================================================
-- Module SAV : tickets attachables à un client, devis ou dossier
-- Kanban : nouveau → en_cours → resolu / annule
-- Assignable à un profile de l'équipe
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sav_status') THEN
    CREATE TYPE public.sav_status AS ENUM ('nouveau', 'en_cours', 'resolu', 'annule');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sav_priority') THEN
    CREATE TYPE public.sav_priority AS ENUM ('normale', 'haute', 'urgente');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.sav_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,                       -- SAV-2026-0001
  -- Lien vers l'entité d'origine (au moins UN des trois)
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  devis_id uuid REFERENCES public.devis(id) ON DELETE SET NULL,
  dossier_id uuid REFERENCES public.dossiers(id) ON DELETE SET NULL,
  -- Contenu
  title text NOT NULL,
  description text,
  priority public.sav_priority NOT NULL DEFAULT 'normale',
  status public.sav_status NOT NULL DEFAULT 'nouveau',
  -- Assignation
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Multi-magasin
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  -- Suivi temps
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  -- Au moins une référence
  CONSTRAINT sav_ticket_has_target CHECK (
    client_id IS NOT NULL OR devis_id IS NOT NULL OR dossier_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS sav_tickets_status_idx ON public.sav_tickets (status, created_at DESC);
CREATE INDEX IF NOT EXISTS sav_tickets_assigned_idx ON public.sav_tickets (assigned_to);
CREATE INDEX IF NOT EXISTS sav_tickets_client_idx ON public.sav_tickets (client_id);
CREATE INDEX IF NOT EXISTS sav_tickets_dossier_idx ON public.sav_tickets (dossier_id);

-- Messages / commentaires d'un ticket
CREATE TABLE IF NOT EXISTS public.sav_ticket_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.sav_tickets(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sav_ticket_notes_ticket_idx
  ON public.sav_ticket_notes (ticket_id, created_at DESC);

-- updated_at automatique
CREATE OR REPLACE FUNCTION public.sav_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'resolu' AND (OLD.status IS DISTINCT FROM 'resolu') THEN
    NEW.resolved_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sav_tickets_touch ON public.sav_tickets;
CREATE TRIGGER sav_tickets_touch
  BEFORE UPDATE ON public.sav_tickets
  FOR EACH ROW EXECUTE FUNCTION public.sav_touch_updated_at();

-- RLS
ALTER TABLE public.sav_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sav_ticket_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sav_tickets_select ON public.sav_tickets;
CREATE POLICY sav_tickets_select ON public.sav_tickets
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS sav_tickets_write ON public.sav_tickets;
CREATE POLICY sav_tickets_write ON public.sav_tickets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS sav_notes_select ON public.sav_ticket_notes;
CREATE POLICY sav_notes_select ON public.sav_ticket_notes
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS sav_notes_insert ON public.sav_ticket_notes;
CREATE POLICY sav_notes_insert ON public.sav_ticket_notes
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS sav_notes_delete ON public.sav_ticket_notes;
CREATE POLICY sav_notes_delete ON public.sav_ticket_notes
  FOR DELETE TO authenticated USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
