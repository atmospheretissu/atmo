import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export { storeColorToTone, storeInitials, type Store, type StoreColor } from "./stores-shared";
import type { Store } from "./stores-shared";

export const STORE_COOKIE = "atmo_current_store";

export async function listStores(opts?: { activeOnly?: boolean }): Promise<Store[]> {
  const supabase = await createClient();
  let q = supabase.from("stores").select("*").order("position", { ascending: true });
  if (opts?.activeOnly) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
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
 */
export async function getEffectiveStoreFilter(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, store_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  // resp_magasin : forcé sur son store
  if (profile.role === "resp_magasin" && profile.store_id) {
    return profile.store_id;
  }

  // Admin et autres : selon le cookie
  return getCurrentStoreId();
}

export async function getStoreById(id: string): Promise<Store | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("stores").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

/**
 * Store_id à assigner à une nouvelle entité (devis, client, ticket, paiement) :
 *   - resp_magasin → son propre store (forcé)
 *   - admin avec cookie store_id → ce store
 *   - admin en vue "all" ou non défini → premier store actif (fallback)
 */
export async function getCreationStoreId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, store_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  if (profile.role === "resp_magasin" && profile.store_id) {
    return profile.store_id;
  }

  const cookieStoreId = await getCurrentStoreId();
  if (cookieStoreId) return cookieStoreId;

  // Fallback : premier store actif (pour ne pas créer un orphelin)
  const { data: first } = await supabase
    .from("stores")
    .select("id")
    .eq("active", true)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();
  return first?.id ?? null;
}
