"use server";

import { revalidatePath } from "next/cache";
import { createTicket, createClosure } from "@/lib/db/caisse";
import type { TicketInput, TicketCreated } from "@/lib/db/caisse";

type Result<T> = ({ ok: true } & T) | { ok: false; message: string };

export async function createTicketAction(
  input: TicketInput
): Promise<Result<{ ticket: TicketCreated }>> {
  try {
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
  notes?: string
): Promise<Result<{ id: string; variance: number | null }>> {
  try {
    const r = await createClosure(date, cash_counted, notes);
    revalidatePath("/caisse");
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
