import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { devisStatusLabels } from "@/lib/validation/devis";
import { ClientPortal } from "./client-portal";

export const dynamic = "force-dynamic";

/**
 * Espace client — accès par lien tokenisé envoyé dans l'email du devis.
 *
 * Auth : la possession du token suffit. Pas de mot de passe. Le token est
 * généré côté DB (UUID) à la création du devis et envoyé uniquement au
 * client par email (donc équivalent à un magic link permanent, scopé à
 * un seul devis).
 *
 * Page entièrement publique (whitelistée dans le middleware). Toutes les
 * lectures passent par service-role pour contourner le RLS.
 */
export default async function ClientSpacePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { token } = await params;
  const { paid } = await searchParams;

  if (!token || token.length < 16) notFound();

  const supabase = createServiceRoleClient();

  // 1. Résout le token → devis (refuse les devis annulés / supprimés)
  const { data: devis } = await supabase
    .from("devis")
    .select(
      "id, number, status, total_ttc, acompte_ttc, product_summary, product_detail, channel, tva_rate, valid_until, created_at, sent_at, client_id, client_viewed_at",
    )
    .eq("client_access_token" as never, token)
    .maybeSingle();

  if (!devis) notFound();

  // 1.b. Marque le devis comme "vu par le client" (1ère ouverture) +
  //      déclenche la notification interne au commercial créateur du devis
  if (!(devis as { client_viewed_at?: string | null }).client_viewed_at) {
    void (async () => {
      await supabase
        .from("devis")
        .update({ client_viewed_at: new Date().toISOString() })
        .eq("id", devis.id);
      try {
        const { notifyDevisVuClient } = await import(
          "@/lib/brevo/notify-devis-vu"
        );
        await notifyDevisVuClient(devis.id, "portail");
      } catch (err) {
        console.warn("[notify devis_vu_client]", err);
      }
    })();
  }

  // 2. Charge en parallèle : client, lignes, dossier (s'il existe), items, pose, paiements
  const [
    { data: client },
    { data: lines },
    { data: dossier },
    { data: payments },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("display_name, email, phone, city")
      .eq("id", devis.client_id)
      .maybeSingle(),
    supabase
      .from("devis_lines")
      .select("position, ref, label, detail, qty, unit_label, unit_price_ht")
      .eq("devis_id", devis.id)
      .order("position", { ascending: true }),
    supabase
      .from("dossiers")
      .select("id, number, status, scheduled_pose_at, acompte_paid")
      .eq("devis_id", devis.id)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("kind, amount_ttc, method, paid_at")
      .eq("devis_id", devis.id)
      .order("paid_at", { ascending: true }),
  ]);

  let dossierItems: Array<{ status: string; label: string; type: string }> = [];
  let pose: { scheduled_at: string | null; status: string; completed_at: string | null } | null = null;

  if (dossier?.id) {
    const [{ data: items }, { data: p }] = await Promise.all([
      supabase
        .from("dossier_items")
        .select("status, label, type")
        .eq("dossier_id", dossier.id),
      supabase
        .from("poses")
        .select("scheduled_at, status, completed_at")
        .eq("dossier_id", dossier.id)
        .maybeSingle(),
    ]);
    dossierItems = items ?? [];
    pose = p;
  }

  return (
    <ClientPortal
      token={token}
      paidJustNow={paid === "success"}
      devis={{
        id: devis.id,
        number: devis.number,
        status: devis.status,
        statusLabel: devisStatusLabels[devis.status as keyof typeof devisStatusLabels] ?? devis.status,
        total_ttc: Number(devis.total_ttc ?? 0),
        acompte_ttc: Number(devis.acompte_ttc ?? Number(devis.total_ttc ?? 0) * 0.5),
        product_summary: devis.product_summary,
        product_detail: devis.product_detail,
        tva_rate: Number(devis.tva_rate ?? 20),
        valid_until: devis.valid_until,
        sent_at: devis.sent_at,
        created_at: devis.created_at,
      }}
      client={
        client
          ? {
              display_name: client.display_name,
              email: client.email,
              phone: client.phone,
              city: client.city,
            }
          : null
      }
      lines={(lines ?? []).map((l) => ({
        ref: l.ref,
        label: l.label,
        detail: l.detail,
        qty: Number(l.qty ?? 0),
        unit_label: l.unit_label ?? "u",
        unit_price_ht: Number(l.unit_price_ht ?? 0),
      }))}
      dossier={
        dossier
          ? {
              number: dossier.number,
              status: dossier.status,
              scheduled_pose_at: dossier.scheduled_pose_at,
              itemsTotal: dossierItems.length,
              itemsReceived: dossierItems.filter((i) => i.status === "recu").length,
            }
          : null
      }
      pose={
        pose
          ? {
              scheduled_at: pose.scheduled_at,
              status: pose.status,
              completed_at: pose.completed_at,
            }
          : null
      }
      payments={(payments ?? []).map((p) => ({
        kind: p.kind,
        amount_ttc: Number(p.amount_ttc ?? 0),
        method: p.method,
        paid_at: p.paid_at,
      }))}
    />
  );
}
