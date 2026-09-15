-- ==========================================================================
-- Atmolead : artefacts de débogage + circuit-breaker + kill-switch
--
-- Contexte (David, 15/09/2026) : le scraper LM est en échec depuis 4 jours
-- sans aucune alerte, 96 runs/jour continuent d'échouer, personne ne s'en
-- rend compte. Il manquait :
--   1. Une trace Playwright/screenshot téléchargeable pour diagnostiquer
--      pourquoi le login échoue (LM a changé son portail, MFA, RGPD, etc.)
--   2. Un circuit-breaker qui pause automatiquement le cron après N échecs
--      consécutifs et prévient l'admin par email
--   3. Un kill-switch via config DB pour arrêter tout de suite
-- ==========================================================================

-- 1. Colonnes pour artefacts (screenshot + trace Playwright)
ALTER TABLE public.atmolead_executions
  ADD COLUMN IF NOT EXISTS screenshot_path TEXT,
  ADD COLUMN IF NOT EXISTS trace_path TEXT;

COMMENT ON COLUMN public.atmolead_executions.screenshot_path IS
  'Chemin (bucket "atmolead-artifacts") du screenshot pris au moment de l''échec. NULL si run OK ou si capture impossible.';
COMMENT ON COLUMN public.atmolead_executions.trace_path IS
  'Chemin (bucket "atmolead-artifacts") de la trace Playwright (.zip) — ouvre-la avec `npx playwright show-trace <path>`.';

-- 2. Circuit-breaker sur atmolead_config
ALTER TABLE public.atmolead_config
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_reason TEXT,
  ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER DEFAULT 0;

COMMENT ON COLUMN public.atmolead_config.paused_at IS
  'Non-null = le worker skippe toute exécution jusqu''à ce que quelqu''un remette à NULL. Set auto par le circuit-breaker après 5 échecs d''affilée.';
COMMENT ON COLUMN public.atmolead_config.paused_reason IS
  'Motif du pause (ex: "5 échecs consécutifs — dernier : timeout login LM").';

-- 3. Bucket Storage pour les artefacts (privé — service-role seule y accède,
--    l'UI passe par une signed URL temporaire générée par une action serveur)
INSERT INTO storage.buckets (id, name, public)
VALUES ('atmolead-artifacts', 'atmolead-artifacts', false)
ON CONFLICT (id) DO NOTHING;

-- 4. RLS sur le bucket : personne côté client, seul le service_role
--    (qui bypasse RLS par nature) peut lire/écrire.
DROP POLICY IF EXISTS "atmolead_artifacts_no_direct_access" ON storage.objects;
CREATE POLICY "atmolead_artifacts_no_direct_access"
  ON storage.objects FOR ALL
  USING (bucket_id = 'atmolead-artifacts' AND false)
  WITH CHECK (bucket_id = 'atmolead-artifacts' AND false);
