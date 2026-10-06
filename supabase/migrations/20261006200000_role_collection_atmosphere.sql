-- ==========================================================================
-- Rôle « Collection Atmosphère » : accès limité au suivi des commandes
--
-- Demande de Pauline, reprise par David (06/10/2026) : donner un accès à
-- l'usine partenaire — produkcja@allianceconfection.pl — pour qu'elle
-- renseigne elle-même l'arrivée du tissu et le départ des confections,
-- sans voir le reste de l'outil (devis, clients, caisse, marges).
--
-- Ce rôle n'est PAS du staff. `is_staff()` reste inchangée, et les
-- politiques existantes continuent donc de lui fermer toutes les autres
-- tables. On lui ouvre `collection_orders`, et rien d'autre.
--
-- Les comparaisons se font sur `role::text` et non sur la valeur d'enum :
-- PostgreSQL interdit d'utiliser une valeur d'enum ajoutée dans la même
-- transaction que son ADD VALUE, et le lanceur de migrations exécute
-- chaque fichier d'un bloc.
-- ==========================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'collection_atmosphere'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'collection_atmosphere';
  END IF;
END $$;

-- ─── Qui est l'usine ? ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_collection_viewer()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.profiles WHERE id = auth.uid())
      = 'collection_atmosphere',
    false
  );
$$;

COMMENT ON FUNCTION public.is_collection_viewer() IS
  'true si l''utilisateur courant porte le rôle collection_atmosphere (usine partenaire).';

-- ─── Lecture du suivi ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "collection viewer reads orders" ON public.collection_orders;
CREATE POLICY "collection viewer reads orders" ON public.collection_orders
  FOR SELECT USING (public.is_collection_viewer());

-- ─── Écriture : les deux dates de l'usine, et rien d'autre ────────────────
-- RLS ne sait pas restreindre des COLONNES. Une politique UPDATE ouverte
-- laisserait l'usine changer le statut, le client ou le commentaire SAV.
-- Le garde-fou est donc un trigger : il rejette toute modification d'un
-- champ autre que les deux dates qui la concernent.
CREATE OR REPLACE FUNCTION public.guard_collection_viewer_update()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_collection_viewer() THEN
    RETURN NEW;  -- le staff n'est pas concerné
  END IF;

  -- Tout doit être identique à l'ancienne ligne, sauf les deux dates.
  IF (to_jsonb(NEW) - 'date_reception_tissu' - 'date_expedition_usine' - 'updated_at')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'date_reception_tissu' - 'date_expedition_usine' - 'updated_at')
  THEN
    RAISE EXCEPTION 'Ce rôle ne peut renseigner que la réception du tissu et l''expédition des confections.';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS collection_orders_viewer_guard ON public.collection_orders;
CREATE TRIGGER collection_orders_viewer_guard
  BEFORE UPDATE ON public.collection_orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_collection_viewer_update();

DROP POLICY IF EXISTS "collection viewer fills factory dates" ON public.collection_orders;
CREATE POLICY "collection viewer fills factory dates" ON public.collection_orders
  FOR UPDATE USING (public.is_collection_viewer());

-- Ni création ni suppression : aucune politique INSERT/DELETE pour ce rôle.
