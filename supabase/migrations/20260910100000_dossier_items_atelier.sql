-- Atelier par ligne de dossier (F5 PE 08/09).
-- Un dossier peut avoir plusieurs items partant dans des ateliers différents
-- (ex : rideau → atelier 1, store → atelier 2). L'atelier global du dossier
-- (dossiers.atelier_id) reste comme atelier « par défaut » pour les items
-- non spécifiés, et pour compat avec le flow existant.

alter table public.dossier_items
  add column if not exists atelier_id uuid references public.ateliers(id) on delete set null,
  add column if not exists atelier_sent_at timestamptz;

create index if not exists dossier_items_atelier_idx
  on public.dossier_items (atelier_id)
  where atelier_id is not null;

comment on column public.dossier_items.atelier_id is
  'Atelier assigné à cet item spécifique. NULL = suit dossiers.atelier_id (fallback par défaut).';
comment on column public.dossier_items.atelier_sent_at is
  'Timestamp d''envoi à l''atelier (pour l''item, indépendant de dossiers.atelier_sent_at).';
