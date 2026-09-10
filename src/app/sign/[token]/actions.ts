"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * F7 fallback — récupère (ou re-crée) une session Stripe Checkout pour le
 * devis identifié par son token de signature. Utilisé quand le client revient
 * sur /sign après avoir déjà signé mais sans avoir réglé l'acompte.
 */
export async function getStripeCheckoutForSignAction(
  token: string,
): Promise<{ ok: true; url: string | null } | { ok: false; message: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return { ok: false, message: "Token invalide." };
  }
  const sb = createServiceRoleClient();
  const { data: devis } = await (
    sb as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (
            c: string,
            v: string,
          ) => {
            maybeSingle: () => Promise<{
              data: { id: string } | null;
            }>;
          };
        };
      };
    }
  )
    .from("devis")
    .select("id")
    .eq("signature_token", token)
    .maybeSingle();
  if (!devis) return { ok: false, message: "Devis introuvable." };
  try {
    const { createStripeCheckoutAction } = await import(
      "@/app/(platform)/devis/stripe-actions"
    );
    const r = await createStripeCheckoutAction(devis.id);
    if (r.ok) return { ok: true, url: r.url };
    return { ok: false, message: r.message };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Erreur Stripe",
    };
  }
}

export type SignatureResult =
  | {
      ok: true;
      devisId: string;
      number: string;
      /** URL Stripe Checkout pour l'acompte — le client est redirigé
       *  directement après signature (F7 PE 08/09 : parcours unifié). Null
       *  si Stripe indispo (l'app affiche alors un message alternatif). */
      stripeUrl: string | null;
    }
  | { ok: false; message: string };

/**
 * Enregistre l'attestation de signature électronique du devis identifié
 * par son token — attestation interne à l'outil (pas de tiers externe).
 * - Le nom + horodatage + IP constituent la preuve.
 * - L'IP est loggée pour l'audit RGPD.
 * - Une fois signé, on ne peut plus re-signer (idempotence).
 * - La transition vers "acompte_recu" reste conditionnée au marquage
 *   d'acompte reçu (côté back-office).
 */
export async function signDevisAction(
  token: string,
  input: {
    fullName: string;
    phone?: string;
    acceptCgv: boolean;
  },
): Promise<SignatureResult> {
  const name = input.fullName.trim();
  if (name.length < 2) {
    return { ok: false, message: "Merci de saisir votre nom complet." };
  }
  if (!input.acceptCgv) {
    return {
      ok: false,
      message:
        "Vous devez accepter les Conditions Générales de Vente pour signer.",
    };
  }

  const supabase = createServiceRoleClient();

  const { data: devis, error: e1 } = await (
    supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (
            c: string,
            v: string,
          ) => {
            maybeSingle: () => Promise<{
              data: {
                id: string;
                number: string;
                signed_at: string | null;
              } | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    }
  )
    .from("devis")
    .select("id, number, signed_at")
    .eq("signature_token", token)
    .maybeSingle();

  if (e1) return { ok: false, message: e1.message };
  if (!devis) return { ok: false, message: "Devis introuvable." };
  if (devis.signed_at) {
    return {
      ok: false,
      message: "Ce devis a déjà été signé — impossible de re-signer.",
    };
  }

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;

  const { error: e2 } = await (
    supabase as unknown as {
      from: (t: string) => {
        update: (v: Record<string, unknown>) => {
          eq: (
            c: string,
            v: string,
          ) => Promise<{ error: { message: string } | null }>;
        };
      };
    }
  )
    .from("devis")
    .update({
      signed_at: new Date().toISOString(),
      signed_by_name: name,
      signed_by_phone: input.phone?.trim() || null,
      signed_by_ip: ip,
    })
    .eq("id", devis.id);

  if (e2) return { ok: false, message: e2.message };

  revalidatePath(`/devis/${devis.id}`);

  // F7 (PE 08/09) : parcours unifié signature → paiement Stripe.
  // On génère l'URL Stripe Checkout dès la signature validée, pour que le
  // client soit redirigé immédiatement sans intermédiaire. Best-effort :
  // si Stripe échoue, on renvoie null et l'UI affiche un fallback texte.
  let stripeUrl: string | null = null;
  try {
    const { createStripeCheckoutAction } = await import(
      "@/app/(platform)/devis/stripe-actions"
    );
    const r = await createStripeCheckoutAction(devis.id);
    if (r.ok) stripeUrl = r.url;
  } catch (err) {
    console.warn("[sign→stripe]", err);
  }

  return { ok: true, devisId: devis.id, number: devis.number, stripeUrl };
}
