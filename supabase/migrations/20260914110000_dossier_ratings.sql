-- Notes de satisfaction en fin de dossier (PE 14/09).
-- Le client reçoit un lien tokenisé (rate_token) pour noter le dossier.
-- Si note = 5, on lui affiche le lien Google Reviews pour publier l'avis.

create table if not exists public.dossier_ratings (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null unique references public.dossiers(id) on delete cascade,
  rate_token uuid not null unique default gen_random_uuid(),
  rating int check (rating between 1 and 5),
  comment text,
  google_review_offered_at timestamptz,
  created_at timestamptz not null default now(),
  rated_at timestamptz
);

create index if not exists dossier_ratings_token_idx
  on public.dossier_ratings (rate_token);

alter table public.dossier_ratings enable row level security;

-- Staff : lit tout
drop policy if exists "staff reads ratings" on public.dossier_ratings;
create policy "staff reads ratings" on public.dossier_ratings
  for select using (public.is_staff());

-- Staff : crée les invitations
drop policy if exists "staff creates ratings" on public.dossier_ratings;
create policy "staff creates ratings" on public.dossier_ratings
  for insert with check (public.is_staff());

-- Client public : peut mettre à jour SA note via son token (bypass RLS
-- côté serveur via service-role, la page /rate/[token] valide le token).
-- Pas de policy anonyme ici — la page publique appelle une Server Action
-- qui utilise le service-role client.

comment on table public.dossier_ratings is
  'Note de satisfaction 1-5 par dossier. Générée à la clôture avec un token public. Si rating = 5, on propose au client le lien Google Reviews.';
