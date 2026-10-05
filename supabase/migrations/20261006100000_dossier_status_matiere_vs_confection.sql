-- ==========================================================================
-- Workflow dossier : distinguer réception MATIÈRE et retour CONFECTION
--
-- Retour Pierre-Edouard (05/10/2026) :
--   « il faut dissocier les matières et les produits car si en réception
--     marchandise tu fais réceptionner tu passes l'étape confection. »
--
-- Avant : le trigger comparait simplement received_items à total_items.
-- Une ligne « Rideau — Tissu & Confection » ne produisant qu'un seul item
-- de type `tissu`, réceptionner le tissu suffisait à basculer le dossier
-- en `pret_pose` — l'atelier était purement et simplement sauté.
--
-- Après : on sépare les items en deux familles.
--   • MATIÈRE    = tissu, rail, accessoire, autre  (à commander/réceptionner)
--   • CONFECTION = type 'confection'               (part en atelier, revient fini)
--
-- Nouvelle logique :
--   1. toutes matières reçues ET toutes confections reçues → pret_pose
--      (ou pose_a_planifier si le solde est déjà réglé)
--   2. au moins un item en statut 'confection'             → confection_en_cours
--   3. toutes matières reçues mais confection en attente   → confection_en_cours
--   4. sinon, au moins un item reçu                        → attente_matiere
--
-- RÉTROCOMPATIBLE : les dossiers existants n'ont aucun item de type
-- 'confection' (vérifié en prod : 0 sur 45). Pour eux, « toutes les
-- confections sont reçues » est vrai par vacuité et le comportement
-- actuel est strictement préservé.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.refresh_dossier_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
declare
  d_id uuid;
  total_matiere integer;
  recu_matiere integer;
  total_confection integer;
  recu_confection integer;
  en_atelier integer;
  current_status public.dossier_status;
  dossier_solde_paid boolean;
  new_status public.dossier_status;
begin
  d_id := coalesce(new.dossier_id, old.dossier_id);

  select
    count(*) filter (where type <> 'confection'),
    count(*) filter (where type <> 'confection' and status = 'recu'),
    count(*) filter (where type = 'confection'),
    count(*) filter (where type = 'confection' and status = 'recu'),
    count(*) filter (where status = 'confection')
  into total_matiere, recu_matiere, total_confection, recu_confection, en_atelier
  from public.dossier_items
  where dossier_id = d_id;

  if total_matiere + total_confection = 0 then
    return new;
  end if;

  select status, solde_paid into current_status, dossier_solde_paid
  from public.dossiers
  where id = d_id;

  -- États finaux : on n'y touche jamais.
  if current_status in ('pose_a_venir', 'cloture', 'sav', 'planifie', 'pose') then
    return new;
  end if;

  if recu_matiere = total_matiere and recu_confection = total_confection then
    -- Tout est là, matière ET confection terminée.
    if dossier_solde_paid then
      new_status := 'pose_a_planifier';
    else
      new_status := 'pret_pose';
    end if;
  elsif en_atelier > 0 then
    -- Au moins un article est physiquement parti à l'atelier.
    new_status := 'confection_en_cours';
  elsif recu_matiere = total_matiere and total_confection > 0 then
    -- Matières au complet : l'étape confection peut démarrer.
    new_status := 'confection_en_cours';
  elsif recu_matiere > 0 then
    new_status := 'attente_matiere';
  elsif current_status = 'commande_validee' then
    -- Rien n'a encore bougé : on laisse le dossier là où il est.
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
