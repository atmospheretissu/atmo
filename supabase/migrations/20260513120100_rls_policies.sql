-- =====================================================================
-- Atmosphère Tissus — Row Level Security policies
-- =====================================================================
-- Strategy:
--   * RLS enabled on EVERY public table.
--   * `service_role` bypasses RLS by default (used in server-side scripts).
--   * Role-based access via helper functions reading public.profiles.role.
--   * Default: any authenticated user can read; writes require explicit role.
-- =====================================================================

-- =====================================================================
-- HELPER FUNCTIONS
-- =====================================================================

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'admin', false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid())
      in ('admin', 'commercial', 'resp_confection', 'decoratrice'),
    false
  );
$$;

create or replace function public.is_workshop()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid())
      in ('admin', 'resp_confection', 'couturiere'),
    false
  );
$$;

create or replace function public.is_poseur()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid())
      in ('admin', 'poseur'),
    false
  );
$$;

grant execute on function public.current_role to authenticated;
grant execute on function public.is_admin to authenticated;
grant execute on function public.is_staff to authenticated;
grant execute on function public.is_workshop to authenticated;
grant execute on function public.is_poseur to authenticated;

-- =====================================================================
-- ENABLE RLS ON EVERY TABLE
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.catalog_products enable row level security;
alter table public.suppliers enable row level security;
alter table public.couturieres enable row level security;
alter table public.devis enable row level security;
alter table public.devis_lines enable row level security;
alter table public.devis_versions enable row level security;
alter table public.dossiers enable row level security;
alter table public.dossier_items enable row level security;
alter table public.bons_commande enable row level security;
alter table public.bc_lines enable row level security;
alter table public.poses enable row level security;
alter table public.payments enable row level security;
alter table public.caisse_tickets enable row level security;
alter table public.caisse_ticket_lines enable row level security;
alter table public.caisse_closures enable row level security;
alter table public.lm_leads enable row level security;
alter table public.sms_templates enable row level security;
alter table public.sms_log enable row level security;
alter table public.alerts enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- =====================================================================
-- POLICIES
-- =====================================================================

-- ----- profiles -----
create policy "read own profile or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "update own profile" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy "admin manages profiles" on public.profiles
  for all using (public.is_admin())
  with check (public.is_admin());

-- ----- clients -----
create policy "staff can read clients" on public.clients
  for select using (auth.role() = 'authenticated');

create policy "staff can write clients" on public.clients
  for insert with check (public.is_staff());

create policy "staff can update clients" on public.clients
  for update using (public.is_staff())
  with check (public.is_staff());

create policy "admin can delete clients" on public.clients
  for delete using (public.is_admin());

-- ----- catalog_products -----
create policy "everyone reads catalog" on public.catalog_products
  for select using (auth.role() = 'authenticated');

create policy "admin manages catalog" on public.catalog_products
  for all using (public.is_admin())
  with check (public.is_admin());

-- ----- suppliers -----
create policy "staff reads suppliers" on public.suppliers
  for select using (auth.role() = 'authenticated');

create policy "admin manages suppliers" on public.suppliers
  for all using (public.is_admin())
  with check (public.is_admin());

-- ----- couturieres -----
create policy "staff reads couturieres" on public.couturieres
  for select using (auth.role() = 'authenticated');

create policy "admin manages couturieres" on public.couturieres
  for all using (public.is_admin())
  with check (public.is_admin());

-- ----- devis -----
create policy "staff reads devis" on public.devis
  for select using (auth.role() = 'authenticated');

create policy "commercial writes devis" on public.devis
  for insert with check (public.is_staff());

create policy "commercial updates devis" on public.devis
  for update using (public.is_staff())
  with check (public.is_staff());

create policy "admin deletes devis" on public.devis
  for delete using (public.is_admin());

-- ----- devis_lines & devis_versions -----
create policy "staff reads devis_lines" on public.devis_lines
  for select using (auth.role() = 'authenticated');
create policy "staff writes devis_lines" on public.devis_lines
  for all using (public.is_staff()) with check (public.is_staff());

create policy "staff reads devis_versions" on public.devis_versions
  for select using (auth.role() = 'authenticated');
create policy "staff inserts devis_versions" on public.devis_versions
  for insert with check (public.is_staff());

-- ----- dossiers -----
-- Couturières see only dossiers that contain at least one confection assigned to them.
create policy "staff reads all dossiers" on public.dossiers
  for select using (public.is_staff() or public.is_poseur());

create policy "couturiere reads own dossiers" on public.dossiers
  for select using (
    public.current_role() = 'couturiere'
    and exists (
      select 1 from public.dossier_items di
      join public.couturieres c on c.id = di.couturiere_id
      where di.dossier_id = dossiers.id and c.profile_id = auth.uid()
    )
  );

create policy "staff writes dossiers" on public.dossiers
  for insert with check (public.is_staff());

create policy "staff updates dossiers" on public.dossiers
  for update using (public.is_staff() or public.is_workshop() or public.is_poseur())
  with check (public.is_staff() or public.is_workshop() or public.is_poseur());

-- ----- dossier_items -----
create policy "staff reads items" on public.dossier_items
  for select using (auth.role() = 'authenticated');

create policy "staff writes items" on public.dossier_items
  for insert with check (public.is_staff() or public.is_workshop());

