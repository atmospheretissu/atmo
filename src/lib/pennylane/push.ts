/**
 * Push Atmosphère → Pennylane.
 *
 * Deux fonctions publiques :
 *   - upsertPennylaneCustomer(clientId) : crée ou retrouve le client
 *     Pennylane, stocke son id dans clients.pennylane_customer_id.
 *   - pushInvoiceForPayment({ devisId?, ticketId?, kind }) : crée une
 *     facture Pennylane pour un encaissement, la marque payée avec le
 *     paiement associé, stocke pennylane_invoice_id côté Atmo.
 *
 * Toutes les fonctions renvoient un `PushResult` clair. Elles ne
 * throwent JAMAIS — c'est à l'appelant de logguer et de décider si
 * l'échec bloque le flow métier (a priori non : le devis passe à
 * acompte_recu même si Pennylane est en rade).
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { isPennylaneConfigured, pennylaneRequest } from "./client";
import { getPennylaneSettings, markError, markPushed } from "./settings";

export type PushResult =
  | { ok: true; pennylaneId: number; skipped?: false }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; message: string };

type ClientRow = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  address_pose: string | null;
  postal_code: string | null;
  city: string | null;
  pennylane_customer_id: number | null;
};

const COUNTRY_ALPHA2 = "FR";

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

/**
 * Upsert client Pennylane. Retourne l'id numérique Pennylane et
 * met à jour clients.pennylane_customer_id dans notre base.
 */
export async function upsertPennylaneCustomer(
  clientId: string,
): Promise<PushResult> {
  const settings = await getPennylaneSettings();
  const cfg = isPennylaneConfigured();
  if (!settings.push_customer_enabled) {
    return { ok: true, skipped: true, reason: "push_customer désactivé" };
  }
  if (!cfg.customers) {
    return { ok: true, skipped: true, reason: "Token customers absent (dev)" };
  }

  const sb = svc();
  const { data: client } = (await sb
    .from("clients")
    .select(
      "id, display_name, email, phone, address_pose, postal_code, city, pennylane_customer_id",
    )
    .eq("id", clientId)
    .maybeSingle()) as { data: ClientRow | null; error: unknown };
  if (!client) return { ok: false, message: "Client introuvable" };

  // Déjà mappé — on le retourne
  if (client.pennylane_customer_id) {
    return { ok: true, pennylaneId: client.pennylane_customer_id };
  }

  // Construit le payload Pennylane (customer_type: individual pour
  // les particuliers — pas de raison sociale ici).
  const [prenom, nom] = splitDisplayName(client.display_name);
  const payload = {
    customer_type: "individual",
    first_name: prenom,
    last_name: nom,
    emails: client.email ? [client.email] : [],
    phone: client.phone ?? undefined,
    billing_address: {
      address: client.address_pose ?? "",
      postal_code: client.postal_code ?? "",
      city: client.city ?? "",
      country_alpha2: COUNTRY_ALPHA2,
    },
  };

  const res = await pennylaneRequest<{ id: number }>("customers", "/customers", {
    method: "POST",
    body: payload,
  });
  if (!res.ok) {
    if ("disabled" in res && res.disabled) {
      return { ok: true, skipped: true, reason: res.reason };
    }
    await markError(`push customer ${client.id}: ${res.message}`);
    return { ok: false, message: res.message };
  }

  // Sauvegarde le mapping
  await sb
    .from("clients")
    .update({ pennylane_customer_id: res.data.id })
    .eq("id", client.id);
  return { ok: true, pennylaneId: res.data.id };
}

/**
 * Crée une facture Pennylane pour un paiement Atmo (acompte ou solde
 * de devis). Le paiement est enregistré comme payé.
 */
