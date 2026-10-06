-- ==========================================================================
-- Fermer les 24 tables ouvertes à « tout compte connecté » au rôle usine
--
-- Découvert en testant le rôle `collection_atmosphere` créé par la
-- migration précédente : le compte d'essai lisait 23 devis, 473 clients,
-- 25 paiements et 51 226 produits du catalogue.
--
-- La cause n'est pas le nouveau rôle. Vingt-quatre tables portent une
-- politique de lecture nommée « staff reads X » dont la condition réelle
-- est `auth.role() = 'authenticated'` — c'est-à-dire n'importe quel compte
-- connecté, quel que soit son rôle. Jusqu'ici tous les comptes étaient
-- internes et la restriction se jouait au niveau des routes, ce qui
-- suffisait en pratique.
--
-- Cela cesse de suffire dès qu'on ouvre un compte À L'EXTÉRIEUR de
-- l'entreprise. La clé anonyme Supabase est publique — elle est dans le
-- code de la page —, donc l'usine pourrait interroger l'API REST
-- directement, hors de toute route, et aspirer le fichier clients.
--
-- Correctif volontairement chirurgical : on ajoute `AND NOT
-- is_collection_viewer()` aux politiques existantes. Aucun rôle actuel ne
-- change de comportement ; seul le nouveau compte externe est exclu.
--
-- Reste à faire, hors de ce correctif : ces politiques devraient exiger
-- `is_staff()` comme leur nom le laisse croire. Le faire ici casserait
-- l'accès des couturières, poseurs et décoratrices, qui s'appuient
-- aujourd'hui sur cette permissivité. C'est un chantier à part.
-- ==========================================================================

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd = 'SELECT'
      AND qual = '(auth.role() = ''authenticated''::text)'
  LOOP
    EXECUTE format(
      'ALTER POLICY %I ON public.%I USING (auth.role() = ''authenticated'' AND NOT public.is_collection_viewer())',
      p.policyname, p.tablename
    );
    RAISE NOTICE 'Politique resserrée : %.%', p.tablename, p.policyname;
  END LOOP;
END $$;
