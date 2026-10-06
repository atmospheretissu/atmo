"use server";

import { createClient } from "@/lib/supabase/server";
import { pennylaneRequest, isPennylaneConfigured } from "@/lib/pennylane/client";
import { getPennylaneSettings } from "@/lib/pennylane/settings";

export type VerifyResult =
  | {
      ok: true;
      disabled?: false;
      matched: boolean;
      invoiceNumber?: string;
      pennylaneStatus?: string;
      payments?: Array<{
        id: number;
        date: string;
        amount: string;
        method?: string;
      }>;
    }
  | { ok: true; disabled: true; message: string; settingsHint?: boolean }
  | { ok: false; message: string };

/**
 * Vérifie côté Pennylane l'état d'une facture liée à un devis Atmo.
 * Cherche par référence dans `special_mention` (« Réf. devis Atmo :
 * DEV-… ») OU par payments.pennylane_invoice_id si connu.
 */
export async function verifyDevisOnPennylaneAction(
  devisId: string,
): Promise<VerifyResult> {
  const cfg = isPennylaneConfigured();
  const settings = await getPennylaneSettings();
  // Ces deux messages s'affichent tels quels dans une fenêtre, à des gens
  // qui ne connaissent ni nos noms de variables ni nos noms de bascules.
  // Pierre-Edouard est tombé dessus le 06/10 et a demandé « c'est
  // normal ? » — la réponse était oui, mais rien dans le message ne le
  // disait ni n'indiquait quoi faire.
  if (!cfg.invoices) {
    return {
      ok: true,
      disabled: true,
      message:
        "La connexion à Pennylane n'est pas encore en place sur ce serveur. Rien à faire depuis l'outil : c'est une clé d'accès à installer.",
    };
  }
  if (
    !settings.push_invoice_enabled &&
    !settings.pull_reconciliation_enabled
  ) {
    // « Aucun flux actif » était faux et c'est ce qui a dérouté
    // Pierre-Edouard : la lecture des virements bancaires, elle, tourne
    // toutes les heures. Ce bouton ne regarde que les deux flux liés aux
    // factures. On dit donc lequel marche et lesquels dorment, plutôt que
    // de laisser croire que Pennylane est hors service.
    const wireOn = settings.auto_reconcile_by_wire_label;
    return {
      ok: true,
      disabled: true,
      message: wireOn
        ? "Les factures ne sont pas encore synchronisées avec Pennylane : elles n'y sont ni envoyées ni relues. Il n'y a donc rien à vérifier pour ce devis. En revanche la lecture des virements bancaires, elle, fonctionne : les paiements portant un numéro de devis en libellé sont rapprochés automatiquement chaque heure."
        : "La synchronisation avec Pennylane est entièrement désactivée : aucune facture n'est envoyée ni relue, et les virements bancaires ne sont pas lus.",
      settingsHint: true,
    };
  }

  const supabase = await createClient();
  const { data: devis } = await supabase
    .from("devis")
    .select("id, number")
    .eq("id", devisId)
    .maybeSingle();
  if (!devis) return { ok: false, message: "Devis introuvable" };

  // 1. Si on a un pennylane_invoice_id sur payments, on récupère direct
  const { data: pay } = (await (
    supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (
            c: string,
            v: string,
          ) => {
            not: (
              c: string,
              op: string,
              v: unknown,
            ) => {
              maybeSingle: () => Promise<{
                data: { pennylane_invoice_id: string | null } | null;
              }>;
            };
          };
        };
      };
    }
  )
    .from("payments")
    .select("pennylane_invoice_id")
    .eq("devis_id", devisId)
    .not("pennylane_invoice_id", "is", null)
    .maybeSingle()) as {
    data: { pennylane_invoice_id: string | null } | null;
  };

  if (pay?.pennylane_invoice_id) {
    const r = await pennylaneRequest<{
      invoice_number: string;
      status: string;
      payments: Array<{
        id: number;
        date: string;
        amount: string;
        payment_method?: string;
      }>;
    }>("invoices", `/customer_invoices/${pay.pennylane_invoice_id}`);
    if (!r.ok) {
      const msg = r.disabled ? "Token absent" : `Pennylane: ${r.message}`;
      return { ok: false, message: msg };
    }
    return {
      ok: true,
      matched: true,
      invoiceNumber: r.data.invoice_number,
      pennylaneStatus: r.data.status,
      payments: (r.data.payments ?? []).map((p) => ({
        id: p.id,
        date: p.date,
        amount: p.amount,
        method: p.payment_method,
      })),
    };
  }

  // 2. Sinon, cherche parmi les factures récentes par special_mention
  const r = await pennylaneRequest<{
    items: Array<{
      id: number;
      invoice_number: string;
      status: string;
      special_mention: string | null;
      payments: Array<{
        id: number;
        date: string;
        amount: string;
        payment_method?: string;
      }>;
    }>;
  }>("invoices", "/customer_invoices", { query: { per_page: 100 } });
  if (!r.ok) {
    const msg = r.disabled ? "Token absent" : `Pennylane: ${r.message}`;
    return { ok: false, message: msg };
  }
  const found = (r.data.items ?? []).find((inv) =>
    (inv.special_mention ?? "").includes(devis.number),
  );
  if (!found) {
    return { ok: true, matched: false };
  }
  return {
    ok: true,
    matched: true,
    invoiceNumber: found.invoice_number,
    pennylaneStatus: found.status,
    payments: (found.payments ?? []).map((p) => ({
      id: p.id,
      date: p.date,
      amount: p.amount,
      method: p.payment_method,
    })),
  };
}
