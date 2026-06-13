-- =====================================================================
-- Phase 7 review : pose terminée → dossier clôturé (flowchart final)
--
-- Quand poses.completed_at est setté (la pose vient d'avoir lieu), on
-- bascule le dossier en 'cloture' et on horodate cloture_at.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.cloture_dossier_on_pose_done()
RETURNS trigger
LANGUAGE plpgsql
AS $$
begin
  if new.completed_at is not null
     and (old.completed_at is null or old.completed_at is distinct from new.completed_at) then
    update public.dossiers
    set status = 'cloture',
        cloture_at = coalesce(cloture_at, new.completed_at)
    where id = new.dossier_id
      and status not in ('cloture', 'sav');
  end if;
  return new;
end;
$$;

DROP TRIGGER IF EXISTS poses_cloture_dossier ON public.poses;
CREATE TRIGGER poses_cloture_dossier
  AFTER UPDATE OF completed_at ON public.poses
  FOR EACH ROW EXECUTE FUNCTION public.cloture_dossier_on_pose_done();
