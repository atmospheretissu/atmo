-- =====================================================================
-- Table test_runs — historique des parcours de test exécutés depuis /test
--
-- Chaque exécution du wizard (manuelle ou "Lancer le parcours complet")
-- crée une ligne. Les étapes sont append en JSONB au fil de l'eau pour
-- permettre l'audit fin (logs par étape, entités créées, statut final).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.test_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at     TIMESTAMPTZ,
  started_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mode         TEXT NOT NULL DEFAULT 'manual'
                 CHECK (mode IN ('manual', 'auto')),
  status       TEXT NOT NULL DEFAULT 'running'
                 CHECK (status IN ('running', 'success', 'partial', 'failed', 'cancelled')),

  -- Entités créées au fil du parcours (NULL si l'étape n'a pas été atteinte)
  client_id    UUID REFERENCES public.clients(id)   ON DELETE SET NULL,
  devis_id     UUID REFERENCES public.devis(id)     ON DELETE SET NULL,
  dossier_id   UUID REFERENCES public.dossiers(id)  ON DELETE SET NULL,
  pose_id      UUID REFERENCES public.poses(id)     ON DELETE SET NULL,

  -- Résumé textuel + libellé client pour l'affichage liste sans join
  client_label TEXT,
  notes        TEXT,

  -- Tableau des étapes : [{ key, status, message, detail?, logs[], at }]
  steps        JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Compteurs dénormalisés pour tri/filtres rapides
  steps_total  INTEGER NOT NULL DEFAULT 0,
  steps_done   INTEGER NOT NULL DEFAULT 0,
  steps_error  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS test_runs_started_at_idx
  ON public.test_runs (started_at DESC);

CREATE INDEX IF NOT EXISTS test_runs_status_idx
  ON public.test_runs (status, started_at DESC);

-- RLS : tout utilisateur authentifié peut lire ; seul l'admin peut écrire.
-- (Les server actions /test utilisent l'utilisateur connecté.)
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS test_runs_select ON public.test_runs;
CREATE POLICY test_runs_select ON public.test_runs
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS test_runs_insert ON public.test_runs;
CREATE POLICY test_runs_insert ON public.test_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS test_runs_update ON public.test_runs;
CREATE POLICY test_runs_update ON public.test_runs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS test_runs_delete ON public.test_runs;
CREATE POLICY test_runs_delete ON public.test_runs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.test_runs IS
  'Historique des parcours exécutés depuis l''onglet /test (QA admin).';
