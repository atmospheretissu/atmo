/**
 * Détection auto des acomptes par motif de virement.
 *
 * Flux : le client fait un virement bancaire en indiquant le numéro
 * de devis (ex : « DEV-2026-0011 ») dans le libellé. Pennylane synchro
 * la banque → l'écriture apparaît dans /transactions. Ce module :
 *
 *   1. Récupère les transactions récentes non encore traitées côté Atmo
 *      (tracking via table pennylane_wire_matches).
 *   2. Extrait un pattern DEV-YYYY-NNNN dans le libellé.
 *   3. Retrouve le devis, compare le montant à l'acompte OU au solde.
 *   4. Si le montant correspond (±2%) et le devis n'est pas déjà réglé,
 *      marque acompte/solde reçu automatiquement + insère un payment.
 *   5. Log chaque décision (matched, mismatch, no devis) pour audit.
 *
 * Idempotent : la table pennylane_wire_matches a une contrainte unique
 * sur pennylane_transaction_id. Un cron qui rejoue ne créera jamais un
 * doublon.
 */

import { pennylaneRequest, isPennylaneConfigured } from "./client";
import {
  getPennylaneSettings,
  markError,
  markPushed,
} from "./settings";
import { createServiceRoleClient } from "@/lib/supabase/server";

const DEVIS_REGEX = /DEV-\d{4}-\d{3,5}/i;
const TOLERANCE_PCT = 0.02;

export type WireMatchResult = {
  ok: boolean;
  scanned: number;
  new_matches: number;
  acomptes_marked: number;
  soldes_marked: number;
  skipped_amount: number;
  skipped_no_devis: number;
  errors: string[];
  disabled?: boolean;
  message?: string;
};

type PennylaneTransaction = {
  id: string | number;
  date: string;
  currency_amount: string;
  currency: string;
  label: string;
  transaction_type?: string;
  bank_account?: { id: number; name?: string };
};

