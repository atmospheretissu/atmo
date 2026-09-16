import { cache } from "react";
import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/db/impersonation";

export { storeColorToTone, storeInitials, type Store, type StoreColor } from "./stores-shared";
import type { Store } from "./stores-shared";

export const STORE_COOKIE = "atmo_current_store";

/**
 * Liste des magasins — cross-request cache 5 min invalidable via
 * revalidateTag("stores") depuis les actions qui modifient un store.
 * Avant : SELECT full à chaque navigation (via layout) alors que la
 * table bouge une fois par mois.
 *
 * Deux entrées cachées (activeOnly true/false) pour éviter de re-caster
 * côté client entre les deux vues.
 */
const _listStoresRaw = unstable_cache(
  async (activeOnly: boolean): Promise<Store[]> => {
    // On passe par service-role : la donnée est publique côté équipe
    // (aucune info sensible) et ça évite de créer un client Supabase
    // auth juste pour lister 3 lignes.
    const sb = createServiceRoleClient();
    let q = sb.from("stores").select("*").order("position", { ascending: true });
    if (activeOnly) q = q.eq("active", true);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as Store[];
  },
  ["stores-list"],
  { revalidate: 300, tags: ["stores"] },
);

export async function listStores(opts?: { activeOnly?: boolean }): Promise<Store[]> {
  return _listStoresRaw(Boolean(opts?.activeOnly));
}

/**
 * Récupère l'ID du store actif depuis le cookie.
 * Retourne null si "all" (vue agrégée admin) ou si non défini.
 */
export async function getCurrentStoreId(): Promise<string | null> {
  const c = await cookies();
  const v = c.get(STORE_COOKIE)?.value;
  if (!v || v === "all") return null;
  return v;
}

/**
 * Détermine quel store_id appliquer comme filtre selon le profil utilisateur :
 *   - Admin avec cookie 'all' → null (voit tout, pas de filtre)
 *   - Admin avec cookie store_id → ce store
 *   - Resp_magasin → forcé sur SON store (profile.store_id), peu importe le cookie
 *   - Autres rôles → null (pas de filtrage par store, voient tout)
 *
 * Utilise getEffectiveProfile (React.cache par requête) — plus de query
 * profiles supplémentaire, réutilise celle du layout.
 */
export const getEffectiveStoreFilter = cache(async (): Promise<string | null> => {
  const profile = await getEffectiveProfile();
  if (!profile) return null;
  if (profile.effectiveRole === "resp_magasin" && profile.effectiveStoreId) {
    return profile.effectiveStoreId;
  }
  return getCurrentStoreId();
});

export async function getStoreById(id: string): Promise<Store | null> {
  // Passe par le cache listStores plutôt qu'une query directe — les
  // magasins actifs + inactifs sont tous dans le cache 5 min.
  const all = await listStores({ activeOnly: false });
  return all.find((s) => s.id === id) ?? null;
}

/**
 * À appeler depuis chaque action qui crée / modifie / supprime un store
 * (ou toggle son active). Invalide le cache listStores pour que la
 * sidebar / le layout voient immédiatement le changement.
 */
export async function invalidateStoresCache() {
  const { revalidateTag } = await import("next/cache");
  // Next.js 16 : revalidateTag(tag, profile) — le profile est un nom de
  // CacheLife. "default" fait le job standard (invalider tout de suite).
  revalidateTag("stores", "default");
}

/**
 * Store_id à assigner à une nouvelle entité (devis, client, ticket, paiement) :
 *   - resp_magasin → son propre store (forcé)
 *   - admin avec cookie store_id → ce store
 *   - admin en vue "all" ou non défini → premier store actif (fallback)
 *
 * Utilise getEffectiveProfile + listStores cachés — plus de queries
 * profiles/stores propres à cette fonction.
 */
export const getCreationStoreId = cache(async (): Promise<string | null> => {
  const profile = await getEffectiveProfile();
  if (!profile) return null;

  if (profile.effectiveRole === "resp_magasin" && profile.effectiveStoreId) {
    return profile.effectiveStoreId;
  }

  const cookieStoreId = await getCurrentStoreId();
  if (cookieStoreId) return cookieStoreId;

  // Fallback : premier store actif (pour ne pas créer un orphelin). Passe
  // par le cache listStores plutôt qu'une nouvelle query.
  const actives = await listStores({ activeOnly: true });
  return actives[0]?.id ?? null;
});
