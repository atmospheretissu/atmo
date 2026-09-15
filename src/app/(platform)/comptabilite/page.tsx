import { createServiceRoleClient } from "@/lib/supabase/server";
import { listAllPayments } from "@/lib/db/payments-feed";
import ComptabiliteHubClient, {
  type WireMatchRow,
  type PennylaneInvoiceRow,
} from "./comptabilite-hub-client";

export const dynamic = "force-dynamic";

/**
 * Hub Comptabilité unifié — regroupe en un seul écran les 4 vues comptables
 * qui étaient précédemment éclatées entre /caisse (2 onglets) et /virements :
 *   - Recettes           : tous les paiements (source caisse + devis)
 *   - Export Pennylane   : statut d'export ligne par ligne
 *   - Virements bancaires: rapprochements Pennylane des virements reçus
 *   - Factures Pennylane : factures poussées vers Pennylane (avec invoice_id)
 */
export default async function ComptabilitePage() {
  const sb = createServiceRoleClient();

  const [payments, wireMatchesRes] = await Promise.all([
    listAllPayments({ limit: 500 }),
    (
      sb as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            order: (
              c: string,
              o: { ascending: boolean; nullsFirst?: boolean },
            ) => {
              order: (
                c: string,
                o: { ascending: boolean },
              ) => {
                limit: (
                  n: number,
                ) => Promise<{ data: WireMatchRow[] | null }>;
              };
            };
          };
        };
      }
    )
      .from("pennylane_wire_matches")
      .select(
        "id, pennylane_transaction_id, transaction_date, matched_at, amount, label, action, devis_id, devis_number, notes, identified_by, cron_run_id",
      )
      .order("transaction_date", { ascending: false, nullsFirst: false })
      .order("matched_at", { ascending: false })
      .limit(500),
  ]);

  // Factures Pennylane = payments avec un pennylane_invoice_id (poussés
  // vers Pennylane via l'endpoint invoices). Se déduit de la liste unifiée.
  const factures: PennylaneInvoiceRow[] = payments
    .filter((p) => p.pennylane_invoice_id)
    .map((p) => ({
      id: p.id,
      pennylane_invoice_id: p.pennylane_invoice_id as string,
      exported_at: p.pennylane_exported_at,
      source: p.source,
      kind: p.kind,
      method: p.method,
      amount_ttc: p.amount_ttc,
      client_name: p.client_name,
      ref: p.ref,
      paid_at: p.paid_at,
      link: p.link,
    }));

  return (
    <ComptabiliteHubClient
      payments={payments}
      wireMatches={wireMatchesRes.data ?? []}
      factures={factures}
    />
  );
}
