-- Détection auto des acomptes par motif de virement.
-- Ajoute un 4ème toggle (auto_reconcile_by_wire_label) et un tracking
-- des transactions déjà traitées (idempotence).

alter table public.pennylane_settings
  add column if not exists auto_reconcile_by_wire_label boolean not null default false,
  add column if not exists last_wire_scan_at timestamptz,
  add column if not exists last_wire_scan_stats jsonb;

-- Table de tracking des transactions bancaires déjà rapprochées, pour ne
-- jamais marquer un acompte deux fois même si le cron rejoue.
create table if not exists public.pennylane_wire_matches (
  id uuid primary key default gen_random_uuid(),
  pennylane_transaction_id text not null unique,
  devis_id uuid references public.devis(id) on delete set null,
  devis_number text,
  amount numeric(12,2),
  label text,
  matched_at timestamptz not null default now(),
  action text not null,  -- 'acompte_marked' | 'solde_marked' | 'skipped_amount_mismatch' | 'skipped_no_devis'
  notes text
);

create index if not exists pennylane_wire_matches_devis_idx
  on public.pennylane_wire_matches (devis_id);
create index if not exists pennylane_wire_matches_action_idx
  on public.pennylane_wire_matches (action);

alter table public.pennylane_wire_matches enable row level security;

drop policy if exists "staff reads wire matches" on public.pennylane_wire_matches;
create policy "staff reads wire matches" on public.pennylane_wire_matches
  for select using (public.is_staff());

comment on table public.pennylane_wire_matches is
  'Log des virements Pennylane analysés (regex DEV-YYYY-NNNN dans le motif). Idempotent — la clé unique sur pennylane_transaction_id empêche le double-marquage.';
