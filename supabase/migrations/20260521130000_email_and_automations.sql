-- =====================================================================
-- Migration : email_templates + email_log + automation_rules
-- =====================================================================
-- Parité SMS pour les emails + table de règles d'automatisation qui mappe
-- chaque événement métier (devis envoyé, acompte reçu, etc.) à un template
-- SMS / email à déclencher automatiquement.
--
-- Toutes les CREATE TABLE utilisent IF NOT EXISTS et tous les seeds sont
-- ON CONFLICT DO NOTHING : la migration est idempotente.

-- =====================================================================
-- TABLE: email_templates
-- =====================================================================
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  subject text not null,
  html_body text not null,
  text_body text,
  sender_email text,
  sender_name text,
  trigger_description text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- TABLE: email_log
-- =====================================================================
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  template_key text references public.email_templates(key) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  to_email text not null,
  subject text not null,
  body_html text not null,
  brevo_message_id text,
  status text not null default 'pending',
  error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_log_client_idx on public.email_log(client_id);
create index if not exists email_log_status_idx on public.email_log(status);

-- =====================================================================
-- TABLE: automation_rules
-- Chaque événement métier (devis_envoye, acompte_recu, etc.) peut déclencher
-- l'envoi d'un SMS et/ou d'un email selon les templates choisis.
-- =====================================================================
create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  label text not null,
  description text,
  module text,
  sms_enabled boolean not null default false,
  sms_template_key text references public.sms_templates(key) on delete set null,
  email_enabled boolean not null default false,
  email_template_key text references public.email_templates(key) on delete set null,
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.email_templates enable row level security;
alter table public.email_log enable row level security;
alter table public.automation_rules enable row level security;

drop policy if exists "email_templates_read_authenticated" on public.email_templates;
create policy "email_templates_read_authenticated"
  on public.email_templates for select
  to authenticated using (true);

drop policy if exists "email_templates_admin_write" on public.email_templates;
create policy "email_templates_admin_write"
  on public.email_templates for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "email_log_read_authenticated" on public.email_log;
create policy "email_log_read_authenticated"
  on public.email_log for select
  to authenticated using (true);

drop policy if exists "email_log_admin_write" on public.email_log;
create policy "email_log_admin_write"
  on public.email_log for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "automation_rules_read_authenticated" on public.automation_rules;
create policy "automation_rules_read_authenticated"
  on public.automation_rules for select
  to authenticated using (true);

drop policy if exists "automation_rules_admin_write" on public.automation_rules;
create policy "automation_rules_admin_write"
  on public.automation_rules for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- =====================================================================
-- SEED : email templates
-- =====================================================================
insert into public.email_templates (key, label, subject, html_body, text_body, trigger_description, active) values
  (
    'devis_envoye',
    'Devis envoyé',
    'Votre devis Atmosphère Tissus — {{numero_devis}}',
    '<p>Bonjour {{prenom}},</p><p>Suite à notre échange, veuillez trouver votre devis n° {{numero_devis}} pour un montant total de <strong>{{total_ttc}} € TTC</strong>.</p><p>Vous pouvez le consulter et le télécharger ici : <a href="{{lien_pdf}}">Télécharger le devis</a></p><p>Restant à votre disposition,<br>L''équipe Atmosphère Tissus</p>',
    'Bonjour {{prenom}}, votre devis n° {{numero_devis}} pour un montant de {{total_ttc}} € TTC est disponible : {{lien_pdf}}',
    'À l''envoi du devis',
    true
  ),
  (
    'acompte_recu',
    'Acompte reçu',
    'Acompte reçu — votre commande démarre',
    '<p>Bonjour {{prenom}},</p><p>Nous avons bien reçu votre acompte de <strong>{{acompte}} €</strong>. Votre commande passe en production immédiatement.</p><p>Nous vous tiendrons informé à chaque étape (réception des éléments, planification de la pose).</p><p>Merci de votre confiance,<br>L''équipe Atmosphère Tissus</p>',
    'Acompte de {{acompte}} € bien reçu. Production de votre commande lancée.',
    'À l''encaissement de l''acompte (manuel ou Stripe webhook)',
    true
  ),
  (
    'lead_lm_received',
    'Lead Leroy Merlin reçu',
    'Nouvelle demande Atmosphère Tissus via Leroy Merlin',
    '<p>Bonjour {{prenom}},</p><p>Merci pour votre demande passée via Leroy Merlin. Nous avons bien reçu votre projet et nous vous recontactons dans les 48h pour planifier une visio de découverte.</p><p>L''équipe Atmosphère Tissus</p>',
    'Merci pour votre demande Leroy Merlin. Nous vous recontactons dans les 48h.',
    'À la réception d''un lead LM',
    true
  ),
  (
    'tous_recus',
    'Éléments reçus — pose planifiable',
    'Votre commande est complète',
    '<p>Bonjour {{prenom}},</p><p>Bonne nouvelle : tous les éléments de votre dossier sont arrivés et préparés. Nous allons vous contacter dans les prochains jours pour convenir d''un créneau de pose.</p><p>À très vite,<br>L''équipe Atmosphère Tissus</p>',
    'Tous les éléments de votre dossier sont reçus. Nous vous contactons pour la pose.',
    'Quand 100% des items du dossier sont reçus',
    true
  ),
  (
    'pose_effectuee',
    'Pose effectuée — satisfaction',
    'Pose effectuée — votre avis nous intéresse',
    '<p>Bonjour {{prenom}},</p><p>Votre pose est terminée. Nous espérons que vous êtes satisfait du résultat.</p><p>Si vous avez 30 secondes, votre avis nous aiderait beaucoup : <a href="{{lien_avis}}">Donner mon avis</a></p><p>Merci de votre confiance,<br>L''équipe Atmosphère Tissus</p>',
    'Pose terminée. Merci de votre confiance. Votre avis : {{lien_avis}}',
    'Au marquage "pose effectuée"',
    true
  )
