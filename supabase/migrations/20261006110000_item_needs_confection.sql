-- ==========================================================================
-- Lignes « Tissu & Confection » : séparer réception matière et fin d'atelier
--
-- Retour Pierre-Edouard (05/10/2026) : sur ces lignes, le scan QR en
-- réception passait directement l'article en « recu », donc terminé. Or
-- recevoir le tissu ne veut pas dire que le rideau est confectionné.
-- L'étape atelier était purement sautée.
--
-- Il y a trois moments réels :
--   1. commande du tissu           → statut 'en_attente'
--   2. réception du tissu          → statut 'confection'  (scan QR)
--   3. confection terminée         → statut 'recu'        (geste atelier)
--
-- Les statuts existants suffisent, on change simplement la CIBLE du scan
-- selon que la ligne nécessite ou non un passage en atelier. D'où ce
-- drapeau porté par la ligne elle-même.
--
-- Les lignes matière seule (rail, barre, papier peint, accessoire)
-- gardent leur étape unique : scan → 'recu', terminé.
-- ==========================================================================

ALTER TABLE public.dossier_items
  ADD COLUMN IF NOT EXISTS needs_confection BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.dossier_items.needs_confection IS
  'true = la ligne passe par l''atelier après réception de la matière. Le scan QR la met en ''confection'' et non en ''recu''; un second geste la marque terminée.';

-- Backfill : les lignes déjà créées qui portent « Tissu & Confection »
-- dans leur libellé relèvent de ce cas. On ne touche pas à leur statut
-- courant — seul le comportement des prochains scans change.
UPDATE public.dossier_items
SET needs_confection = true
WHERE label ILIKE '%tissu%confection%'
  AND needs_confection = false;

-- ==========================================================================
-- Trigger de statut dossier : se baser sur l'achèvement réel
--
-- 'recu' reste le statut final d'une ligne, quelle que soit sa nature.
-- Une ligne en 'confection' n'est donc PAS comptée comme terminée, ce qui
-- empêche le dossier de filer en pret_pose tant que l'atelier n'a pas
-- rendu la pièce.
--
-- Rétrocompatible : un dossier sans aucune ligne needs_confection se
-- comporte exactement comme avant.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.refresh_dossier_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
declare
  d_id uuid;
  total_items integer;
  termines integer;
  en_atelier integer;
  matiere_recue integer;
  total_confection integer;
  current_status public.dossier_status;
  dossier_solde_paid boolean;
  new_status public.dossier_status;
begin
  d_id := coalesce(new.dossier_id, old.dossier_id);

  select
    count(*),
    count(*) filter (where status = 'recu'),
    count(*) filter (where status = 'confection'),
    count(*) filter (where status in ('recu', 'confection')),
    count(*) filter (where needs_confection)
  into total_items, termines, en_atelier, matiere_recue, total_confection
  from public.dossier_items
  where dossier_id = d_id;

  if total_items = 0 then
    return new;
  end if;

  select status, solde_paid into current_status, dossier_solde_paid
  from public.dossiers
  where id = d_id;

  -- États finaux : on n'y touche jamais.
  if current_status in ('pose_a_venir', 'cloture', 'sav', 'planifie', 'pose') then
    return new;
  end if;

  if termines = total_items then
    -- Tout est terminé, confection comprise.
    if dossier_solde_paid then
      new_status := 'pose_a_planifier';
    else
      new_status := 'pret_pose';
    end if;
  elsif en_atelier > 0 then
    -- Au moins une pièce est à l'atelier : la confection est en cours.
    new_status := 'confection_en_cours';
  elsif matiere_recue > 0 then
    new_status := 'attente_matiere';
  elsif current_status = 'commande_validee' then
    -- Rien n'a bougé : on laisse le dossier où il est.
    return new;
  else
    new_status := 'attente_matiere';
  end if;

  update public.dossiers
  set status = new_status,
      attente_matiere_at = case
        when new_status = 'attente_matiere' and attente_matiere_at is null then now()
        else attente_matiere_at
      end,
      confection_started_at = case
        when new_status = 'confection_en_cours' and confection_started_at is null then now()
        else confection_started_at
      end,
      pret_pose_at = case
        when new_status in ('pret_pose', 'pose_a_planifier') and pret_pose_at is null then now()
        else pret_pose_at
      end
  where id = d_id
    and status not in ('pose_a_venir', 'cloture', 'sav', 'planifie', 'pose');

  return new;
end;
$$;
