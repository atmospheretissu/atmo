-- =====================================================================
-- Migration : ajoute le rôle consultation_lm
-- =====================================================================
-- Rôle en lecture seule limité à /leads-lm et /feed. Permet à un consultant
-- ou commercial LM externe d'auditer les leads sans accès au reste de l'app.

alter type public.user_role add value if not exists 'consultation_lm';
