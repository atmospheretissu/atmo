"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ExportResult =
  | { ok: true; exported: number; alreadyExported: number; errors: number }
  | { ok: false; message: string };

/**
 * Marque une sélection de paiements/tickets comme exportés vers Pennylane.
 *
 * IDs au format unifié :
 *   - "p:UUID" → public.payments
 *   - "t:UUID" → public.caisse_tickets
 *
 * Phase 1 : pas d'appel API Pennylane réel — on enregistre juste la date
 * d'export + une note. Quand PENNYLANE_API_KEY sera disponible, on branche
 * ici l'envoi vrai (POST /v2/customer_invoices…) en gardant la même
 * signature et le même comportement d'idempotence (skip si déjà exporté).
 */
export async function exportToPennylaneAction(
  ids: string[],
  notes?: string,
): Promise<ExportResult> {
  if (!ids || ids.length === 0) {
    return { ok: false, message: "Aucun élément sélectionné" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée" };

  // Split par source
  const paymentIds: string[] = [];
  const ticketIds: string[] = [];
  for (const id of ids) {
    if (id.startsWith("p:")) paymentIds.push(id.slice(2));
    else if (id.startsWith("t:")) ticketIds.push(id.slice(2));
  }

  const now = new Date().toISOString();
  const exportNotes = notes?.trim()
    || `Export manuel depuis /caisse · ${new Date().toLocaleString("fr-FR")}`;

  let exported = 0;
  let alreadyExported = 0;
  let errors = 0;

  // Payments : update uniquement les non encore exportés
  if (paymentIds.length > 0) {
    const { data: existingRaw } = await supabase
      .from("payments")
      .select("*")
      .in("id", paymentIds);
    const existing = (existingRaw ?? []) as unknown as Array<{
      id: string;
      pennylane_exported_at: string | null;
    }>;

    const toUpdate = existing
      .filter((p) => !p.pennylane_exported_at)
      .map((p) => p.id);
    alreadyExported += existing.length - toUpdate.length;

    if (toUpdate.length > 0) {
      const { error } = await supabase
        .from("payments")
        .update({
          pennylane_exported_at: now,
          pennylane_export_notes: exportNotes,
        } as never)
        .in("id", toUpdate);
      if (error) errors += toUpdate.length;
      else exported += toUpdate.length;
    }
  }

  // Tickets caisse : idem
  if (ticketIds.length > 0) {
    const { data: existingRaw } = await supabase
      .from("caisse_tickets")
      .select("*")
      .in("id", ticketIds);
    const existing = (existingRaw ?? []) as unknown as Array<{
      id: string;
      pennylane_exported_at: string | null;
    }>;

    const toUpdate = existing
      .filter((t) => !t.pennylane_exported_at)
      .map((t) => t.id);
    alreadyExported += existing.length - toUpdate.length;

    if (toUpdate.length > 0) {
      const { error } = await supabase
        .from("caisse_tickets")
        .update({
          pennylane_exported_at: now,
          pennylane_export_notes: exportNotes,
        } as never)
        .in("id", toUpdate);
      if (error) errors += toUpdate.length;
      else exported += toUpdate.length;
    }
  }

  revalidatePath("/caisse");
  return { ok: true, exported, alreadyExported, errors };
}

/** Annule l'export — utile en cas d'erreur. */
export async function unmarkPennylaneExportAction(
  ids: string[],
): Promise<ExportResult> {
  if (!ids || ids.length === 0) return { ok: false, message: "Aucun élément sélectionné" };
  const supabase = await createClient();

  const paymentIds: string[] = [];
  const ticketIds: string[] = [];
  for (const id of ids) {
    if (id.startsWith("p:")) paymentIds.push(id.slice(2));
    else if (id.startsWith("t:")) ticketIds.push(id.slice(2));
  }

  if (paymentIds.length > 0) {
    await supabase
      .from("payments")
      .update({
        pennylane_exported_at: null,
        pennylane_export_notes: null,
        pennylane_invoice_id: null,
      } as never)
      .in("id", paymentIds);
  }
  if (ticketIds.length > 0) {
    await supabase
      .from("caisse_tickets")
      .update({
        pennylane_exported_at: null,
        pennylane_export_notes: null,
        pennylane_invoice_id: null,
      } as never)
      .in("id", ticketIds);
  }

  revalidatePath("/caisse");
  return {
    ok: true,
    exported: 0,
    alreadyExported: 0,
    errors: 0,
  };
}
