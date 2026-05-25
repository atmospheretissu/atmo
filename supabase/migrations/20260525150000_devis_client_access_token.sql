-- =====================================================================
-- Espace client : token d'accès URL par devis (auth sans mot de passe)
--
-- Chaque devis reçoit un UUID unique servi dans l'email comme lien direct
-- vers l'espace client (atmospheretissus.fr/c/{token}). Pas d'auth requise —
-- la possession du lien (qui n'est partagé qu'avec le client) fait foi.
-- =====================================================================

ALTER TABLE public.devis
  ADD COLUMN IF NOT EXISTS client_access_token TEXT
    NOT NULL
    DEFAULT gen_random_uuid()::text;

-- Garantit l'unicité — empêche aussi tout collision théorique.
CREATE UNIQUE INDEX IF NOT EXISTS devis_client_access_token_key
  ON public.devis (client_access_token);

COMMENT ON COLUMN public.devis.client_access_token IS
  'Token URL-safe servant d''auth à l''espace client (/c/{token}). Généré auto à la création du devis.';