export async function pullWireTransfersAndReconcile(opts: {
  sinceISODate?: string;
  maxPages?: number;
} = {}): Promise<WireMatchResult> {
  const cfg = isPennylaneConfigured();
  const settings = await getPennylaneSettings();
  const stats0: WireMatchResult = {
    ok: false,
    scanned: 0,
    new_matches: 0,
    acomptes_marked: 0,
    soldes_marked: 0,
    skipped_amount: 0,
    skipped_no_devis: 0,
    errors: [],
  };

  if (!settings.auto_reconcile_by_wire_label) {
    return { ...stats0, disabled: true, message: "Toggle désactivé" };
  }
  if (!cfg.transactions) {
    return {
      ...stats0,
      disabled: true,
      message: "PENNYLANE_TOKEN_TRANSACTIONS absent",
    };
  }

  const maxPages = opts.maxPages ?? 5;
  const since =
    opts.sinceISODate ??
    new Date(Date.now() - 60 * 86400_000).toISOString().slice(0, 10);
  const sb = svc();

  for (let page = 1; page <= maxPages; page++) {
    const r = await pennylaneRequest<{ items: PennylaneTransaction[] }>(
      "transactions",
      "/transactions",
      { query: { page, per_page: 100 } },
    );
    if (!r.ok) {
      if (r.disabled) {
        return { ...stats0, disabled: true, message: r.reason };
      }
      stats0.errors.push(`page ${page}: ${r.message}`);
      break;
    }
    const items = r.data.items ?? [];
    if (items.length === 0) break;

    for (const tx of items) {
      if (tx.date < since) continue;
      stats0.scanned++;

      const amount = Number(tx.currency_amount);
      if (!Number.isFinite(amount) || amount <= 0) continue; // sortie/débit
      const label = tx.label ?? "";
      const match = label.match(DEVIS_REGEX);
      if (!match) continue;
      const devisNumber = match[0].toUpperCase();

      // Déjà traité ? (idempotence)
      const { data: existing } = (await sb
        .from("pennylane_wire_matches")
        .select("id")
        .eq("pennylane_transaction_id", String(tx.id))
        .maybeSingle()) as { data: { id: string } | null; error: unknown };
      if (existing) continue;

      // Lookup devis
      const { data: devis } = (await sb
        .from("devis")
        .select(
          "id, number, status, total_ttc, acompte_ttc, client_id",
        )
        .eq("number", devisNumber)
        .maybeSingle()) as {
        data: {
          id: string;
          number: string;
          status: string;
          total_ttc: string | number;
          acompte_ttc: string | number;
          client_id: string;
        } | null;
        error: unknown;
      };

      if (!devis) {
        await sb.from("pennylane_wire_matches").insert({
          pennylane_transaction_id: String(tx.id),
          devis_number: devisNumber,
          amount,
          label,
          action: "skipped_no_devis",
        });
        stats0.skipped_no_devis++;
        continue;
      }

      const totalTtc = Number(devis.total_ttc);
      const acompteTtc = Number(devis.acompte_ttc);
      const soldeTtc = Math.max(0, totalTtc - acompteTtc);

      // Détermine si le montant colle à l'acompte, au solde, ou au total
      const withinTolerance = (target: number) =>
        target > 0 &&
        Math.abs(amount - target) / target <= TOLERANCE_PCT;

      const isAcompte = withinTolerance(acompteTtc) &&
        devis.status !== "acompte_recu" &&
        devis.status !== "refuse" &&
        devis.status !== "expire";
      const isSolde =
        !isAcompte &&
        withinTolerance(soldeTtc) &&
        devis.status === "acompte_recu";
      const isFullPayment =
        !isAcompte && !isSolde && withinTolerance(totalTtc);

      if (!isAcompte && !isSolde && !isFullPayment) {
        await sb.from("pennylane_wire_matches").insert({
          pennylane_transaction_id: String(tx.id),
          devis_id: devis.id,
          devis_number: devisNumber,
          amount,
          label,
          action: "skipped_amount_mismatch",
          notes: `Attendu acompte=${acompteTtc}€ ou solde=${soldeTtc}€ ou total=${totalTtc}€ · reçu ${amount}€`,
        });
        stats0.skipped_amount++;
        continue;
      }

      // Effectue le marquage
      const kind: "acompte" | "solde" = isSolde ? "solde" : "acompte";
      const amountToRecord = isSolde ? soldeTtc : isFullPayment ? totalTtc : acompteTtc;

      // 1. Insert payment
      const { data: payInserted } = (await (
        sb as unknown as {
          from: (t: string) => {
            insert: (v: unknown) => {
              select: (s: string) => {
                single: () => Promise<{
                  data: { id: string } | null;
                  error: unknown;
                }>;
              };
            };
          };
        }
      )
        .from("payments")
        .insert({
          devis_id: devis.id,
          client_id: devis.client_id,
          kind,
          method: "virement",
          amount_ttc: amountToRecord,
          notes: `Rapprochement auto via motif virement (Pennylane tx ${tx.id})`,
        })
        .select("id")
        .single()) as {
        data: { id: string } | null;
        error: unknown;
      };

      // 2. Update devis status
      if (kind === "acompte") {
        await sb
          .from("devis")
          .update({ status: "acompte_recu" })
          .eq("id", devis.id);
        // Update dossier acompte_paid si le dossier existe déjà, sinon
        // on laisse markAcompteRecu-style le créer plus tard via action
        // manuelle. Ici on reste minimal pour ne pas doubler la logique.
      } else if (kind === "solde") {
        const { data: dossier } = (await sb
          .from("dossiers")
          .select("id")
          .eq("devis_id", devis.id)
          .maybeSingle()) as { data: { id: string } | null; error: unknown };
        if (dossier) {
          await sb
            .from("dossiers")
            .update({
              solde_paid: true,
              solde_paid_at: new Date().toISOString(),
            })
            .eq("id", dossier.id);
        }
      }

      // 3. Log dans pennylane_wire_matches
      await sb.from("pennylane_wire_matches").insert({
        pennylane_transaction_id: String(tx.id),
        devis_id: devis.id,
        devis_number: devisNumber,
        amount,
        label,
        action: kind === "solde" ? "solde_marked" : "acompte_marked",
        notes: `Payment inséré ${payInserted?.id ?? "(échec)"}`,
      });

      if (kind === "acompte") stats0.acomptes_marked++;
      else stats0.soldes_marked++;
      stats0.new_matches++;
    }
    if (items.length < 100) break;
  }

  // Enregistre le stats dans pennylane_settings
  const sbUpd = svc();
  await (
    sbUpd as unknown as {
      from: (t: string) => {
        update: (v: unknown) => {
          eq: (
            c: string,
            v: boolean,
          ) => Promise<{ error: unknown }>;
        };
      };
    }
  )
    .from("pennylane_settings")
    .update({
      last_wire_scan_at: new Date().toISOString(),
      last_wire_scan_stats: {
        scanned: stats0.scanned,
        new_matches: stats0.new_matches,
        acomptes_marked: stats0.acomptes_marked,
        soldes_marked: stats0.soldes_marked,
        skipped_amount: stats0.skipped_amount,
        skipped_no_devis: stats0.skipped_no_devis,
        at: new Date().toISOString(),
      },
    })
    .eq("id", true);

  if (stats0.errors.length > 0) await markError(stats0.errors.join(" · "));
  else if (stats0.new_matches > 0) await markPushed();

  stats0.ok = true;
  return stats0;
}

function svc() {
  return createServiceRoleClient() as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (
          c: string,
          v: string,
        ) => {
          maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
        };
      };
      update: (v: unknown) => {
        eq: (c: string, v: string) => Promise<{ error: unknown }>;
      };
      insert: (v: unknown) => Promise<{ error: unknown }>;
    };
  };
}
