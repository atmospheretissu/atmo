-- =====================================================================
-- Migration : alerts_sent_at sur lm_leads
-- =====================================================================
-- Permet à processPendingLmLeadAlerts() (poller côté Next.js) de savoir
-- quels leads ont déjà déclenché leurs SMS/email/alertes. Pas besoin de
-- Supabase Database Webhook : le poller traite ce qui est null.

alter table public.lm_leads
  add column if not exists alerts_sent_at timestamptz;

create index if not exists lm_leads_pending_alerts_idx
  on public.lm_leads(created_at)
  where alerts_sent_at is null;
