"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type SignatureResult =
  | { ok: true; devisId: string; number: string }
  | { ok: false; message: string };

/**
 * Enregistre la signature électronique du devis identifié par son token.
 * - Le nom saisi devient la preuve visuelle (affiché comme le bandeau
 *   Yousign).
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
  return { ok: true, devisId: devis.id, number: devis.number };
}
