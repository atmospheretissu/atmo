-- Support de l'ancien numéro de devis (Cesar : 4 chiffres, ex "2411").
-- Nécessaire pour rapprocher les virements dont le motif contient
-- "DEVIS 2411" (format historique) au lieu du nouveau "DEV-YYYY-NNNN".

alter table public.devis
  add column if not exists legacy_number text;

create index if not exists devis_legacy_number_idx
  on public.devis (legacy_number)
  where legacy_number is not null;

comment on column public.devis.legacy_number is
  'Numéro historique du devis (ex Cesar, format 3-5 chiffres). Sert au rapprochement automatique des virements contenant "DEVIS NNNN" dans le motif.';
