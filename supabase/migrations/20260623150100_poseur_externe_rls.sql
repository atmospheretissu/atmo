-- =====================================================================
-- RLS pour poseur_externe :
--   - is_poseur() inclut désormais ce rôle
--   - SELECT/UPDATE sur poses limité à ses propres interventions
--     (poseur_id = auth.uid())
-- =====================================================================

create or replace function public.is_poseur()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid())
      in ('admin', 'poseur', 'poseur_externe'),
    false
  );
$$;

drop policy if exists "poseur_externe reads own poses" on public.poses;
create policy "poseur_externe reads own poses" on public.poses
  for select using (
    (select role from public.profiles where id = auth.uid()) = 'poseur_externe'
    and poseur_id = auth.uid()
  );

drop policy if exists "poseur_externe updates own pose" on public.poses;
create policy "poseur_externe updates own pose" on public.poses
  for update using (
    (select role from public.profiles where id = auth.uid()) = 'poseur_externe'
    and poseur_id = auth.uid()
  )
  with check (
    (select role from public.profiles where id = auth.uid()) = 'poseur_externe'
    and poseur_id = auth.uid()
  );
