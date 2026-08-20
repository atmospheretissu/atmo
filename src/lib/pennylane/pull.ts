/**
 * Pull Pennylane → Atmosphère (réconciliation).
 *
 * Récupère les factures récentes de Pennylane et, pour chacune qui a
 * un `payments[]` non vide, met à jour côté Atmo :
 *   - payments.pennylane_exported_at / pennylane_invoice_id si le
 *     mapping n'était pas encore fait (ex : facture créée à la main
 *     dans Pennylane)
 *   - flag « rapproché » (à créer si besoin plus tard)
 *
 * Ne crée pas de nouveau payment côté Atmo — c'est la source
 * comptable qui vérifie, pas qui pousse.
 */

import { pennylaneRequest, isPennylaneConfigured } from "./client";
import { getPennylaneSettings, markPulled, markError } from "./settings";
import { createServiceRoleClient } from "@/lib/supabase/server";

type PennylaneInvoice = {
  id: number;
  invoice_number: string;
  date: string;
  amount: string;
  currency: string;
  paid: boolean;
  status: string;
  special_mention: string | null;
  payments: Array<{
    id: number;
    date: string;
    amount: string;
    payment_method?: string;
    transaction_reference?: string;
  }>;
};

export type PullResult = {
  ok: boolean;
  scanned: number;
  matched: number;
  errors: string[];
  message?: string;
  disabled?: boolean;
};

/**
 * Pull des factures récentes (paginé). Renvoie un rapport.
 * @param sinceISODate     Date min de facture à scanner (défaut : 30 jours)
 * @param maxPages         Nombre max de pages à parcourir (défaut 5, 100/page)
 */
export async function pullPennylaneInvoices(opts: {
  sinceISODate?: string;
  maxPages?: number;
} = {}): Promise<PullResult> {
  const settings = await getPennylaneSettings();
  const cfg = isPennylaneConfigured();
  if (!settings.pull_reconciliation_enabled) {
    return {
      ok: false,
      scanned: 0,
      matched: 0,
      errors: [],
      disabled: true,
      message: "Pull désactivé dans les settings",
    };
  }
  if (!cfg.invoices) {
    return {
      ok: false,
      scanned: 0,
      matched: 0,
      errors: [],
      disabled: true,
      message: "Token invoices absent (dev)",
    };
  }

  const maxPages = opts.maxPages ?? 5;
  const since =
    opts.sinceISODate ??
    new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  let scanned = 0;
  let matched = 0;
  const errors: string[] = [];
  const sb = svc();

  for (let page = 1; page <= maxPages; page++) {
    const res = await pennylaneRequest<{ items: PennylaneInvoice[] }>(
      "invoices",
      "/customer_invoices",
      { query: { page, per_page: 100 } },
    );
    if (!res.ok) {
      if ("disabled" in res && res.disabled) {
        return { ok: false, scanned, matched, errors, disabled: true };
      }
      errors.push(`page ${page}: ${res.message}`);
      break;
    }
    const items = res.data.items ?? [];
    if (items.length === 0) break;

    for (const inv of items) {
      // Skip factures antérieures à la date pivot
      if (inv.date < since) continue;
      scanned++;
      if (!inv.payments || inv.payments.length === 0) continue;

      // Cherche notre payment via l'invoice_number OU la référence
      // dans special_mention (« Réf. devis Atmo : DEV-2026-… »).
      const devisRef = extractDevisNumber(inv.special_mention);
      if (!devisRef) continue;

      const { data: found } = (await sb
        .from("devis")
        .select("id")
        .eq("number", devisRef)
        .maybeSingle()) as { data: { id: string } | null; error: unknown };
      if (!found) continue;

      const { data: pay } = (await sb
        .from("payments")
        .select("id, pennylane_invoice_id")
        .eq("devis_id", found.id)
        .maybeSingle()) as {
        data: { id: string; pennylane_invoice_id: string | null } | null;
        error: unknown;
      };
      if (!pay) continue;

      if (!pay.pennylane_invoice_id) {
        await sb
          .from("payments")
          .update({
            pennylane_invoice_id: String(inv.id),
            pennylane_exported_at: new Date().toISOString(),
            pennylane_export_notes: `Réconcilié via pull (facture ${inv.invoice_number || inv.id})`,
          })
          .eq("id", pay.id);
        matched++;
      }
    }
    if (items.length < 100) break; // dernière page
  }

  await markPulled({ scanned, matched, at: new Date().toISOString() });
  if (errors.length > 0) await markError(errors.join(" · "));
  return { ok: true, scanned, matched, errors };
}

function extractDevisNumber(mention: string | null): string | null {
  if (!mention) return null;
  const m = mention.match(/DEV-\d{4}-\d{4}/);
  return m ? m[0] : null;
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
    };
  };
}
