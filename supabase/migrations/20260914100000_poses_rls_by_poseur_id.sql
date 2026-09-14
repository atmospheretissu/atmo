-- Correction RLS poses (PE 14/09) : chaque poseur ne doit voir/modifier
-- que SES poses. L'ancienne policy comparait poses.poseur_id à auth.uid()
-- alors que poses.poseur_id référence poseurs.id (pas profiles.id). Le
-- lien correct : poses.poseur_id ∈ (SELECT id FROM poseurs WHERE
-- profile_id = auth.uid()).

drop policy if exists "staff & poseur read poses" on public.poses;
create policy "staff & poseur read poses" on public.poses
  for select using (
    public.is_staff()
    or (
      public.current_role() = 'poseur'
      and poseur_id in (
        select id from public.poseurs where profile_id = auth.uid()
      )
    )
    or (
      public.current_role() = 'poseur_externe'
      and poseur_id in (
        select id from public.poseurs where profile_id = auth.uid()
      )
    )
  );

drop policy if exists "poseur can update own pose" on public.poses;
create policy "poseur can update own pose" on public.poses
  for update using (
    public.is_staff()
    or (
      public.current_role() = 'poseur'
      and poseur_id in (
        select id from public.poseurs where profile_id = auth.uid()
      )
    )
    or (
      public.current_role() = 'poseur_externe'
      and poseur_id in (
        select id from public.poseurs where profile_id = auth.uid()
      )
    )
  ) with check (
    public.is_staff()
    or (
      poseur_id in (
        select id from public.poseurs where profile_id = auth.uid()
      )
    )
  );

-- Idem pour poseur_availabilities : un poseur ne voit que ses créneaux
-- (déjà correct côté app via .eq('poseur_id', ...) mais on renforce en RLS).
drop policy if exists "poseur reads own availability" on public.poseur_availabilities;
create policy "poseur reads own availability" on public.poseur_availabilities
  for select using (
    public.is_staff()
    or poseur_id in (
      select id from public.poseurs where profile_id = auth.uid()
    )
  );

drop policy if exists "poseur writes own availability" on public.poseur_availabilities;
create policy "poseur writes own availability" on public.poseur_availabilities
  for all using (
    public.is_staff()
    or poseur_id in (
      select id from public.poseurs where profile_id = auth.uid()
    )
  ) with check (
    public.is_staff()
    or poseur_id in (
      select id from public.poseurs where profile_id = auth.uid()
    )
  );
