-- =====================================================================
-- Disponibilités des poseurs
--
-- Un poseur (ou un admin pour son compte) déclare des créneaux disponibles
-- (date + créneau matin/après-midi/journée) sur lesquels le staff peut
-- ensuite planifier des poses depuis l'agenda.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.poseur_availabilities (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poseur_id      UUID NOT NULL REFERENCES public.poseurs(id) ON DELETE CASCADE,
  date           DATE NOT NULL,
  slot           TEXT NOT NULL CHECK (slot IN ('morning', 'afternoon', 'day')),
  status         TEXT NOT NULL DEFAULT 'available'
                   CHECK (status IN ('available', 'booked', 'blocked')),
  -- Si booked : lien vers la pose créée
  pose_id        UUID REFERENCES public.poses(id) ON DELETE SET NULL,
  -- Notes libres du poseur (ex: "disponible seulement matin", "évite Bordeaux Centre")
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poseur_id, date, slot)
);

CREATE INDEX IF NOT EXISTS poseur_availabilities_poseur_date_idx
  ON public.poseur_availabilities (poseur_id, date);
CREATE INDEX IF NOT EXISTS poseur_availabilities_date_status_idx
  ON public.poseur_availabilities (date, status);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tick_poseur_availabilities_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  new.updated_at := now();
  RETURN new;
END;
$$;
DROP TRIGGER IF EXISTS poseur_availabilities_touched ON public.poseur_availabilities;
CREATE TRIGGER poseur_availabilities_touched
  BEFORE UPDATE ON public.poseur_availabilities
  FOR EACH ROW EXECUTE FUNCTION public.tick_poseur_availabilities_updated_at();

-- RLS
ALTER TABLE public.poseur_availabilities ENABLE ROW LEVEL SECURITY;

-- Lecture : staff + le poseur concerné (via profile_id)
DROP POLICY IF EXISTS "read poseur availabilities" ON public.poseur_availabilities;
CREATE POLICY "read poseur availabilities" ON public.poseur_availabilities
  FOR SELECT USING (
    public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.poseurs p
      WHERE p.id = poseur_availabilities.poseur_id
        AND p.profile_id = auth.uid()
    )
  );

-- Écriture : staff peut tout ; poseur peut créer/modifier/supprimer SES créneaux
--            uniquement s'ils sont "available" (pas encore booked)
DROP POLICY IF EXISTS "staff writes poseur availabilities" ON public.poseur_availabilities;
CREATE POLICY "staff writes poseur availabilities" ON public.poseur_availabilities
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "poseur manages own availabilities" ON public.poseur_availabilities;
CREATE POLICY "poseur manages own availabilities" ON public.poseur_availabilities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.poseurs p
      WHERE p.id = poseur_availabilities.poseur_id
        AND p.profile_id = auth.uid()
    )
    AND status = 'available'
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.poseurs p
      WHERE p.id = poseur_availabilities.poseur_id
        AND p.profile_id = auth.uid()
    )
    AND status = 'available'
  );
