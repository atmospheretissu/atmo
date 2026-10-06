-- ==========================================================================
-- Onglet Collection Atmosphère : suivi des commandes avec l'usine
--
-- Demande David (06/10/2026) : quand un client accepte un devis, les
-- articles issus de la Collection Atmosphère doivent apparaître dans
-- l'onglet Collection, sur un tableau de suivi partagé avec l'usine
-- (Alliance Confection, Pologne).
--
-- Le pipeline existe déjà : l'acceptation du devis appelle
-- createDossierFromDevis, qui crée un dossier_item par ligne et porte un
-- drapeau `collection`. Trois choses manquaient :
--
--   1. Le drapeau n'était posé que pour l'ancien marqueur
--      `collection_atmosphere`. Le formulaire actuel de la boutique écrit
--      `new_collection_atmosphere` : ses articles n'étaient donc JAMAIS
--      reconnus comme Collection. Corrigé côté code, backfillé ici.
--   2. Les deux dates que l'usine doit renseigner elle-même : arrivée du
--      tissu d'éditeur chez elle, et départ des confections.
--   3. Le commentaire SAV d'Atmosphère, destiné à être lu par l'usine —
--      distinct des notes internes (`notes`), qui ne lui sont pas
--      adressées.
--
-- Le statut reste porté par `dossier_items.status` : l'enum existant
-- couvre déjà les cas du tableau (en_attente, confection, recu, probleme
-- pour un SAV). Pas de nouvel enum.
-- ==========================================================================

ALTER TABLE public.dossier_items
  ADD COLUMN IF NOT EXISTS collection_tissu_recu_at DATE,
  ADD COLUMN IF NOT EXISTS collection_expedie_at DATE,
  ADD COLUMN IF NOT EXISTS sav_comment TEXT;

COMMENT ON COLUMN public.dossier_items.collection_tissu_recu_at IS
  'Renseigné par l''usine : date d''arrivée du tissu d''éditeur à l''atelier.';
COMMENT ON COLUMN public.dossier_items.collection_expedie_at IS
  'Renseigné par l''usine : date de départ des confections de l''atelier.';
COMMENT ON COLUMN public.dossier_items.sav_comment IS
  'Commentaire SAV rédigé par Atmosphère, destiné à être lu par l''usine. À ne pas confondre avec `notes`, qui reste interne.';

-- ──────────────────────────────────────────────────────────────────────────
-- Backfill du drapeau `collection`
--
-- Le libellé est fabriqué par article-new-collection-form.tsx sous la
-- forme « Collection Atmosphère — <catégorie> <tissu> », que la boutique
-- préfixe ensuite de la pièce (« cuisine · Collection Atmosphère — … ») :
-- d'où le joker des deux côtés. C'est un marqueur fiable, et il rattrape
-- aussi les articles de l'ancien formulaire. On ne touche à aucun statut.
-- ──────────────────────────────────────────────────────────────────────────
UPDATE public.dossier_items
SET
  collection = true,
  -- L'ancien marqueur donnait déjà le type 'tissu' ; le nouveau tombait
  -- dans 'autre' faute d'être reconnu. On aligne.
  type = 'tissu'
WHERE collection = false
  AND label ILIKE '%Collection Atmosphère%';

-- Ces articles passent tous par l'atelier : recevoir le tissu ne veut pas
-- dire que la confection est faite (même raisonnement que la migration
-- 20261006110000 sur les lignes « Tissu & Confection »).
UPDATE public.dossier_items
SET needs_confection = true
WHERE collection = true
  AND needs_confection = false;

-- Le tableau de suivi ne lit que les lignes Collection : index partiel.
CREATE INDEX IF NOT EXISTS dossier_items_collection_idx
  ON public.dossier_items (collection, status)
  WHERE collection = true;
