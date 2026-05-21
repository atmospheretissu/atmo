-- =====================================================================
-- Migration : event_alerts
-- =====================================================================
-- Alertes internes (équipe, admin) déclenchées par les mêmes événements
-- métier que les automation_rules, mais à destination de N personnes
-- internes avec critères de matching (montant min/max, canal, etc.).
--
-- N alertes possibles par event_key — chacune avec ses propres canaux
-- (SMS, email), destinataires, templates et critères.

create table if not exists public.event_alerts (
  id uuid primary key default gen_random_uuid(),
  event_key text not null references public.automation_rules(event_key) on delete cascade,
  label text not null,
  active boolean not null default true,

  -- Canaux
  send_sms boolean not null default false,
  send_email boolean not null default false,

  -- Destinataires (arrays — supportent plusieurs numéros / emails)
  recipient_phones text[] not null default '{}',
  recipient_emails text[] not null default '{}',

  -- Templates (optionnels — si null, le corps custom ci-dessous est utilisé)
  sms_template_key text references public.sms_templates(key) on delete set null,
  email_template_key text references public.email_templates(key) on delete set null,

  -- Corps custom (utilisés si pas de template choisi)
  sms_body text,
  email_subject text,
  email_html text,

  -- Critères de matching : JSON flexible
  -- Clés supportées :
  --   { "min_amount": 5000, "max_amount": 20000, "channels": ["magasin","leroy_merlin"] }
  criteria jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_alerts_event_idx on public.event_alerts(event_key);
create index if not exists event_alerts_active_idx on public.event_alerts(active) where active = true;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.event_alerts enable row level security;

drop policy if exists "event_alerts_read_authenticated" on public.event_alerts;
create policy "event_alerts_read_authenticated"
  on public.event_alerts for select
  to authenticated using (true);

drop policy if exists "event_alerts_admin_write" on public.event_alerts;
create policy "event_alerts_admin_write"
  on public.event_alerts for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
