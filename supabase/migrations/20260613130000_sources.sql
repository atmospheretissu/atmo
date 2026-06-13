-- =====================================================================
-- Sources personnalisables (étiquettes canal/origine)
--
-- Avant : enum `channel` figé (magasin, leroy_merlin, ecommerce, decoratrice, visio)
-- Après : table `sources` éditable (admin/resp_magasin) + colonne source_id
--         sur devis et clients qui prend le pas sur l'enum si renseignée.
--
-- L'enum existant reste pour compat — sera retiré en Phase 2.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT 'muted',
  active      BOOLEAN NOT NULL DEFAULT true,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sources_active_idx ON public.sources (active, position);

-- ── Pre-seed avec les sources actuelles + Saint Maclou (mentionné dans la review)
INSERT INTO public.sources (key, label, color, position) VALUES
  ('magasin',       'Magasin',        'ink',    0),
  ('leroy_merlin',  'Leroy Merlin',   'orange', 1),
  ('saint_maclou',  'Saint Maclou',   'amber',  2),
  ('ecommerce',     'E-commerce',     'blue',   3),
  ('decoratrice',   'Décoratrice',    'pink',   4),
  ('visio',         'Visio',          'violet', 5)
ON CONFLICT (key) DO NOTHING;

-- ── Lien devis → source
ALTER TABLE public.devis
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS devis_source_id_idx ON public.devis (source_id);

-- ── Lien clients → source (override le channel par défaut)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS clients_source_id_idx ON public.clients (source_id);

-- ── Backfill : mappe les channels enum vers les nouvelles sources
UPDATE public.devis d
SET source_id = s.id
FROM public.sources s
WHERE d.source_id IS NULL
  AND s.key = d.channel::text;

UPDATE public.clients c
SET source_id = s.id
FROM public.sources s
WHERE c.source_id IS NULL
  AND s.key = c.channel::text;

-- ── RLS : tous lus, admin/resp manage
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sources_select ON public.sources;
CREATE POLICY sources_select ON public.sources FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS sources_manage ON public.sources;
CREATE POLICY sources_manage ON public.sources FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP TRIGGER IF EXISTS sources_touch_updated_at ON public.sources;
CREATE TRIGGER sources_touch_updated_at BEFORE UPDATE ON public.sources
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.sources IS
  'Étiquettes source/canal personnalisables (Magasin, Leroy Merlin, Saint Maclou, +autres). Remplace progressivement l''enum channel.';
