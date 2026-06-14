-- =====================================================================
-- Fix : production et paiement du solde sont 2 dimensions indépendantes
--
-- Avant : marquer le solde reçu forçait le dossier en pose_a_planifier,
-- même s'il était encore en attente_matiere. C'était logiquement faux —
-- on peut très bien encaisser le solde alors que les tissus ne sont pas
-- encore arrivés / la confection pas terminée.
--
-- Nouvelles règles :
--   - solde_paid passe à true → on horodate solde_paid_at seulement
--   - le dossier ne bascule en pose_a_planifier QUE quand
--     simultanément : items tous reçus (pret_pose) ET solde payé
--   - le trigger items → status gère ce passage automatiquement
-- =====================================================================

CREATE OR REPLACE FUNCTION public.transition_on_solde_paid()
RETURNS trigger
LANGUAGE plpgsql
AS $$
begin
  if new.solde_paid is true and (old.solde_paid is null or old.solde_paid is false) then
    new.solde_paid_at := coalesce(new.solde_paid_at, now());
    -- Si la production est déjà terminée (pret_pose), on peut basculer
    -- directement en pose_a_planifier puisque tout est prêt + payé.
    if new.status = 'pret_pose' then
      new.status := 'pose_a_planifier';
    end if;
    -- Sinon on garde le statut production en cours — le passage à
    -- pose_a_planifier se fera quand le dernier item sera réceptionné
    -- (cf. refresh_dossier_status_v2 ci-dessous).
  end if;
  return new;
end;
$$;

-- Refresh items → status : prend en compte solde_paid pour le palier final
CREATE OR REPLACE FUNCTION public.refresh_dossier_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
declare
  total_items integer;
  received_items integer;
  in_confection integer;
  dossier_solde_paid boolean;
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
  end if;

  select solde_paid into dossier_solde_paid
  from public.dossiers
  where id = coalesce(new.dossier_id, old.dossier_id);

  if received_items = total_items then
    -- Tout est reçu : si le solde est déjà payé on saute directement
    -- en pose_a_planifier, sinon pret_pose.
    if dossier_solde_paid then
      new_status := 'pose_a_planifier';
    else
      new_status := 'pret_pose';
    end if;
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

-- Corrige les dossiers actuels mal classés : ceux qui sont en pose_a_planifier
-- alors que tous leurs items ne sont pas reçus doivent revenir en attente_matiere
-- / confection / pret_pose selon l'état réel des items.
DO $$
DECLARE
  d RECORD;
  total_items integer;
  received_items integer;
  in_confection integer;
  new_status public.dossier_status;
BEGIN
  FOR d IN
    SELECT id, solde_paid FROM public.dossiers WHERE status = 'pose_a_planifier'
  LOOP
    SELECT count(*),
           count(*) FILTER (WHERE status = 'recu'),
           count(*) FILTER (WHERE status = 'confection')
    INTO total_items, received_items, in_confection
    FROM public.dossier_items
    WHERE dossier_id = d.id;

    IF total_items = 0 THEN
      CONTINUE;
    ELSIF received_items = total_items THEN
      new_status := CASE WHEN d.solde_paid THEN 'pose_a_planifier' ELSE 'pret_pose' END;
    ELSIF in_confection > 0 THEN
      new_status := 'confection_en_cours';
    ELSE
      new_status := 'attente_matiere';
    END IF;

    UPDATE public.dossiers SET status = new_status WHERE id = d.id;
  END LOOP;
END$$;
