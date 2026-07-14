-- Signature électronique du devis.
-- Un devis passe en attente de commande (dossier créé) quand il est
-- signé ET l'acompte reçu.

alter table public.devis
  add column if not exists signed_at timestamptz,
  add column if not exists signed_by_name text,
  add column if not exists signed_by_phone text,
  add column if not exists signed_by_ip text,
  add column if not exists signature_token uuid;

-- Chaque devis reçoit un token opaque pour la page publique de signature.
-- On backfill pour les devis existants.
update public.devis
   set signature_token = gen_random_uuid()
 where signature_token is null;

alter table public.devis
  alter column signature_token set default gen_random_uuid();

create unique index if not exists devis_signature_token_uk
  on public.devis (signature_token);

comment on column public.devis.signed_at is
  'Horodatage de la signature électronique par le client.';
comment on column public.devis.signed_by_name is
  'Nom complet saisi par le client au moment de la signature.';
comment on column public.devis.signed_by_phone is
  'Téléphone confirmé lors de la signature — traçabilité RGPD.';
comment on column public.devis.signed_by_ip is
  'Adresse IP publique de l''appareil ayant validé la signature.';
comment on column public.devis.signature_token is
  'Token opaque utilisé dans l''URL publique /sign/<token>.';

-- NOTE : pas de policy publique — la page /sign/<token> lit et écrit
-- via un client service_role côté serveur (route handler dédiée).
-- Cela évite d'exposer tout le catalogue devis à l'anon key.
