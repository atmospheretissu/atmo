-- =====================================================================
-- Sépare clairement "Commande validée" (acompte reçu, prêt à lancer) de
-- "Attente matière" (BC envoyés au fournisseur, en attente livraison).
--
-- Avant : à l'acompte le dossier sautait direct en attente_matiere parce
-- que le trigger refresh_dossier_status forçait ce statut dès qu'aucun
-- item n'était reçu.
--
-- Après :
--   - À l'acompte → status = commande_validee
--   - Le passage en attente_matiere se fait manuellement (bouton
--     "Lancer l'approvisionnement") ou automatiquement quand le 1er BC
--     fournisseur passe en "envoye".
--   - refresh_dossier_status ne touche plus au statut commande_validee
--     tant qu'aucun item n'a bougé (recu / confection).
-- =====================================================================

-- 1. À l'acompte : cible commande_validee (au lieu de attente_matiere)
CREATE OR REPLACE FUNCTION public.transition_on_acompte_paid()
RETURNS trigger
LANGUAGE plpgsql
AS $$
begin
  if new.acompte_paid is true and (old.acompte_paid is null or old.acompte_paid is false) then
    -- N'écrase pas un statut déjà plus avancé
    if new.status in ('en_cours', 'tout_commande', 'reception_partielle') then
      new.status := 'commande_validee';
    end if;
    new.acompte_paid_at := coalesce(new.acompte_paid_at, now());
  end if;
  return new;
end;
$$;

-- 2. Refresh items → dossier : respecte commande_validee tant qu'aucun item n'a bougé
CREATE OR REPLACE FUNCTION public.refresh_dossier_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
declare
  total_items integer;
  received_items integer;
  in_confection integer;
  current_status public.dossier_status;
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

  select status, solde_paid into current_status, dossier_solde_paid
  from public.dossiers
  where id = coalesce(new.dossier_id, old.dossier_id);

  if received_items = total_items then
    if dossier_solde_paid then
      new_status := 'pose_a_planifier';
    else
      new_status := 'pret_pose';
    end if;
  elsif in_confection > 0 then
    new_status := 'confection_en_cours';
  elsif received_items > 0 then
    -- Au moins un item reçu mais pas tous → on est sorti de commande_validee
    new_status := 'attente_matiere';
  elsif current_status = 'commande_validee' then
    -- Aucun item n'a bougé → on reste en commande_validee
    -- (le passage en attente_matiere = quand l'utilisateur "lance" la commande
    --  ou quand un BC fournisseur est envoyé)
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
        when new_status = 'pret_pose' and pret_pose_at is null then now()
        else pret_pose_at
      end
  where id = coalesce(new.dossier_id, old.dossier_id)
    and status not in ('pose_a_venir', 'cloture', 'sav', 'planifie', 'pose');

  return new;
end;
$$;

-- 3. Trigger BC fournisseur envoyé → bascule auto en attente_matiere
CREATE OR REPLACE FUNCTION public.bc_envoye_bascule_dossier()
RETURNS trigger
LANGUAGE plpgsql
AS $$
begin
  -- Quand un BC passe à "envoye" (= envoyé au fournisseur), si le dossier
  -- est encore en commande_validee, on bascule en attente_matiere
  if new.status = 'envoye'
     and (old.status is distinct from 'envoye')
     and new.dossier_id is not null then
    update public.dossiers
    set status = 'attente_matiere',
        attente_matiere_at = coalesce(attente_matiere_at, now())
    where id = new.dossier_id
      and status = 'commande_validee';
  end if;
  return new;
end;
$$;

DROP TRIGGER IF EXISTS bc_envoye_dossier_transition ON public.bons_commande;
CREATE TRIGGER bc_envoye_dossier_transition
  AFTER UPDATE OF status ON public.bons_commande
  FOR EACH ROW EXECUTE FUNCTION public.bc_envoye_bascule_dossier();

-- 4. Backfill : remet en commande_validee les dossiers qui devraient y être
-- (acompte payé, aucun item reçu, aucun BC envoyé)
UPDATE public.dossiers d
SET status = 'commande_validee'
WHERE d.acompte_paid = true
  AND d.status = 'attente_matiere'
  AND NOT EXISTS (
    SELECT 1 FROM public.dossier_items di
    WHERE di.dossier_id = d.id AND di.status IN ('recu', 'confection')
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.bons_commande bc
    WHERE bc.dossier_id = d.id AND bc.status IN ('envoye', 'confirme', 'expedie', 'recu')
  );
