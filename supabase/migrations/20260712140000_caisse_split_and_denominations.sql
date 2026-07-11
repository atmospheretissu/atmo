-- Caisse : paiement mixte (2 modes) + comptage détaillé des coupures à la clôture.

-- ---------------------------------------------------------------------------
-- 1. Paiement mixte sur les tickets
-- ---------------------------------------------------------------------------
alter table public.caisse_tickets
  add column if not exists payment_method_2 public.payment_method,
  add column if not exists amount_1 numeric(12, 2),
  add column if not exists amount_2 numeric(12, 2);

comment on column public.caisse_tickets.payment_method_2 is
  'Second mode de règlement quand le total est réglé en 2 fois (ex: espèces + CB).';
comment on column public.caisse_tickets.amount_1 is
  'Montant réglé via payment_method (nullable = tout sur payment_method).';
comment on column public.caisse_tickets.amount_2 is
  'Montant réglé via payment_method_2.';

-- ---------------------------------------------------------------------------
-- 2. Comptage détaillé des coupures + verrou obligatoire à la clôture
-- ---------------------------------------------------------------------------
alter table public.caisse_closures
  add column if not exists denominations jsonb,
  add column if not exists cash_counted_required boolean not null default true;

comment on column public.caisse_closures.denominations is
  'Détail du comptage : {"b5":X,"b10":X,"b20":X,"b50":X,"b100":X,"b200":X,"b500":X,"c1":X,"c2":X,"c5":X,"c10":X,"c20":X,"c50":X,"p1":X,"p2":X}';
comment on column public.caisse_closures.cash_counted_required is
  'Si true, la clôture exige un comptage détaillé pour être considérée valide.';

-- ---------------------------------------------------------------------------
-- 3. Contraintes cohérence paiement mixte
-- ---------------------------------------------------------------------------
alter table public.caisse_tickets
  drop constraint if exists caisse_tickets_split_consistency;
alter table public.caisse_tickets
  add constraint caisse_tickets_split_consistency
  check (
    (payment_method_2 is null and amount_2 is null)
    or (
      payment_method_2 is not null
      and amount_1 is not null
      and amount_2 is not null
      and payment_method_2 <> payment_method
      and amount_1 > 0
      and amount_2 > 0
    )
  );
