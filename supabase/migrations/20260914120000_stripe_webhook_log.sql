-- Log de tous les appels au webhook Stripe pour diagnostic.
-- Contexte : Louis 14/09 confirme que les webhooks sont bien enregistrés
-- côté Stripe, mais les paiements ne remontent pas dans l'app. Cette table
-- permet de voir exactement ce que le webhook reçoit ET son résultat.

create table if not exists public.stripe_webhook_log (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  event_id text,
  event_type text,
  signature_valid boolean,
  devis_id uuid,
  payment_kind text,
  session_id text,
  payment_intent_id text,
  amount_total numeric(12, 2),
  response_status int,
  response_body text,
  error_message text,
  processing_ms int
);

create index if not exists stripe_webhook_log_received_idx
  on public.stripe_webhook_log (received_at desc);
create index if not exists stripe_webhook_log_devis_idx
  on public.stripe_webhook_log (devis_id)
  where devis_id is not null;

alter table public.stripe_webhook_log enable row level security;

drop policy if exists "staff reads stripe log" on public.stripe_webhook_log;
create policy "staff reads stripe log" on public.stripe_webhook_log
  for select using (public.is_staff());

comment on table public.stripe_webhook_log is
  'Trace de chaque appel au webhook /api/stripe/webhook. Sert au diagnostic quand un paiement Stripe ne remonte pas dans l''app.';
