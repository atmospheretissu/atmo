"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createDossierFromDevis } from "@/lib/db/dossiers";
import {
  changeDevisStatusAction,
  markAcompteRecuAction,
} from "@/app/(platform)/devis/actions";
import { sendDevisEmailAction } from "@/app/(platform)/devis/email-actions";
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

/** Log structuré d'une étape — affiché dans le wizard pour donner la
 *  visibilité complète sur ce qui s'est passé (succès / échec / silence). */
export type TestLog = {
  level: "success" | "info" | "warn" | "error";
  label: string;
  detail?: string;
};

export type TestResult<T = Record<string, unknown>> =
  | ({ ok: true; logs?: TestLog[] } & T)
  | { ok: false; message: string; logs?: TestLog[] };

/**
 * Destinataires forcés en mode test : SMS et emails partent TOUJOURS sur ces
 * coordonnées pendant un parcours /test, même si on réutilise un vrai client.
 */
const TEST_PHONE_E164 = "+33667699490";
const TEST_EMAIL_INTERNAL = "dmanscour70@gmail.com";

/**
 * Force temporairement les coordonnées d'un client (phone + email) sur les
 * valeurs test, exécute la callback (qui va déclencher des triggerEvent
 * lisant client.phone/email), puis restaure les valeurs originelles.
 *
 * Cas d'usage : éviter de spammer un vrai client quand un opérateur passe
 * son dossier dans le wizard /test.
 */
async function withTestRecipients<T>(
  clientId: string,
  run: () => Promise<T>,
): Promise<T> {
  const supabase = await createClient();
  const { data: original } = await supabase
    .from("clients")
    .select("phone, email")
    .eq("id", clientId)
    .maybeSingle();

  await supabase
    .from("clients")
    .update({ phone: TEST_PHONE_E164, email: TEST_EMAIL_INTERNAL })
    .eq("id", clientId);

  try {
    return await run();
  } finally {
    await supabase
      .from("clients")
      .update({
        phone: original?.phone ?? null,
        email: original?.email ?? null,
      })
      .eq("id", clientId);
  }
}

/** Récupère le client_id d'un devis (helper interne). */
async function clientIdOfDevis(devisId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("devis")
    .select("client_id")
    .eq("id", devisId)
    .maybeSingle();
  return data?.client_id ?? null;
}

/** Récupère le client_id d'un dossier (helper interne). */
async function clientIdOfDossier(dossierId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dossiers")
    .select("client_id")
    .eq("id", dossierId)
    .maybeSingle();
  return data?.client_id ?? null;
}

/** Récupère le client_id d'une pose (via son dossier). */
async function clientIdOfPose(poseId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: pose } = await supabase
    .from("poses")
    .select("dossier_id")
    .eq("id", poseId)
    .maybeSingle();
  if (!pose) return null;
  return clientIdOfDossier(pose.dossier_id);
}

/** Relit sms_log + email_log + automation_rules pour produire les logs d'un
 *  trigger qui vient juste de se déclencher (best-effort, fenêtre 30 s). */
