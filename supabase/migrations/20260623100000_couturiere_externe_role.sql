-- =====================================================================
-- Nouveau rôle : couturiere_externe
-- Accès strict : fiches de confection uniquement (lecture toutes
-- les fiches + mise à jour du statut des items).
-- Cas d'usage : Atelier Marie Christine — externe à l'entreprise.
-- =====================================================================

alter type public.user_role add value if not exists 'couturiere_externe';
