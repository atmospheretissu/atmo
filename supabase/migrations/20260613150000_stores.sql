-- =====================================================================
-- Multi-entités magasin
--
-- Selon spec :
--   - Multi-entités UNIQUEMENT pour devis, factures, dossiers, paiements,
--     caisse_tickets, clients
--   - Restent globaux : config, templates SMS/email, articles catalogue,
--     poseurs, ateliers, fournisseurs (partagés entre tous les magasins)
--
-- Permissions : admin global voit tout, resp_magasin voit son entité.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  short_name  TEXT,           -- ex: "Marquette" pour affichage compact
  address     TEXT,
  city        TEXT,
  postal_code TEXT,
  phone       TEXT,
  email       TEXT,
  color       TEXT NOT NULL DEFAULT 'violet', -- pour le pill workspace
  active      BOOLEAN NOT NULL DEFAULT true,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stores_active_idx ON public.stores (active, position);

-- ── Pre-seed avec les magasins mentionnés dans la review
INSERT INTO public.stores (slug, name, short_name, city, color, position) VALUES
  ('marquette',  'Atmosphère',       'Marquette',  'Marquette-Lez-Lille', 'violet',  0),
  ('lambersart', 'Little Atmosphère', 'Lambersart', 'Lambersart',          'emerald', 1)
ON CONFLICT (slug) DO NOTHING;

-- ── store_id sur les tables transactionnelles
ALTER TABLE public.devis
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.caisse_tickets
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS devis_store_id_idx ON public.devis (store_id);
CREATE INDEX IF NOT EXISTS dossiers_store_id_idx ON public.dossiers (store_id);
CREATE INDEX IF NOT EXISTS payments_store_id_idx ON public.payments (store_id);
CREATE INDEX IF NOT EXISTS caisse_tickets_store_id_idx ON public.caisse_tickets (store_id);
CREATE INDEX IF NOT EXISTS clients_store_id_idx ON public.clients (store_id);

-- ── Backfill : tout l'existant est rattaché au premier magasin par défaut
WITH default_store AS (
  SELECT id FROM public.stores ORDER BY position LIMIT 1
)
UPDATE public.devis SET store_id = (SELECT id FROM default_store) WHERE store_id IS NULL;

WITH default_store AS (
  SELECT id FROM public.stores ORDER BY position LIMIT 1
)
UPDATE public.dossiers SET store_id = (SELECT id FROM default_store) WHERE store_id IS NULL;

WITH default_store AS (
  SELECT id FROM public.stores ORDER BY position LIMIT 1
)
UPDATE public.payments SET store_id = (SELECT id FROM default_store) WHERE store_id IS NULL;

WITH default_store AS (
  SELECT id FROM public.stores ORDER BY position LIMIT 1
)
UPDATE public.caisse_tickets SET store_id = (SELECT id FROM default_store) WHERE store_id IS NULL;

WITH default_store AS (
  SELECT id FROM public.stores ORDER BY position LIMIT 1
)
UPDATE public.clients SET store_id = (SELECT id FROM default_store) WHERE store_id IS NULL;

-- ── Rattachement profil → magasin par défaut (pour les resp_magasin)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS profiles_store_id_idx ON public.profiles (store_id);

-- ── Rôle resp_magasin (responsable d'un magasin) — étendre l'enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'resp_magasin'
      AND enumtypid = 'public.user_role'::regtype
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'resp_magasin';
  END IF;
END$$;

-- ── RLS stores : tout lu, admin manage
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stores_select ON public.stores;
CREATE POLICY stores_select ON public.stores FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS stores_manage ON public.stores;
CREATE POLICY stores_manage ON public.stores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP TRIGGER IF EXISTS stores_touch_updated_at ON public.stores;
CREATE TRIGGER stores_touch_updated_at BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.stores IS
  'Entités magasin (multi-magasin). Seules les transactions (devis, factures, dossiers, paiements, caisse) sont scopées par store. Config, templates, articles, équipe restent globaux.';