export async function pushInvoiceForDevisPayment(input: {
  devisId: string;
  paymentId: string; // notre payments.id
  kind: "acompte" | "solde";
  amountTtc: number;
  paidAt: string; // ISO
  paymentMethod: "cb" | "virement" | "cheque" | "especes" | "stripe";
}): Promise<PushResult> {
  const settings = await getPennylaneSettings();
  const cfg = isPennylaneConfigured();
  if (!settings.push_invoice_enabled) {
    return { ok: true, skipped: true, reason: "push_invoice désactivé" };
  }
  if (!cfg.invoices) {
    return { ok: true, skipped: true, reason: "Token invoices absent (dev)" };
  }

  const sb = svc();
  // Récupère le devis pour tirer le client_id + numéro
  const { data: devis } = (await sb
    .from("devis")
    .select("id, number, client_id, tva_rate")
    .eq("id", input.devisId)
    .maybeSingle()) as {
    data: {
      id: string;
      number: string;
      client_id: string;
      tva_rate: number;
    } | null;
    error: unknown;
  };
  if (!devis) return { ok: false, message: "Devis introuvable" };

  // Upsert client d'abord (sans dépendre du toggle push_customer :
  // une facture sans customer_id est refusée par Pennylane).
  const c = await upsertPennylaneCustomerForced(devis.client_id);
  if (!c.ok || c.skipped) {
    return c.ok
      ? { ok: false, message: `Customer skipped: ${c.reason}` }
      : c;
  }

  const tvaRate = Number(devis.tva_rate ?? 20);
  const totalHt = Math.round((input.amountTtc / (1 + tvaRate / 100)) * 100) / 100;
  const label =
    input.kind === "acompte"
      ? `Acompte devis ${devis.number}`
      : `Solde devis ${devis.number}`;

  const invoicePayload = {
    date: input.paidAt.slice(0, 10),
    deadline: input.paidAt.slice(0, 10),
    customer: { id: c.pennylaneId },
    currency: "EUR",
    special_mention: `Réf. devis Atmo : ${devis.number}`,
    invoice_lines: [
      {
        label,
        quantity: 1,
        unit: "u",
        currency_amount: totalHt.toFixed(2),
        vat_rate: "FR_200",
      },
    ],
  };

  const res = await pennylaneRequest<{ id: number; invoice_number: string }>(
    "invoices",
    "/customer_invoices",
    { method: "POST", body: invoicePayload },
  );
  if (!res.ok) {
    if ("disabled" in res && res.disabled) {
      return { ok: true, skipped: true, reason: res.reason };
    }
    await markError(
      `push invoice devis=${devis.number}: ${res.message}`,
    );
    return { ok: false, message: res.message };
  }

  // Sauvegarde le mapping sur payments
  await sb
    .from("payments")
    .update({
      pennylane_invoice_id: String(res.data.id),
      pennylane_exported_at: new Date().toISOString(),
    })
    .eq("id", input.paymentId);
  await markPushed();
  return { ok: true, pennylaneId: res.data.id };
}

/**
 * Variante interne qui ignore le toggle push_customer mais respecte
 * la configuration (token présent). Utilisé par push_invoice qui a
 * besoin d'un customer_id.
 */
async function upsertPennylaneCustomerForced(
  clientId: string,
): Promise<PushResult> {
  const cfg = isPennylaneConfigured();
  if (!cfg.customers) {
    return { ok: true, skipped: true, reason: "Token customers absent" };
  }

  const sb = svc();
  const { data: client } = (await sb
    .from("clients")
    .select(
      "id, display_name, email, phone, address_pose, postal_code, city, pennylane_customer_id",
    )
    .eq("id", clientId)
    .maybeSingle()) as { data: ClientRow | null; error: unknown };
  if (!client) return { ok: false, message: "Client introuvable" };
  if (client.pennylane_customer_id) {
    return { ok: true, pennylaneId: client.pennylane_customer_id };
  }

  const [prenom, nom] = splitDisplayName(client.display_name);
  const payload = {
    customer_type: "individual",
    first_name: prenom,
    last_name: nom,
    emails: client.email ? [client.email] : [],
    phone: client.phone ?? undefined,
    billing_address: {
      address: client.address_pose ?? "",
      postal_code: client.postal_code ?? "",
      city: client.city ?? "",
      country_alpha2: COUNTRY_ALPHA2,
    },
  };
  const res = await pennylaneRequest<{ id: number }>("customers", "/customers", {
    method: "POST",
    body: payload,
  });
  if (!res.ok) {
    if ("disabled" in res && res.disabled)
      return { ok: true, skipped: true, reason: res.reason };
    return { ok: false, message: res.message };
  }
  await sb
    .from("clients")
    .update({ pennylane_customer_id: res.data.id })
    .eq("id", client.id);
  return { ok: true, pennylaneId: res.data.id };
}

/**
 * Nom Atmo « DUBOIS, Marie » ou « Marie Durand » → [firstName, lastName].
 */
function splitDisplayName(name: string): [string, string] {
  if (name.includes(",")) {
    const [nom, prenom] = name.split(",").map((s) => s.trim());
    return [prenom || "", nom || ""];
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return ["", parts[0]];
  return [parts[0], parts.slice(1).join(" ")];
}
