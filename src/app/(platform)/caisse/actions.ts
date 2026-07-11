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

export async function searchCaisseCatalogAction(
  query: string
): Promise<Array<{ reference: string; nom: string; designation: string; prix: number | null; fournisseur: string; type: string }>> {
  if (!query || query.length < 2) return [];
  const { CATALOG_PRODUCTS } = await import("@/lib/boutique/products-catalog");
  const q = query.toLowerCase();
  const results: typeof CATALOG_PRODUCTS = [];
  for (const p of CATALOG_PRODUCTS) {
    if (p.prix == null) continue;
    if (
      p.nom.toLowerCase().includes(q) ||
      p.reference.toLowerCase().includes(q) ||
      p.fournisseur.toLowerCase().includes(q)
    ) {
      results.push(p);
      if (results.length >= 40) break;
    }
  }
  return results.map((p) => ({
    reference: p.reference,
    nom: p.nom,
    designation: p.designation,
    prix: p.prix,
    fournisseur: p.fournisseur,
    type: p.type,
  }));
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