create policy "staff updates items" on public.dossier_items
  for update using (public.is_staff() or public.is_workshop())
  with check (public.is_staff() or public.is_workshop());

-- ----- bons_commande & bc_lines -----
create policy "staff reads BCs" on public.bons_commande
  for select using (auth.role() = 'authenticated');
create policy "staff manages BCs" on public.bons_commande
  for all using (public.is_staff() or public.is_workshop())
  with check (public.is_staff() or public.is_workshop());

create policy "staff reads BC lines" on public.bc_lines
  for select using (auth.role() = 'authenticated');
create policy "staff manages BC lines" on public.bc_lines
  for all using (public.is_staff() or public.is_workshop())
  with check (public.is_staff() or public.is_workshop());

-- ----- poses -----
create policy "staff & poseur read poses" on public.poses
  for select using (
    public.is_staff()
    or (public.current_role() = 'poseur' and poseur_id = auth.uid())
  );

create policy "staff plans poses" on public.poses
  for insert with check (public.is_staff());

create policy "poseur can update own pose" on public.poses
  for update using (
    public.is_staff()
    or (public.current_role() = 'poseur' and poseur_id = auth.uid())
  )
  with check (
    public.is_staff()
    or (public.current_role() = 'poseur' and poseur_id = auth.uid())
  );

-- ----- payments -----
create policy "staff reads payments" on public.payments
  for select using (auth.role() = 'authenticated');
create policy "staff records payments" on public.payments
  for insert with check (public.is_staff());
create policy "admin updates payments" on public.payments
  for update using (public.is_admin())
  with check (public.is_admin());

-- ----- caisse_tickets & lines & closures -----
create policy "staff reads tickets" on public.caisse_tickets
  for select using (auth.role() = 'authenticated');
create policy "staff creates tickets" on public.caisse_tickets
  for insert with check (public.is_staff());

create policy "staff reads ticket_lines" on public.caisse_ticket_lines
  for select using (auth.role() = 'authenticated');
create policy "staff manages ticket_lines" on public.caisse_ticket_lines
  for all using (public.is_staff()) with check (public.is_staff());

create policy "staff reads closures" on public.caisse_closures
  for select using (auth.role() = 'authenticated');
create policy "admin manages closures" on public.caisse_closures
  for all using (public.is_admin()) with check (public.is_admin());

-- ----- lm_leads -----
create policy "staff reads LM leads" on public.lm_leads
  for select using (auth.role() = 'authenticated');
create policy "staff manages LM leads" on public.lm_leads
  for all using (public.is_staff()) with check (public.is_staff());

-- ----- sms_templates & sms_log -----
create policy "staff reads sms_templates" on public.sms_templates
  for select using (auth.role() = 'authenticated');
create policy "admin manages sms_templates" on public.sms_templates
  for all using (public.is_admin()) with check (public.is_admin());

create policy "staff reads sms_log" on public.sms_log
  for select using (auth.role() = 'authenticated');
-- sms_log writes happen via service_role from Brevo webhook + Edge functions.

-- ----- alerts -----
create policy "staff reads alerts" on public.alerts
  for select using (auth.role() = 'authenticated');
create policy "staff resolves alerts" on public.alerts
  for update using (public.is_staff()) with check (public.is_staff());

-- ----- notifications -----
create policy "user reads own notifications" on public.notifications
  for select using (user_id = auth.uid());
create policy "user marks own notifications" on public.notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----- audit_log -----
create policy "admin reads audit_log" on public.audit_log
  for select using (public.is_admin());
-- writes happen via service_role only.

-- =====================================================================
-- SEED DATA (SMS templates only — products/suppliers seeded later)
-- =====================================================================

insert into public.sms_templates (key, label, body, trigger_description, active) values
  ('devis_envoye',     'Devis envoyé',                     'Bonjour {{prenom}}, votre devis Atmosphère Tissus est disponible : {{lien_pdf}}. À très vite !', 'Email · à l''envoi du devis', true),
  ('devis_valide',     'Devis validé · confirmation',      'Merci {{prenom}} ! Votre commande est confirmée. Acompte reçu : {{acompte}} €. La production commence.', 'À l''encaissement de l''acompte', true),
  ('article_pret',     'Article prêt au retrait',          '{{prenom}}, votre commande {{produit}} est prête à être retirée en magasin (lun-sam, 9h-19h).', 'Au scan QR du dernier élément (retrait)', true),
  ('tous_recus',       'Tous éléments reçus · pose planifiable', 'Bonne nouvelle {{prenom}} ! Tous les éléments de votre dossier sont reçus. Nous vous contactons pour la pose.', 'Quand X/N éléments reçus = 100%', true),
  ('pose_planifiee',   'Pose planifiée (rappel J-1)',      '{{prenom}}, rappel : pose prévue {{date}} à {{heure}} avec {{poseur}}. À demain !', 'J-1 à 10h', true),
  ('pose_effectuee',   'Pose effectuée · satisfaction',    '{{prenom}}, votre pose est terminée. Merci de votre confiance. Donnez-nous votre avis : {{lien_avis}}', 'Au marquage ''pose effectuée''', true),
  ('echantillons_lm',  'Échantillons envoyés (Leroy Merlin)', 'Bonjour {{prenom}}, vos échantillons Atmosphère Tissus ont été expédiés. Réception sous 2-3 jours.', 'À l''expédition échantillons', true)
on conflict (key) do nothing;