on conflict (key) do nothing;

-- =====================================================================
-- SEED : automation_rules
-- Tous les événements métier de la plateforme — par défaut SMS activé sur
-- les événements client-facing, email désactivé (à activer manuellement
-- depuis l'onglet Architecture).
-- =====================================================================
insert into public.automation_rules
  (event_key, label, description, module, sms_enabled, sms_template_key, email_enabled, email_template_key) values
  (
    'lead_lm_received',
    'Arrivée d''un lead Leroy Merlin',
    'Quand un nouveau lead apparaît via le scraping Atmolead.',
    'leads',
    false, null,
    false, 'lead_lm_received'
  ),
  (
    'devis_created',
    'Création d''un devis',
    'Quand un devis est créé en brouillon depuis la boutique.',
    'devis',
    false, null,
    false, null
  ),
  (
    'devis_envoye',
    'Envoi d''un devis au client',
    'Quand le devis passe en statut "envoyé" (action commerciale).',
    'devis',
    true, 'devis_envoye',
    true, 'devis_envoye'
  ),
  (
    'acompte_recu',
    'Acompte encaissé',
    'Manuellement ou via webhook Stripe — déclenche aussi la production.',
    'paiements',
    true, 'acompte_recu',
    true, 'acompte_recu'
  ),
  (
    'article_pret',
    'Article prêt au retrait magasin',
    'Au scan QR du dernier élément destiné au retrait en boutique.',
    'reception',
    true, 'article_pret',
    false, null
  ),
  (
    'tous_recus',
    'Tous les éléments reçus — pose planifiable',
    'Quand 100% des items d''un dossier sont scannés en réception.',
    'reception',
    true, 'tous_recus',
    true, 'tous_recus'
  ),
  (
    'pose_planifiee_j1',
    'Rappel pose J-1',
    'Cron quotidien à 10h pour les poses prévues le lendemain.',
    'poses',
    true, 'pose_planifiee_j1',
    false, null
  ),
  (
    'pose_effectuee',
    'Pose effectuée',
    'Au marquage de la pose comme effectuée par le poseur.',
    'poses',
    true, 'pose_effectuee',
    true, 'pose_effectuee'
  ),
  (
    'caisse_ticket',
    'Ticket de caisse encaissé',
    'À l''encaissement d''un ticket caisse (espèces, CB, etc.).',
    'caisse',
    false, null,
    false, null
  ),
  (
    'bc_envoye_fournisseur',
    'BC envoyé au fournisseur',
    'À l''envoi d''un bon de commande fournisseur par email.',
    'commandes',
    false, null,
    false, null
  )
on conflict (event_key) do nothing;
