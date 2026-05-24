"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createDossierFromDevis } from "@/lib/db/dossiers";
import {
  changeDevisStatusAction,
  markAcompteRecuAction,
} from "@/app/(platform)/devis/actions";
import { receiveByQrAction } from "@/app/(platform)/reception/actions";
import {
  createPoseForDossierAction,
  schedulePoseAction,
  markPoseDoneAction,
} from "@/app/(platform)/poses/actions";
import { clientToDbRow, type Channel } from "@/lib/validation/client";
import { computeDevisTotals, type DevisLineInput } from "@/lib/validation/devis";
import { getNextDevisNumber } from "@/lib/db/devis";
import { triggerEvent, firstNameOf } from "@/lib/brevo/trigger-event";

/**
 * Server actions du parcours de test bout-en-bout.
 *
 * Chaque action est un wrapper non-redirigeant des actions métier existantes,
 * pour pouvoir les enchaîner depuis le wizard client de /test sans changer
 * de page. Les actions retournent toujours `{ ok, ... }` et n'utilisent pas
 * redirect().
 */

export type TestResult<T = Record<string, unknown>> =
  | ({ ok: true } & T)
  | { ok: false; message: string };

/** Crée un client de test (sans redirect — contrairement à createClientAction). */
export async function testCreateClient(input: {
  display_name: string;
  email: string;
  phone: string;
  channel: Channel;
  city?: string;
  postal_code?: string;
  address_pose?: string;
}): Promise<TestResult<{ id: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée." };

  const row = clientToDbRow({
    display_name: input.display_name,
    email: input.email,
    phone: input.phone,
    channel: input.channel,
    address_pose: input.address_pose ?? "",
    city: input.city ?? "",
    postal_code: input.postal_code ?? "",
    source_notes: "Créé depuis l'onglet Test",
    internal_notes: "",
    preferences: "",
  });

  const { data, error } = await supabase
    .from("clients")
    .insert(row)
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };
  revalidatePath("/clients");
  return { ok: true, id: data.id };
}

/** Crée un devis avec lignes (sans redirect). */
export async function testCreateDevis(input: {
  client_id: string;
  channel: Channel;
  product_summary: string;
  tva_rate?: number;
  lines: DevisLineInput[];
}): Promise<TestResult<{ id: string; number: string; total_ttc: number }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée." };

  const tvaRate = input.tva_rate ?? 20;
  const totals = computeDevisTotals(input.lines, tvaRate);
  const number = await getNextDevisNumber();
  const validUntil = new Date(Date.now() + 30 * 86400000)
    .toISOString()
    .split("T")[0];

  const { data: devis, error: e1 } = await supabase
    .from("devis")
    .insert({
      number,
      version: 1,
      client_id: input.client_id,
      channel: input.channel,
      status: "brouillon",
      product_summary: input.product_summary,
      qty: input.lines.reduce((acc, l) => acc + Math.ceil(l.qty), 0),
      total_ht: totals.total_ht,
      total_ttc: totals.total_ttc,
      tva_rate: tvaRate,
      valid_until: validUntil,
      commercial_id: user.id,
    })
    .select("id, number, total_ttc")
    .single();

  if (e1 || !devis) {
    return {
      ok: false,
      message: e1?.message ?? "Échec de création du devis",
    };
  }

  const linesPayload = input.lines.map((l, idx) => ({
    devis_id: devis.id,
    position: idx,
    ref: l.ref || null,
    label: l.label,
    detail: l.detail || null,
    qty: l.qty,
    unit_label: l.unit_label,
    unit_price_ht: l.unit_price_ht,
  }));

  const { error: e2 } = await supabase.from("devis_lines").insert(linesPayload);
  if (e2) {
    await supabase.from("devis").delete().eq("id", devis.id);
    return { ok: false, message: `Échec ajout des lignes : ${e2.message}` };
  }

  revalidatePath("/devis");
  return {
    ok: true,
    id: devis.id,
    number: devis.number,
    total_ttc: Number(devis.total_ttc ?? 0),
  };
}

/** Envoie le devis (status → envoye, trigger SMS/email automatiques). */
export async function testSendDevis(devisId: string): Promise<TestResult> {
  const r = await changeDevisStatusAction(devisId, "envoye");
  if (!r || r.ok) return { ok: true };
  return { ok: false, message: r.message ?? "Échec" };
}

/** Valide le devis (status → valide). */
export async function testValidateDevis(devisId: string): Promise<TestResult> {
  const r = await changeDevisStatusAction(devisId, "valide");
  if (!r || r.ok) return { ok: true };
  return { ok: false, message: r.message ?? "Échec" };
}

