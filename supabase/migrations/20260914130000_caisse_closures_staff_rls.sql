-- Élargit les policies caisse_closures et caisse_tickets aux staff
-- (pas seulement admin). Contexte : resp_magasin ne pouvait pas clôturer
-- la caisse, l'insert était silencieusement bloqué par RLS.
-- On garde admin-only pour DELETE (protection contre suppression accidentelle).

drop policy if exists "admin manages closures" on public.caisse_closures;

drop policy if exists "staff inserts closures" on public.caisse_closures;
create policy "staff inserts closures" on public.caisse_closures
  for insert with check (public.is_staff());

drop policy if exists "staff updates closures" on public.caisse_closures;
create policy "staff updates closures" on public.caisse_closures
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists "admin deletes closures" on public.caisse_closures;
create policy "admin deletes closures" on public.caisse_closures
  for delete using (public.is_admin());

-- caisse_tickets manquait un UPDATE policy (nécessaire pour attacher
-- les tickets à leur closure_id).
drop policy if exists "staff updates tickets" on public.caisse_tickets;
create policy "staff updates tickets" on public.caisse_tickets
  for update using (public.is_staff()) with check (public.is_staff());
