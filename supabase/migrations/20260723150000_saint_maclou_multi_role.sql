-- 1. Nouveau canal client "Saint Maclou" (partenaire retail).
--    On garde l'approche enum (le canal détermine la couleur du badge,
--    les triggers d'automation, l'exclusivité de certains scopes). Pour
--    ajouter d'autres canaux futurs, refaire une alter type add value.
alter type public.channel add value if not exists 'saint_maclou';

-- 2. Rôles secondaires sur les profils — un profil peut cumuler
--    (ex : Alex Lesage décoratrice + partenaire Leroy Merlin).
--    Le champ role principal reste authoritative pour les redirects
--    et permissions de base ; secondary_roles sert au tagging & display.
alter table public.profiles
  add column if not exists secondary_roles text[] not null default '{}';

comment on column public.profiles.secondary_roles is
  'Rôles additionnels (tags) — ex : {"decoratrice","leroy_merlin_partenaire"}. Le rôle principal (`role`) reste maître pour la navigation et RLS de base.';
