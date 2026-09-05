-- Log de TOUS les virements crédit lus depuis Pennylane, pas seulement ceux
-- qui matchent le pattern DEV-YYYY-NNNN. Permet à la page /virements de
-- monitorer les virements reçus + statut d'affectation.

alter table public.pennylane_wire_matches
  add column if not exists transaction_date date,
  add column if not exists cron_run_id text,
  add column if not exists identified_by text;

create index if not exists pennylane_wire_matches_date_idx
  on public.pennylane_wire_matches (transaction_date desc);
create index if not exists pennylane_wire_matches_run_idx
  on public.pennylane_wire_matches (cron_run_id);

comment on column public.pennylane_wire_matches.action is
  'acompte_marked | solde_marked | skipped_amount_mismatch | skipped_no_devis | skipped_no_pattern';
comment on column public.pennylane_wire_matches.identified_by is
  'cron | manual_scan — quelle exécution a rapatrié cette transaction.';
comment on column public.pennylane_wire_matches.cron_run_id is
  'ID de l''exécution du cron (uuid généré côté worker). Groupe toutes les tx d''un même scan.';