/** Marque l'acompte reçu (virement manuel). Crée le dossier + BCs auto. */
export async function testMarkAcomptePaid(
  devisId: string,
): Promise<TestResult<{ dossierId: string; bcCount: number; itemCount: number }>> {
  const r = await markAcompteRecuAction(devisId);
  if (!r || !r.ok || !r.dossierId) {
    return {
      ok: false,
      message: r && !r.ok ? r.message ?? "Échec acompte" : "Dossier non créé",
    };
  }
  const supabase = await createClient();
  const [{ count: bcCount }, { count: itemCount }] = await Promise.all([
    supabase
      .from("bons_commande")
      .select("*", { count: "exact", head: true })
      .eq("dossier_id", r.dossierId),
    supabase
      .from("dossier_items")
      .select("*", { count: "exact", head: true })
      .eq("dossier_id", r.dossierId),
  ]);

  return {
    ok: true,
    dossierId: r.dossierId,
    bcCount: bcCount ?? 0,
    itemCount: itemCount ?? 0,
  };
}

/** Crée le dossier à partir du devis (sans flip d'acompte). */
export async function testCreateDossierOnly(
  devisId: string,
): Promise<TestResult<{ dossierId: string; created: boolean }>> {
  const r = await createDossierFromDevis(devisId);
  if (!r.ok) return { ok: false, message: r.message };
  return { ok: true, dossierId: r.dossierId, created: r.created };
}

/** Liste les items d'un dossier (avec QR). */
export async function testListDossierItems(
  dossierId: string,
): Promise<TestResult<{
  items: Array<{ id: string; label: string; qr_code: string; status: string }>;
  dossier: { number: string; status: string };
}>> {
  const supabase = await createClient();
  const [{ data: items, error: e1 }, { data: dossier, error: e2 }] = await Promise.all([
    supabase
      .from("dossier_items")
      .select("id, label, qr_code, status")
      .eq("dossier_id", dossierId)
      .order("position", { ascending: true }),
    supabase
      .from("dossiers")
      .select("number, status")
      .eq("id", dossierId)
      .maybeSingle(),
  ]);
  if (e1) return { ok: false, message: e1.message };
  if (e2) return { ok: false, message: e2.message };
  if (!dossier) return { ok: false, message: "Dossier introuvable" };
  return {
    ok: true,
    items: items ?? [],
    dossier: { number: dossier.number, status: dossier.status },
  };
}

/** Réceptionne TOUS les items d'un dossier via leur QR. */
export async function testReceiveAllItems(
  dossierId: string,
): Promise<TestResult<{ received: number; skipped: number; total: number }>> {
  const supabase = await createClient();
  const { data: items, error } = await supabase
    .from("dossier_items")
    .select("qr_code, status")
    .eq("dossier_id", dossierId);
  if (error) return { ok: false, message: error.message };
  if (!items || items.length === 0) {
    return { ok: false, message: "Aucun item dans ce dossier" };
  }

  let received = 0;
  let skipped = 0;
  for (const it of items) {
    if (it.status === "recu") {
      skipped += 1;
      continue;
    }
    const r = await receiveByQrAction(it.qr_code);
    if (r.ok) received += 1;
  }
  return { ok: true, received, skipped, total: items.length };
}

/** Réceptionne un seul item via son QR (utile pour démontrer un scan). */
export async function testReceiveOneItem(
  qrCode: string,
): Promise<TestResult<{ label: string; complete: boolean }>> {
  const r = await receiveByQrAction(qrCode);
  if (!r.ok) return { ok: false, message: r.message };
  return {
    ok: true,
    label: r.item.label,
    complete: r.item.dossierComplete,
  };
}

/** Crée + planifie la pose en un coup. */
export async function testCreateAndSchedulePose(
  dossierId: string,
  scheduledAt: string,
  durationMinutes = 120,
): Promise<TestResult<{ poseId: string }>> {
  const c = await createPoseForDossierAction(dossierId, { scheduledAt });
  if (!c.ok || !c.poseId) {
    return { ok: false, message: c.ok ? "Pose sans id" : c.message };
  }
  const s = await schedulePoseAction(c.poseId, scheduledAt, { durationMinutes });
  if (!s.ok) return { ok: false, message: s.message };
  return { ok: true, poseId: c.poseId };
}

/** Marque la pose comme effectuée (déclenche SMS satisfaction). */
export async function testMarkPoseDone(
  poseId: string,
): Promise<TestResult> {
  const r = await markPoseDoneAction(poseId);
  if (!r.ok) return { ok: false, message: r.message };
  return { ok: true };
}

/** Encaisse le solde (paiement manuel kind='solde'). */
export async function testMarkSoldePaid(
  devisId: string,
): Promise<TestResult<{ amount: number }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée." };

  const { data: devis, error: e1 } = await supabase
    .from("devis")
    .select("client_id, total_ttc, acompte_ttc, channel")
    .eq("id", devisId)
    .maybeSingle();
  if (e1) return { ok: false, message: e1.message };
  if (!devis) return { ok: false, message: "Devis introuvable" };

  const total = Number(devis.total_ttc ?? 0);
  const acompte = Number(devis.acompte_ttc ?? total / 2);
  const solde = Math.max(0, total - acompte);

  const { error: e2 } = await supabase.from("payments").insert({
    devis_id: devisId,
    client_id: devis.client_id,
    kind: "solde",
    method: "virement",
    amount_ttc: solde,
    notes: "Encaissement solde — onglet Test",
    recorded_by: user.id,
  });
  if (e2) return { ok: false, message: e2.message };

  // Trigger éventuel event de solde (si configuré dans automation_rules).
  try {
    const { data: client } = await supabase
      .from("clients")
      .select("phone, email, display_name")
      .eq("id", devis.client_id)
      .maybeSingle();
    if (client) {
      await triggerEvent("solde_recu", {
        toPhone: client.phone,
        toEmail: client.email,
        toName: client.display_name,
        clientId: devis.client_id,
        vars: {
          prenom: firstNameOf(client.display_name),
          solde: String(Math.round(solde)),
        },
        criteriaContext: {
          amount: total,
          channel: devis.channel ?? undefined,
        },
        triggerSource: "test:parcours-complet",
      });
    }
  } catch (err) {
    console.warn("[trigger solde_recu]", err);
  }

  revalidatePath("/devis");
  revalidatePath(`/devis/${devisId}`);
  return { ok: true, amount: solde };
}

