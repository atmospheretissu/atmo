"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendBrevoEmail, isBrevoConfigured } from "@/lib/brevo/client";

export type SendRatingRequestResult =
  | { ok: true; rateUrl: string; emailedTo: string | null }
  | { ok: false; message: string };

/**
 * Fin de dossier (PE 14/09) : crée une note vierge avec un token public et
 * envoie au client par email le lien pour noter le dossier 1-5.
 * Idempotent : si une note existe déjà, on renvoie le même lien.
 */
export async function requestDossierRatingAction(
  dossierId: string,
): Promise<SendRatingRequestResult> {
  const sb = createServiceRoleClient();

  const { data: dossier } = await sb
    .from("dossiers")
    .select("id, number, client_id")
    .eq("id", dossierId)
    .maybeSingle();
  if (!dossier) return { ok: false, message: "Dossier introuvable" };

  const { data: client } = await sb
    .from("clients")
    .select("display_name, email")
    .eq("id", dossier.client_id)
    .maybeSingle();

  // Idempotence : réutilise le token existant si déjà créé.
  const { data: existing } = await (
    sb as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (
            c: string,
            v: string,
          ) => {
            maybeSingle: () => Promise<{
              data: { rate_token: string } | null;
            }>;
          };
        };
      };
    }
  )
    .from("dossier_ratings")
    .select("rate_token")
    .eq("dossier_id", dossierId)
    .maybeSingle();

  let token: string;
  if (existing) {
    token = existing.rate_token;
  } else {
    const { data: inserted, error } = await (
      sb as unknown as {
        from: (t: string) => {
          insert: (v: unknown) => {
            select: (s: string) => {
              single: () => Promise<{
                data: { rate_token: string } | null;
                error: { message?: string } | null;
              }>;
            };
          };
        };
      }
    )
      .from("dossier_ratings")
      .insert({ dossier_id: dossierId })
      .select("rate_token")
      .single();
    if (error || !inserted) {
      return { ok: false, message: error?.message ?? "Insert failed" };
    }
    token = inserted.rate_token;
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "https://atmo-production.up.railway.app");
  const rateUrl = `${appUrl.replace(/\/+$/, "")}/rate/${token}`;

  // Envoi email best-effort
  if (client?.email && isBrevoConfigured()) {
    const firstName =
      client.display_name.split(",")[1]?.trim() ?? client.display_name;
    const html = `<!DOCTYPE html><html lang="fr"><body style="font-family: Arial, Helvetica, sans-serif; color: #0F172A; padding: 24px; background: #F8FAFC;">
<div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; padding: 28px;">
  <p style="font-size: 11px; letter-spacing: 1.5px; color: #94A3B8; text-transform: uppercase; margin: 0 0 8px;">Atmosphère Tissus</p>
  <h1 style="font-size: 22px; margin: 0 0 16px; color: #0F172A;">Comment s'est passée votre pose ?</h1>
  <p style="font-size: 14px; line-height: 1.55; color: #334155; margin: 0 0 20px;">Bonjour ${firstName},</p>
  <p style="font-size: 14px; line-height: 1.55; color: #334155; margin: 0 0 20px;">Votre dossier ${dossier.number} est terminé. Pourriez-vous prendre 30 secondes pour nous donner votre avis ? Cela nous aide énormément à progresser.</p>
  <div style="text-align: center; margin: 24px 0;">
    <a href="${rateUrl}" style="display: inline-block; background: #0F172A; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Noter mon expérience →</a>
  </div>
  <p style="font-size: 12px; color: #64748B; line-height: 1.55; margin: 24px 0 0;">Atmosphère Tissus · 1 rue de l'Union, Village des Voiles, 59520 Marquette-lez-Lille</p>
</div>
</body></html>`;
    await sendBrevoEmail({
      to: [{ email: client.email, name: client.display_name }],
      subject: `ATMOSPHERE – Votre avis sur le dossier ${dossier.number}`,
      htmlContent: html,
    }).catch(() => null);
  }

  return { ok: true, rateUrl, emailedTo: client?.email ?? null };
}
