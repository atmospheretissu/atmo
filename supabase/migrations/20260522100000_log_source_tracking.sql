-- =====================================================================
-- Migration : event_key + trigger_source sur sms_log & email_log
-- =====================================================================
-- Permet de tracer pour chaque communication :
--   - quel événement métier a déclenché l'envoi (event_key)
--   - quelle partie du code a appelé le trigger (trigger_source)
-- Exemples de trigger_source :
--   "webhook:lm-lead-created"      → notifié par Atmolead worker
--   "manual:leads-lm-button"       → clic admin sur "Déclencher"
--   "cron:process-pending"         → poller fire-and-forget
--   "action:change-devis-status"   → action /devis (envoi devis)
--   "action:mark-acompte-recu"     → action manuelle d'encaissement
--   "stripe:checkout-completed"    → webhook Stripe
--   "action:receive-by-qr"         → scan QR à la réception
--   "action:mark-pose-done"        → marquage pose effectuée
--   "test:sms-tab"                 → bouton Test depuis Paramètres
--   "test:email-tab"               → idem côté email

alter table public.sms_log add column if not exists event_key text;
alter table public.sms_log add column if not exists trigger_source text;

alter table public.email_log add column if not exists event_key text;
alter table public.email_log add column if not exists trigger_source text;

create index if not exists sms_log_event_key_idx on public.sms_log(event_key);
create index if not exists email_log_event_key_idx on public.email_log(event_key);