/** Envoie un SMS libre (utile pour tester un canal isolé). */
export async function testSendCustomSms(input: {
  phone: string;
  body: string;
}): Promise<TestResult<{ messageId?: string }>> {
  // Réécrit 06… → +336…
  let phone = input.phone.trim();
  if (/^0[1-9]\d{8}$/.test(phone)) {
    phone = "+33" + phone.slice(1);
  }
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
    return { ok: false, message: "Format téléphone : 0612345678 ou +33612345678" };
  }
  if (!input.body.trim()) return { ok: false, message: "Corps du SMS vide" };

  const { sendBrevoSms, isBrevoConfigured } = await import("@/lib/brevo/client");
  const { DEFAULT_SENDER } = await import("@/lib/db/sms-templates-shared");
  const { createServiceRoleClient } = await import("@/lib/supabase/server");

  const sender = process.env.BREVO_SMS_SENDER || DEFAULT_SENDER;
  const supabaseAdmin = createServiceRoleClient();

  const { data: logRow } = await supabaseAdmin
    .from("sms_log")
    .insert({
      template_key: null,
      to_phone: phone,
      body: input.body,
      status: "pending",
      trigger_source: "test:parcours-sms",
    })
    .select("id")
    .single();

  if (!isBrevoConfigured()) {
    if (logRow) {
      await supabaseAdmin
        .from("sms_log")
        .update({ status: "skipped", error: "BREVO_API_KEY absent" })
        .eq("id", logRow.id);
    }
    return { ok: false, message: "BREVO_API_KEY non configurée" };
  }

  const r = await sendBrevoSms({
    recipient: phone,
    content: input.body,
    sender,
    tag: "test-parcours",
  });

  if (r.ok) {
    if (logRow) {
      await supabaseAdmin
        .from("sms_log")
        .update({
          status: "sent",
          brevo_message_id: r.messageId,
          sent_at: new Date().toISOString(),
        })
        .eq("id", logRow.id);
    }
    return { ok: true, messageId: r.messageId };
  }

  if (logRow) {
    await supabaseAdmin
      .from("sms_log")
      .update({ status: "failed", error: r.message })
      .eq("id", logRow.id);
  }
  return { ok: false, message: r.message };
}

/** Envoie un email libre (HTML). */
export async function testSendCustomEmail(input: {
  toEmail: string;
  subject: string;
  htmlBody: string;
}): Promise<TestResult<{ messageId?: string }>> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.toEmail)) {
    return { ok: false, message: "Email invalide" };
  }
  if (!input.subject.trim() || !input.htmlBody.trim()) {
    return { ok: false, message: "Sujet et corps requis" };
  }

  const { sendBrevoEmail, isBrevoConfigured } = await import("@/lib/brevo/client");
  const { createServiceRoleClient } = await import("@/lib/supabase/server");

  const supabaseAdmin = createServiceRoleClient();

  const { data: logRow } = await supabaseAdmin
    .from("email_log")
    .insert({
      template_key: null,
      to_email: input.toEmail,
      subject: input.subject,
      body_html: input.htmlBody,
      status: "pending",
      trigger_source: "test:parcours-email",
    })
    .select("id")
    .single();

  if (!isBrevoConfigured()) {
    if (logRow) {
      await supabaseAdmin
        .from("email_log")
        .update({ status: "skipped", error: "BREVO_API_KEY absent" })
        .eq("id", logRow.id);
    }
    return { ok: false, message: "BREVO_API_KEY non configurée" };
  }

  const r = await sendBrevoEmail({
    to: [{ email: input.toEmail }],
    subject: input.subject,
    htmlContent: input.htmlBody,
  });

  if (r.ok) {
    if (logRow) {
      await supabaseAdmin
        .from("email_log")
        .update({
          status: "sent",
          brevo_message_id: r.messageId,
          sent_at: new Date().toISOString(),
        })
        .eq("id", logRow.id);
    }
    return { ok: true, messageId: r.messageId };
  }

  if (logRow) {
    await supabaseAdmin
      .from("email_log")
      .update({ status: "failed", error: r.message })
      .eq("id", logRow.id);
  }
  return { ok: false, message: r.message };
}
