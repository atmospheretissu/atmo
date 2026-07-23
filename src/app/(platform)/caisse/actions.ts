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
    // Blocage : impossible d'encaisser tant qu'une journée passée n'est pas
    // clôturée avec comptage détaillé.
    const blocked = await getPreviousUnclosedDay();
    if (blocked) {
      return {
        ok: false,
        message: `Impossible d'encaisser : la journée du ${blocked} n'est pas encore clôturée. Effectue le comptage détaillé pour continuer.`,
      };
    }
    const ticket = await createTicket(input);
    revalidatePath("/caisse");
    revalidatePath("/dashboard");
    return { ok: true, ticket };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

type CatalogSearchRow = {
  ref: string;
  name: string;
  category: string;
  description: string | null;
  unit_price_ht: number | string | null;
  supplier_name: string | null;
};

export type CaisseSearchResult = {
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
    .select("ref, name, category, description, unit_price_ht, supplier_name")
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
