-- =====================================================================
-- Phase 3 review : transitions automatiques de statut dossier
--
-- Règles métier (review p.16 + flowchart) :
--   - acompte reçu  → 'commande_validee' (puis immédiatement 'attente_matiere'
--                     par défaut, car on est en train d'attendre les fournisseurs)
--   - tout commandé/partiel → 'attente_matiere' (avant : tout_commande / reception_partielle)
--   - >=1 item en confection → 'confection_en_cours' (avant : 'en_confection')
--   - tous items recus → 'pret_pose' (inchangé)
--   - solde réglé → 'pose_a_planifier' (le créneau reste à fixer)
--
-- On NE touche PAS aux dossiers déjà en pose_a_venir/cloture/sav (états finaux).
-- =====================================================================

-- 1. Update du trigger items → dossier pour utiliser les nouveaux statuts
CREATE OR REPLACE FUNCTION public.refresh_dossier_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
declare
  total_items integer;
  received_items integer;
  in_confection integer;
  new_status public.dossier_status;
begin
  select count(*),
         count(*) filter (where status = 'recu'),
         count(*) filter (where status = 'confection')
  into total_items, received_items, in_confection
  from public.dossier_items
  where dossier_id = coalesce(new.dossier_id, old.dossier_id);

  if total_items = 0 then
    return new;
  elsif received_items = total_items then
    new_status := 'pret_pose';
  elsif in_confection > 0 then
    new_status := 'confection_en_cours';
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
        when new_status = 'pret_pose' and pret_pose_at is null then now()
        else pret_pose_at
      end
  where id = coalesce(new.dossier_id, old.dossier_id)
    and status not in ('pose_a_venir', 'cloture', 'sav', 'planifie', 'pose');

  return new;
end;
$$;

-- 2. Trigger sur dossiers : acompte_paid passe à true → attente_matiere
CREATE OR REPLACE FUNCTION public.transition_on_acompte_paid()
RETURNS trigger
LANGUAGE plpgsql
AS $$
begin
  if new.acompte_paid is true and (old.acompte_paid is null or old.acompte_paid is false) then
    -- N'écrase pas un statut déjà plus avancé
    if new.status in ('en_cours', 'commande_validee', 'tout_commande', 'reception_partielle') then
      new.status := 'attente_matiere';
      new.attente_matiere_at := coalesce(new.attente_matiere_at, now());
    end if;
    new.acompte_paid_at := coalesce(new.acompte_paid_at, now());
  end if;
  return new;
end;
$$;

DROP TRIGGER IF EXISTS dossiers_transition_acompte ON public.dossiers;
CREATE TRIGGER dossiers_transition_acompte
  BEFORE UPDATE OF acompte_paid ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.transition_on_acompte_paid();

-- 3. Trigger sur dossiers : solde_paid passe à true → pose_a_planifier
CREATE OR REPLACE FUNCTION public.transition_on_solde_paid()
RETURNS trigger
LANGUAGE plpgsql
AS $$
begin
  if new.solde_paid is true and (old.solde_paid is null or old.solde_paid is false) then
    -- N'écrase pas pose_a_venir / cloture / sav (états finaux)
    if new.status not in ('pose_a_venir', 'cloture', 'sav') then
      new.status := 'pose_a_planifier';
    end if;
    new.solde_paid_at := coalesce(new.solde_paid_at, now());
  end if;
  return new;
end;
$$;

DROP TRIGGER IF EXISTS dossiers_transition_solde ON public.dossiers;
CREATE TRIGGER dossiers_transition_solde
  BEFORE UPDATE OF solde_paid ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.transition_on_solde_paid();

-- 4. Trigger sur dossiers : scheduled_pose_at fixé → pose_a_venir
CREATE OR REPLACE FUNCTION public.transition_on_pose_scheduled()
RETURNS trigger
LANGUAGE plpgsql
AS $$
begin
  if new.scheduled_pose_at is not null and old.scheduled_pose_at is null then
    if new.status in ('pose_a_planifier', 'pret_pose') then
      new.status := 'pose_a_venir';
    end if;
  end if;
  return new;
end;
$$;

DROP TRIGGER IF EXISTS dossiers_transition_pose_scheduled ON public.dossiers;
CREATE TRIGGER dossiers_transition_pose_scheduled
  BEFORE UPDATE OF scheduled_pose_at ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.transition_on_pose_scheduled();
