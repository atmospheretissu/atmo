-- =====================================================================
-- Nouveau rôle : poseur_externe
-- Accès strict : /poses uniquement (interventions assignées).
-- Cas d'usage : poseurs externes à l'entreprise (David, Jerome, Eddy…)
-- =====================================================================

alter type public.user_role add value if not exists 'poseur_externe';
