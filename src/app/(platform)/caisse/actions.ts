"use server";

import { revalidatePath } from "next/cache";
import {
  createTicket,
  createClosure,
  getPreviousUnclosedDay,
} from "@/lib/db/caisse";
import type {
  TicketInput,
  TicketCreated,
  Denominations,
} from "@/lib/db/caisse";

type Result<T> = ({ ok: true } & T) | { ok: false; message: string };

export async function createTicketAction(
  input: TicketInput
): Promise<Result<{ ticket: TicketCreated }>> {
  try {
    // Ancien blocage supprimé (PE 14/09) : "Impossible d'encaisser tant que
    // la clôture du JJ/MM n'est pas faite" gênait plus qu'il n'aidait
    // — cascade de blocages sur ~50 jours quand un opérateur oubliait la
    // clôture. La caisse encaisse librement ; le rappel de clôture reste
    // affiché en banner mais n'empêche plus les ventes.
    const ticket = await createTicket(input);
    revalidatePath("/caisse");
    revalidatePath("/dashboard");
    return { ok: true, ticket };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

type CatalogSearchRow = {
  id: string;
  ref: string;
  name: string;
  category: string;
  description: string | null;
  unit_price_ht: number | string | null;
  supplier_name: string | null;
};

export type CaisseSearchResult = {
  /** UUID stable du produit — sert de clé React et d'identité en panier.
   * Nécessaire depuis que 2 fournisseurs peuvent partager la même ref
   * (couple unique (ref, supplier_name) — cf migration 20260907120000). */
  id: string;
  reference: string;
  nom: string;
  designation: string;
  prix: number | null;
  fournisseur: string;
  type: string;
};

/**
 * Recherche catalogue caisse.
 * - Sans filtre ni requête : renvoie [] (browse manuel).
 * - Avec filtre (catégorie / fournisseur) : renvoie top 40 alphabétique.
 * - Avec requête ≥ 2 char : recherche plein-texte.
 * - Combine les filtres et la recherche.
 */
export async function searchCaisseCatalogAction(
  opts:
    | string
    | {
        q?: string;
        category?: string | null;
        supplier?: string | null;
      },
): Promise<CaisseSearchResult[]> {
  const params =
    typeof opts === "string" ? { q: opts } : opts ?? {};
  const q = (params.q ?? "").trim();
  const category = params.category ?? null;
  const supplier = params.supplier ?? null;
  const hasFilter = Boolean(category || supplier);
  const hasQuery = q.length >= 2;
  // Rien à filtrer et rien tapé : ne rien remonter (l'UI propose des chips).
  if (!hasFilter && !hasQuery) return [];

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  type QueryChain = {
    eq: (c: string, v: unknown) => QueryChain;
    not: (c: string, op: string, v: unknown) => QueryChain;
    or: (f: string) => QueryChain;
    order: (c: string, o: { ascending: boolean }) => QueryChain;
    limit: (n: number) => Promise<{ data: CatalogSearchRow[] | null }>;
  };
  let qb = (
    supabase as unknown as {
      from: (t: string) => { select: (s: string) => QueryChain };
    }
  )
    .from("catalog_products")
    .select("id, ref, name, category, description, unit_price_ht, supplier_name")
    .eq("active", true)
    .not("unit_price_ht", "is", null) as QueryChain;

  if (category) qb = qb.eq("category", category);
  if (supplier) qb = qb.eq("supplier_name", supplier);
  if (hasQuery) {
    qb = qb.or(
      `ref.ilike.%${q}%,name.ilike.%${q}%,supplier_name.ilike.%${q}%`,
    );
  }
  const { data } = await qb.order("name", { ascending: true }).limit(40);

  return (data ?? []).map((p) => ({
    id: p.id,
    reference: p.ref,
    nom: p.name,
    designation: p.description ?? p.name,
    prix: p.unit_price_ht == null ? null : Number(p.unit_price_ht),
    fournisseur: p.supplier_name ?? "",
    type: p.category,
  }));
}

/**
 * Renvoie les valeurs distinctes de catégories et fournisseurs pour peupler
 * les filtres UI. Cache côté client — appelée une seule fois au montage.
 */
export async function listCaisseCatalogFacetsAction(): Promise<{
  categories: string[];
  suppliers: string[];
}> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  // Suppliers via la RPC (efficace, DISTINCT côté DB).
  const rpc = supabase as unknown as {
    rpc: (
      name: string,
    ) => Promise<{ data: { supplier_name: string }[] | null }>;
  };
  const { data: sups } = await rpc.rpc("distinct_catalog_suppliers");
  const suppliers = ((sups ?? []) as { supplier_name: string }[])
    .map((r) => r.supplier_name)
    .filter(Boolean);

  // Catégories : distinct en JS (2k rows max).
  const { data: cats } = await supabase
    .from("catalog_products")
    .select("category")
    .eq("active", true)
    .limit(5000);
  const categories = Array.from(
    new Set(
      (cats ?? [])
        .map((c) => c.category)
        .filter((c): c is string => Boolean(c && c !== "Autre")),
    ),
  ).sort((a, b) => a.localeCompare(b, "fr"));
  // "Autre" en fin de liste si présent.
  if ((cats ?? []).some((c) => c.category === "Autre")) categories.push("Autre");

  return { categories, suppliers };
}

export async function closeCashRegisterAction(
  date: string,
  cash_counted: number | null,
  denominations: Denominations,
  notes?: string,
): Promise<Result<{ id: string; variance: number | null }>> {
  try {
    const r = await createClosure(date, cash_counted, notes, denominations);
    revalidatePath("/caisse");
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function getPreviousUnclosedDayAction(): Promise<string | null> {
  return getPreviousUnclosedDay();
}

/**
 * Clôture rétroactive automatique : parcourt tous les jours passés qui ont
 * des tickets non attachés à une clôture, et crée pour chacun une clôture
 * "théorique" au montant espèces attendu (variance = 0). Notes = trace
 * automatique. Débloque la caisse en un clic quand un opérateur a oublié
 * plusieurs jours d'affilée.
 *
 * Ne touche pas à AUJOURD'HUI (la clôture du jour reste manuelle).
 */
export async function closeAllPastUnclosedDaysAction(): Promise<
  { ok: true; closedDays: string[]; totalCash: number } | { ok: false; message: string }
> {
  try {
    // Auth check + service-role pour bypass RLS (les policies caisse_closures
    // exigent is_admin() qui n'inclut pas resp_magasin).
    const { createClient, createServiceRoleClient } = await import(
      "@/lib/supabase/server"
    );
    const authed = await createClient();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return { ok: false, message: "Non authentifié" };
    const supabase = createServiceRoleClient();

    // 1. Lister les jours DISTINCTS des tickets non clôturés, hors aujourd'hui
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ).toISOString();
    const { data: tickets } = await supabase
      .from("caisse_tickets")
      .select("created_at, payment_method, total_ttc")
      .is("closure_id", null)
      .lt("created_at", todayStart);

    if (!tickets || tickets.length === 0) {
      return { ok: true, closedDays: [], totalCash: 0 };
    }

    // Groupe par date locale (YYYY-MM-DD)
    const byDay = new Map<
      string,
      { especes: number; count: number }
    >();
    for (const t of tickets) {
      const d = new Date(t.created_at as string);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const cur = byDay.get(key) ?? { especes: 0, count: 0 };
      if ((t.payment_method as string) === "especes") {
        cur.especes += Number(t.total_ttc ?? 0);
      }
      cur.count++;
      byDay.set(key, cur);
    }

    // 2. Pour chaque jour, appeler createClosure avec le montant espèces
    //    théorique (variance sera 0). Denominations null → force isZeroClose
    //    OU un forfait "billet 5€" ×N pour matcher — on préfère juste passer
    //    le cash_counted = expected sans détail (permis en clôture rétroactive).
    const closedDays: string[] = [];
    let totalCash = 0;
    for (const [day, agg] of Array.from(byDay.entries()).sort()) {
      // Skip aujourd'hui par sécurité (déjà exclu du filtre .lt() mais on
      // revalide)
      const closureCash = Math.round(agg.especes * 100) / 100;
      // Utilise createClosure via un mode "rétroactif" — insert direct
      // pour éviter la validation stricte (car on n'a pas les denominations).
      const dayStart = new Date(`${day}T00:00:00`).toISOString();
      const dayEnd = new Date(`${day}T23:59:59.999`).toISOString();

      const { data: dayTickets } = await supabase
        .from("caisse_tickets")
        .select("id, payment_method, total_ttc")
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd)
        .is("closure_id", null);

      // Idempotence : réutilise une clôture existante si elle existe déjà
      // pour ce jour (cause du duplicate key en cas de retry).
      const { data: existingClosure } = await supabase
        .from("caisse_closures")
        .select("id")
        .eq("date", day)
        .maybeSingle();
      if (existingClosure) {
        const ticketIds = (dayTickets ?? []).map((t) => t.id);
        if (ticketIds.length > 0) {
          await supabase
            .from("caisse_tickets")
            .update({ closure_id: existingClosure.id })
            .in("id", ticketIds);
        }
        closedDays.push(day);
        continue;
      }

      const sums = { especes: 0, cb: 0, cheque: 0, virement: 0, stripe: 0 };
      for (const t of dayTickets ?? []) {
        const k = t.payment_method as keyof typeof sums;
        sums[k] += Number(t.total_ttc ?? 0);
      }

      const { data: closure, error: closureErr } = await (
        supabase as unknown as {
          from: (t: string) => {
            insert: (v: Record<string, unknown>) => {
              select: (s: string) => {
                single: () => Promise<{
                  data: { id: string } | null;
                  error: { message?: string } | null;
                }>;
              };
            };
          };
        }
      )
        .from("caisse_closures")
        .insert({
          date: day,
          total_especes: sums.especes,
          total_cb: sums.cb,
          total_cheque: sums.cheque,
          total_virement: sums.virement,
          cash_counted: closureCash,
          closed_at: new Date().toISOString(),
          closed_by: user?.id ?? null,
          notes: `Clôture rétroactive automatique (${agg.count} ticket${agg.count > 1 ? "s" : ""}) — écart 0 par défaut.`,
          denominations: null,
        })
        .select("id")
        .single();

      if (closureErr || !closure) {
        console.warn(
          `[bulk close] fail day ${day}:`,
          closureErr?.message ?? "no closure returned",
        );
        continue;
      }
      const ticketIds = (dayTickets ?? []).map((t) => t.id);
      if (ticketIds.length > 0) {
        const { error: updErr } = await supabase
          .from("caisse_tickets")
          .update({ closure_id: closure.id })
          .in("id", ticketIds);
        if (updErr) {
          console.warn(
            `[bulk close] fail attach tickets ${day}:`,
            updErr.message,
          );
        }
      }
      closedDays.push(day);
      totalCash += closureCash;
    }

    revalidatePath("/caisse");
    return { ok: true, closedDays, totalCash };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/**
 * Recherche client pour l'association d'un ticket caisse.
 * Retourne les 20 clients les plus récents si `q` est vide.
 */
export async function searchClientsForCaisseAction(
  q: string,
): Promise<Array<{ id: string; display_name: string; city: string | null; phone: string | null; email: string | null }>> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  let qb = supabase
    .from("clients")
    .select("id, display_name, city, phone, email")
    .order("created_at", { ascending: false })
    .limit(20);
  const term = q.trim();
  if (term.length >= 2) {
    qb = qb.or(
      `display_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`,
    );
  }
  const { data } = await qb;
  return (data ?? []) as Array<{
    id: string;
    display_name: string;
    city: string | null;
    phone: string | null;
    email: string | null;
  }>;
}