async function collectAutomationLogs(
  eventKey: string,
  sinceMs: number,
): Promise<TestLog[]> {
  const logs: TestLog[] = [];
  const supabase = await createClient();
  const since = new Date(sinceMs).toISOString();

  const [{ data: smsRows }, { data: emailRows }, { data: rule }] = await Promise.all([
    supabase
      .from("sms_log")
      .select("status, error, brevo_message_id, to_phone")
      .gte("created_at", since)
      .eq("event_key", eventKey)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("email_log")
      .select("status, error, brevo_message_id, to_email")
      .gte("created_at", since)
      .eq("event_key", eventKey)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("automation_rules")
      .select("sms_enabled, email_enabled, sms_template_key, email_template_key")
      .eq("event_key", eventKey)
      .maybeSingle(),
  ]);

  const sms = smsRows?.[0];
  if (!rule) {
    logs.push({
      level: "warn",
      label: `SMS auto '${eventKey}' non envoyé`,
      detail: `Aucune règle dans /architecture pour cet événement. Crée la règle pour activer le SMS automatique.`,
    });
  } else if (!rule.sms_enabled) {
    logs.push({ level: "info", label: `SMS '${eventKey}' désactivé`, detail: "Désactivé dans /architecture." });
  } else if (!rule.sms_template_key) {
    logs.push({ level: "warn", label: `SMS '${eventKey}' sans template`, detail: "Template SMS non sélectionné dans /architecture." });
  } else if (!sms) {
    logs.push({ level: "warn", label: `SMS '${eventKey}' : aucun envoi détecté`, detail: "Vérifie BREVO_API_KEY." });
  } else if (sms.status === "sent") {
    logs.push({ level: "success", label: `SMS '${eventKey}' envoyé à ${sms.to_phone}`, detail: `Brevo ID : ${sms.brevo_message_id ?? "?"}` });
  } else if (sms.status === "skipped") {
    logs.push({ level: "warn", label: `SMS '${eventKey}' skippé`, detail: sms.error ?? "Probablement BREVO_API_KEY absent" });
  } else {
    logs.push({ level: "error", label: `SMS '${eventKey}' échec (${sms.status})`, detail: sms.error ?? "(pas d'erreur)" });
  }

  const em = emailRows?.[0];
  if (rule?.email_enabled && rule.email_template_key) {
    if (!em) {
      logs.push({ level: "warn", label: `Email '${eventKey}' : aucun envoi détecté` });
    } else if (em.status === "sent") {
      logs.push({ level: "success", label: `Email '${eventKey}' envoyé à ${em.to_email}`, detail: `Brevo ID : ${em.brevo_message_id ?? "?"}` });
    } else if (em.status === "skipped") {
      logs.push({ level: "warn", label: `Email '${eventKey}' skippé`, detail: em.error ?? "BREVO_API_KEY absent" });
    } else {
      logs.push({ level: "error", label: `Email '${eventKey}' échec (${em.status})`, detail: em.error ?? "(pas d'erreur)" });
    }
  }

  return logs;
}

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

  // Normalise le téléphone en E.164 (Brevo SMS exige +33...).
  // 0612345678 → +33612345678
  let phoneNormalized = input.phone.trim();
  if (/^0[1-9]\d{8}$/.test(phoneNormalized)) {
    phoneNormalized = "+33" + phoneNormalized.slice(1);
  }

  const row = clientToDbRow({
    display_name: input.display_name,
    email: input.email,
    phone: phoneNormalized,
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

/** Envoie le devis : email complet avec PDF + trigger SMS/email automation.
 *  Destinataires forcés sur les contacts test. Retourne des logs détaillés
 *  pour chaque sous-action (PDF email, Stripe link, automation SMS/email). */
export async function testSendDevis(
  devisId: string,
): Promise<TestResult<{ emailedTo?: string }>> {
  const clientId = await clientIdOfDevis(devisId);
  if (!clientId) return { ok: false, message: "Devis sans client" };

  return withTestRecipients(clientId, async () => {
    const logs: TestLog[] = [];

    // 1. Email complet avec PDF
    const mail = await sendDevisEmailAction(devisId);
    if (!mail.ok) {
      logs.push({ level: "error", label: "Email PDF devis", detail: mail.message });
      return { ok: false, message: `Email : ${mail.message}`, logs };
    }

    logs.push({
      level: "success",
      label: `Email PDF envoyé à ${mail.emailedTo}`,
      detail: `Brevo ID : ${mail.messageId || "(vide)"}`,
    });

    if (mail.stripeUrl) {
      logs.push({
        level: "success",
        label: "Bouton de paiement Stripe inclus dans l'email",
        detail: `URL générée — le client peut cliquer "Accepter et payer" depuis sa boîte mail`,
      });
    } else {
      logs.push({
        level: "warn",
        label: "Pas de bouton Stripe dans l'email",
        detail: mail.stripeError ?? "Stripe non configuré (vérifie STRIPE_SECRET_KEY + STRIPE_PUBLISHABLE_KEY sur Railway)",
      });
    }

    // 2. Trigger SMS/email automation (devis_envoye)
    const status = await changeDevisStatusAction(devisId, "envoye");
    if (status && !status.ok) {
      logs.push({ level: "error", label: "changeDevisStatusAction", detail: status.message });
    }

    // 3. Diagnostic du trigger : on relit la dernière entrée sms_log pour ce
    //    devis afin de surfacer le résultat exact (sent / failed / skipped / no rule).
    const supabase = await createClient();
    const sinceMs = Date.now() - 30_000; // 30s
    const since = new Date(sinceMs).toISOString();

    const [{ data: recentSms }, { data: recentEmail }, { data: rule }] = await Promise.all([
      supabase
        .from("sms_log")
        .select("status, error, brevo_message_id, to_phone")
        .gte("created_at", since)
        .eq("event_key", "devis_envoye")
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("email_log")
        .select("status, error, brevo_message_id, to_email")
        .gte("created_at", since)
        .eq("event_key", "devis_envoye")
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("automation_rules")
        .select("sms_enabled, email_enabled, sms_template_key, email_template_key")
        .eq("event_key", "devis_envoye")
        .maybeSingle(),
    ]);

    // Diagnostic SMS automation
    const sms = recentSms?.[0];
    if (!rule) {
      logs.push({
        level: "warn",
        label: "SMS auto devis_envoye non envoyé",
        detail: "Aucune règle d'automation pour 'devis_envoye' dans /architecture. Crée la règle (template SMS + activée) pour qu'un SMS parte automatiquement à chaque envoi de devis.",
      });
    } else if (!rule.sms_enabled) {
      logs.push({ level: "info", label: "SMS auto désactivé", detail: "Règle 'devis_envoye' présente mais SMS désactivé dans /architecture." });
    } else if (!rule.sms_template_key) {
      logs.push({ level: "warn", label: "SMS auto sans template", detail: "Règle active mais aucun template SMS sélectionné dans /architecture." });
    } else if (!sms) {
      logs.push({ level: "warn", label: "SMS auto : aucun envoi détecté", detail: "Le trigger ne s'est pas exécuté (pas de log récent dans sms_log). Vérifie BREVO_API_KEY." });
    } else if (sms.status === "sent") {
      logs.push({ level: "success", label: `SMS auto envoyé à ${sms.to_phone}`, detail: `Brevo ID : ${sms.brevo_message_id ?? "?"}` });
    } else if (sms.status === "skipped") {
      logs.push({ level: "warn", label: "SMS auto skippé", detail: sms.error ?? "(raison inconnue) — probablement BREVO_API_KEY absent" });
    } else {
      logs.push({ level: "error", label: `SMS auto échec (${sms.status})`, detail: sms.error ?? "(pas de message d'erreur)" });
    }

    // Diagnostic email automation
    const em = recentEmail?.[0];
    if (rule && rule.email_enabled && rule.email_template_key) {
      if (!em) {
        logs.push({ level: "warn", label: "Email auto : aucun envoi détecté", detail: "Le trigger ne s'est pas exécuté." });
      } else if (em.status === "sent") {
        logs.push({ level: "success", label: `Email auto envoyé à ${em.to_email}`, detail: `Brevo ID : ${em.brevo_message_id ?? "?"}` });
      } else if (em.status === "skipped") {
        logs.push({ level: "warn", label: "Email auto skippé", detail: em.error ?? "(raison inconnue)" });
      } else {
        logs.push({ level: "error", label: `Email auto échec (${em.status})`, detail: em.error ?? "(pas de message d'erreur)" });
      }
    }
    // Note : l'email PDF a déjà été envoyé en (1), donc même sans rule active
    // le client reçoit son devis. La rule est complémentaire (notif courte).

    return { ok: true, emailedTo: mail.emailedTo, logs };
  });
}

/** Valide le devis (status → valide). */
export async function testValidateDevis(devisId: string): Promise<TestResult> {
  const r = await changeDevisStatusAction(devisId, "valide");
  if (!r || r.ok) return { ok: true };
  return { ok: false, message: r.message ?? "Échec" };
}

/** Marque l'acompte reçu (virement manuel). Crée le dossier + BCs auto.
 *  Destinataires forcés sur les contacts test. */
export async function testMarkAcomptePaid(
  devisId: string,
): Promise<TestResult<{ dossierId: string; bcCount: number; itemCount: number }>> {
  const clientId = await clientIdOfDevis(devisId);
  if (!clientId) return { ok: false, message: "Devis sans client" };

  const sinceMs = Date.now();
  const r = await withTestRecipients(clientId, () =>
    markAcompteRecuAction(devisId),
  );

  const automationLogs = await collectAutomationLogs("acompte_recu", sinceMs);
  if (!r || !r.ok || !r.dossierId) {
    return {
      ok: false,
      message: r && !r.ok ? r.message ?? "Échec acompte" : "Dossier non créé",
      logs: automationLogs,
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

  const logs: TestLog[] = [
    {
      level: "success",
      label: `Paiement enregistré (kind=acompte, method=virement)`,
      detail: `Dossier ${r.dossierId.slice(0, 8)} créé · ${itemCount ?? 0} items · ${bcCount ?? 0} BC fournisseurs auto-générés`,
    },
    ...automationLogs,
  ];

  return {
    ok: true,
    dossierId: r.dossierId,
    bcCount: bcCount ?? 0,
    itemCount: itemCount ?? 0,
    logs,
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

/** Réceptionne TOUS les items d'un dossier via leur QR.
 *  Destinataires forcés sur les contacts test (le dernier scan déclenche le
 *  SMS "tous_recus" → arrive sur le téléphone test). */
export async function testReceiveAllItems(
  dossierId: string,
): Promise<TestResult<{ received: number; skipped: number; total: number }>> {
  const clientId = await clientIdOfDossier(dossierId);
  if (!clientId) return { ok: false, message: "Dossier sans client" };

  const sinceMs = Date.now();
  const result = await withTestRecipients(clientId, async () => {
    const supabase = await createClient();
    const { data: items, error } = await supabase
      .from("dossier_items")
      .select("qr_code, status")
      .eq("dossier_id", dossierId);
    if (error) return { ok: false as const, message: error.message };
    if (!items || items.length === 0) {
      return { ok: false as const, message: "Aucun item dans ce dossier" };
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
    return { ok: true as const, received, skipped, total: items.length };
  });

  if (!result.ok) return { ok: false, message: result.message };

  // tous_recus se déclenche au dernier item — collecte les logs auto.
  const automationLogs = await collectAutomationLogs("tous_recus", sinceMs);
  const logs: TestLog[] = [
    {
      level: "success",
      label: `${result.received} colis scannés (${result.skipped} déjà reçus)`,
      detail: `Total items : ${result.total}`,
    },
    ...automationLogs,
  ];
  return { ...result, logs };
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

/** Marque la pose comme effectuée (déclenche SMS satisfaction).
 *  Destinataires forcés sur les contacts test. */
export async function testMarkPoseDone(
  poseId: string,
): Promise<TestResult> {
  const clientId = await clientIdOfPose(poseId);
  if (!clientId) return { ok: false, message: "Pose sans client" };

  const sinceMs = Date.now();
  const r = await withTestRecipients(clientId, () =>
    markPoseDoneAction(poseId),
  );
  const automationLogs = await collectAutomationLogs("pose_effectuee", sinceMs);
  if (!r.ok) return { ok: false, message: r.message, logs: automationLogs };

  return {
    ok: true,
    logs: [
      { level: "success", label: "Pose marquée effectuée" },
      ...automationLogs,
    ],
  };
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
  // Destinataires forcés sur les contacts test.
  try {
    const { data: client } = await supabase
      .from("clients")
      .select("display_name")
      .eq("id", devis.client_id)
      .maybeSingle();
    if (client) {
      await triggerEvent("solde_recu", {
        toPhone: TEST_PHONE_E164,
        toEmail: TEST_EMAIL_INTERNAL,
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

  const automationLogs = await collectAutomationLogs("solde_recu", Date.now() - 5_000);
  return {
    ok: true,
    amount: solde,
    logs: [
      { level: "success", label: `Solde encaissé : ${Math.round(solde)}€` },
      ...automationLogs,
    ],
  };
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

/** Historique des SMS + emails (loggés en base) — affiché en bas du wizard
 *  pour donner la traçabilité complète des envois récents. */
export type TestHistoryEntry = {
  id: string;
  channel: "sms" | "email";
  createdAt: string;
  to: string;
  status: string;
  triggerSource: string | null;
  eventKey: string | null;
  templateKey: string | null;
  brevoMessageId: string | null;
  error: string | null;
  preview: string;
};

export async function getTestHistory(
  limit = 30,
): Promise<TestHistoryEntry[]> {
  const supabase = await createClient();
  const [{ data: sms }, { data: emails }] = await Promise.all([
    supabase
      .from("sms_log")
      .select(
        "id, created_at, to_phone, body, status, trigger_source, event_key, template_key, brevo_message_id, error",
      )
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("email_log")
      .select(
        "id, created_at, to_email, subject, status, trigger_source, event_key, template_key, brevo_message_id, error",
      )
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const all: TestHistoryEntry[] = [
    ...(sms ?? []).map(
      (s): TestHistoryEntry => ({
        id: `sms:${s.id}`,
        channel: "sms",
        createdAt: s.created_at,
        to: s.to_phone ?? "—",
        status: s.status ?? "?",
        triggerSource: s.trigger_source ?? null,
        eventKey: s.event_key ?? null,
        templateKey: s.template_key ?? null,
        brevoMessageId: s.brevo_message_id ?? null,
        error: s.error ?? null,
        preview: (s.body ?? "").slice(0, 100),
      }),
    ),
    ...(emails ?? []).map(
      (e): TestHistoryEntry => ({
        id: `email:${e.id}`,
        channel: "email",
        createdAt: e.created_at,
        to: e.to_email ?? "—",
        status: e.status ?? "?",
        triggerSource: e.trigger_source ?? null,
        eventKey: e.event_key ?? null,
        templateKey: e.template_key ?? null,
        brevoMessageId: e.brevo_message_id ?? null,
        error: e.error ?? null,
        preview: e.subject ?? "",
      }),
    ),
  ];

  all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return all.slice(0, limit);
}


