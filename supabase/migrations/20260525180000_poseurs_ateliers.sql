-- =====================================================================
-- Tables `poseurs` et `ateliers` — vrais employés / lieux de fabrication
--
-- Avant : poseurs hard-codés dans mock-data.ts, pas d'ateliers gérés.
-- Après : tables dédiées modifiables depuis /parametres, assignées aux
-- poses (poseurs) et aux dossiers de confection (ateliers).
-- =====================================================================

-- ── Poseurs (équipe d'installation à domicile)
CREATE TABLE IF NOT EXISTS public.poseurs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  zone         TEXT, -- ex: "Bordeaux Centre + 30 km"
  internal     BOOLEAN NOT NULL DEFAULT true,
  active       BOOLEAN NOT NULL DEFAULT true,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS poseurs_active_idx ON public.poseurs (active, name);

-- ── Ateliers (lieux de fabrication / couturières / sous-traitants)
--    Distinct de `couturieres` qui peuvent rester pour le concept "personne"
--    mais ici on modélise le LIEU/STRUCTURE à qui on envoie la fiche.
CREATE TABLE IF NOT EXISTS public.ateliers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  contact_name TEXT,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  city         TEXT,
  postal_code  TEXT,
  country      TEXT NOT NULL DEFAULT 'France',
  internal     BOOLEAN NOT NULL DEFAULT false,
  specialties  TEXT[] NOT NULL DEFAULT '{}', -- ex: {rideaux, stores, banquettes}
  capacity     TEXT, -- charge typique ("3 pièces/semaine")
  active       BOOLEAN NOT NULL DEFAULT true,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ateliers_active_idx ON public.ateliers (active, name);

-- ── Lien dossier → atelier (assignation)
ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS atelier_id UUID REFERENCES public.ateliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS atelier_sent_at TIMESTAMPTZ;

-- ── RLS
ALTER TABLE public.poseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ateliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS poseurs_select ON public.poseurs;
CREATE POLICY poseurs_select ON public.poseurs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS poseurs_manage ON public.poseurs;
CREATE POLICY poseurs_manage ON public.poseurs FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS ateliers_select ON public.ateliers;
CREATE POLICY ateliers_select ON public.ateliers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS ateliers_manage ON public.ateliers;
CREATE POLICY ateliers_manage ON public.ateliers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ── Trigger updated_at auto
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS poseurs_touch_updated_at ON public.poseurs;
CREATE TRIGGER poseurs_touch_updated_at BEFORE UPDATE ON public.poseurs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS ateliers_touch_updated_at ON public.ateliers;
CREATE TRIGGER ateliers_touch_updated_at BEFORE UPDATE ON public.ateliers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.poseurs IS 'Équipe poseurs (installation à domicile) — gérée depuis /parametres.';
COMMENT ON TABLE public.ateliers IS 'Ateliers de confection / sous-traitants — assignés aux dossiers depuis la fiche confection.';
