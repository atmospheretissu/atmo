import { createClient } from "@/lib/supabase/server";

export type FeedCategory =
  | "lead"
  | "devis"
  | "payment"
  | "reception"
  | "pose"
  | "bc"
  | "caisse"
  | "sms"
  | "email";

export type FeedEventKind =
  | "lead_lm_received"
  | "devis_created"
  | "devis_sent"
  | "devis_viewed_by_client"
  | "devis_validated"
  | "acompte_received"
  | "dossier_created"
  | "item_received"
  | "pose_scheduled"
  | "pose_done"
  | "bc_created"
  | "bc_sent"
  | "bc_received"
  | "caisse_ticket"
  | "sms_sent"
  | "sms_failed"
  | "sms_skipped"
  | "email_sent"
  | "email_failed";

export type FeedSeverity = "ok" | "info" | "warning" | "error";

export type FeedEvent = {
  id: string;
  kind: FeedEventKind;
  category: FeedCategory;
  label: string;
  description: string | null;
  occurredAt: string;
  severity: FeedSeverity;
  link: string | null;
  /** Champs libres pour la vue détail. */
  details: Record<string, unknown>;
};

type FeedOptions = {
  limit?: number;
  categories?: FeedCategory[];
};

/**
 * Agrège les événements de toutes les tables avec timestamps en un feed unifié.
 *
 * Implémentation : N queries parallèles, chacune retourne ses N derniers
 * événements, on merge et trie côté app. Suffisant pour beta solo (< 10k rows).
 * Pour scaler à 100k+, créer une table `activity_log` dédiée.
 */
export async function listActivityFeed(opts: FeedOptions = {}): Promise<FeedEvent[]> {
  const limit = opts.limit ?? 100;
  const perTable = Math.max(20, Math.floor(limit / 3));
  const supabase = await createClient();

  const wantsCategory = (c: FeedCategory) =>
    !opts.categories || opts.categories.length === 0 || opts.categories.includes(c);

  const queries: PromiseLike<FeedEvent[]>[] = [];

  // ---- LEADS LM ----
  if (wantsCategory("lead")) {
    queries.push(
      supabase
        .from("lm_leads")
        .select("id, number, region, product_summary, status, amount, created_at, client_id")
        .order("created_at", { ascending: false })
        .limit(perTable)
        .then(({ data }) =>
          (data ?? []).map(
            (l): FeedEvent => ({
              id: `lead:${l.id}`,
              kind: "lead_lm_received",
              category: "lead",
              label: `Atmolead reçu — ${l.number}`,
              description: `${l.region} · ${l.product_summary}${l.amount ? ` · ~${l.amount}€` : ""}`,
              occurredAt: l.created_at,
              severity: "info",
              link: `/leads-lm`,
              details: { number: l.number, status: l.status, amount: l.amount, client_id: l.client_id },
            }),
          ),
        ),
    );
  }

  // ---- DEVIS (created + sent) ----
  if (wantsCategory("devis")) {
    queries.push(
      supabase
        .from("devis")
        .select("id, number, status, total_ttc, created_at, sent_at, client_viewed_at, client_id, product_summary, channel")
        .order("created_at", { ascending: false })
        .limit(perTable)
        .then(({ data }) => {
          const events: FeedEvent[] = [];
          for (const d of data ?? []) {
            events.push({
              id: `devis:${d.id}:created`,
              kind: "devis_created",
              category: "devis",
              label: `Devis créé — ${d.number}`,
              description: `${d.product_summary} · ${Math.round(Number(d.total_ttc ?? 0))}€ TTC · ${d.channel}`,
              occurredAt: d.created_at,
              severity: "info",
              link: `/devis/${d.id}`,
              details: { number: d.number, total_ttc: d.total_ttc, channel: d.channel, status: d.status, client_id: d.client_id },
            });
            if (d.sent_at) {
              events.push({
                id: `devis:${d.id}:sent`,
                kind: "devis_sent",
                category: "devis",
                label: `Devis envoyé — ${d.number}`,
                description: `${d.product_summary} · ${Math.round(Number(d.total_ttc ?? 0))}€ TTC`,
                occurredAt: d.sent_at,
                severity: "ok",
                link: `/devis/${d.id}`,
                details: { number: d.number, total_ttc: d.total_ttc },
              });
            }
            if ((d as { client_viewed_at?: string | null }).client_viewed_at) {
              events.push({
                id: `devis:${d.id}:viewed`,
                kind: "devis_viewed_by_client",
                category: "devis",
                label: `Devis vu par le client — ${d.number}`,
                description: `${d.product_summary} · ${Math.round(Number(d.total_ttc ?? 0))}€ TTC`,
                occurredAt: (d as { client_viewed_at: string }).client_viewed_at,
                severity: "info",
                link: `/devis/${d.id}`,
                details: { number: d.number, total_ttc: d.total_ttc },
              });
            }
          }
          return events;
        }),
    );
  }

  // ---- PAYMENTS (acomptes + soldes) ----
  if (wantsCategory("payment")) {
    queries.push(
      supabase
        .from("payments")
        .select("id, devis_id, client_id, kind, method, amount_ttc, paid_at, stripe_payment_intent_id")
        .order("paid_at", { ascending: false })
        .limit(perTable)
        .then(({ data }) =>
          (data ?? []).map(
            (p): FeedEvent => ({
              id: `payment:${p.id}`,
              kind: "acompte_received",
              category: "payment",
              label: `${p.kind === "acompte" ? "Acompte" : "Solde"} encaissé — ${Math.round(Number(p.amount_ttc ?? 0))}€`,
              description: `Mode : ${p.method}${p.stripe_payment_intent_id ? " (Stripe)" : ""}`,
              occurredAt: p.paid_at,
              severity: "ok",
              link: p.devis_id ? `/devis/${p.devis_id}` : null,
              details: {
                kind: p.kind,
                method: p.method,
                amount: p.amount_ttc,
                stripe_id: p.stripe_payment_intent_id,
                client_id: p.client_id,
              },
            }),
          ),
        ),
    );
  }

  // ---- DOSSIER ITEMS (réception via QR) ----
  if (wantsCategory("reception")) {
    queries.push(
      supabase
        .from("dossier_items")
        .select("id, label, ref, dossier_id, received_at, received_by, qr_code")
        .not("received_at", "is", null)
        .order("received_at", { ascending: false })
        .limit(perTable)
        .then(({ data }) =>
          (data ?? []).map(
            (i): FeedEvent => ({
              id: `recep:${i.id}`,
              kind: "item_received",
              category: "reception",
              label: `Colis reçu — ${i.label}`,
              description: `Réf ${i.ref ?? "—"} · QR ${i.qr_code}`,
              occurredAt: i.received_at!,
              severity: "ok",
              link: i.dossier_id ? `/confections/${i.dossier_id}` : null,
              details: { qr_code: i.qr_code, ref: i.ref, dossier_id: i.dossier_id, received_by: i.received_by },
            }),
          ),
        ),
    );
  }

  // ---- POSES (created → planifiée, completed_at → effectuée) ----
  if (wantsCategory("pose")) {
    queries.push(
      supabase
        .from("poses")
        .select("id, status, scheduled_at, completed_at, created_at, dossier_id, poseur_id")
        .order("created_at", { ascending: false })
        .limit(perTable)
        .then(({ data }) => {
          const events: FeedEvent[] = [];
          for (const p of data ?? []) {
            events.push({
              id: `pose:${p.id}:created`,
              kind: "pose_scheduled",
              category: "pose",
              label: p.scheduled_at ? `Pose planifiée — ${new Date(p.scheduled_at).toLocaleDateString("fr-FR")}` : "Pose créée (à planifier)",
              description: p.poseur_id ? `Poseur assigné` : "Poseur à assigner",
              occurredAt: p.created_at,
              severity: "info",
              link: `/poses/${p.id}`,
              details: { scheduled_at: p.scheduled_at, status: p.status, dossier_id: p.dossier_id },
            });
            if (p.completed_at) {
              events.push({
                id: `pose:${p.id}:done`,
                kind: "pose_done",
                category: "pose",
                label: "Pose effectuée",
                description: "Marquée comme posée",
                occurredAt: p.completed_at,
                severity: "ok",
                link: `/poses/${p.id}`,
                details: { dossier_id: p.dossier_id },
              });
            }
          }
          return events;
        }),
    );
  }

  // ---- BC ----
  if (wantsCategory("bc")) {
    queries.push(
      supabase
        .from("bons_commande")
        .select("id, number, status, amount_ht, created_at, sent_at, received_at, supplier_id")
        .order("created_at", { ascending: false })
        .limit(perTable)
        .then(({ data }) => {
          const events: FeedEvent[] = [];
          for (const bc of data ?? []) {
            events.push({
              id: `bc:${bc.id}:created`,
              kind: "bc_created",
              category: "bc",
              label: `BC créé — ${bc.number}`,
              description: `${Math.round(Number(bc.amount_ht ?? 0))}€ HT · statut ${bc.status}`,
              occurredAt: bc.created_at,
              severity: "info",
              link: `/commandes/${bc.id}`,
              details: { number: bc.number, status: bc.status, supplier_id: bc.supplier_id },
            });
            if (bc.sent_at) {
              events.push({
                id: `bc:${bc.id}:sent`,
                kind: "bc_sent",
                category: "bc",
                label: `BC envoyé fournisseur — ${bc.number}`,
                description: null,
                occurredAt: bc.sent_at,
                severity: "ok",
                link: `/commandes/${bc.id}`,
                details: { number: bc.number },
              });
            }
            if (bc.received_at) {
              events.push({
                id: `bc:${bc.id}:received`,
                kind: "bc_received",
                category: "bc",
                label: `BC reçu — ${bc.number}`,
                description: null,
                occurredAt: bc.received_at,
                severity: "ok",
                link: `/commandes/${bc.id}`,
                details: { number: bc.number },
              });
            }
          }
          return events;
        }),
    );
  }

  // ---- CAISSE ----
  if (wantsCategory("caisse")) {
    queries.push(
      supabase
        .from("caisse_tickets")
        .select("id, number, total_ttc, payment_method, created_at, client_id")
        .order("created_at", { ascending: false })
        .limit(perTable)
        .then(({ data }) =>
          (data ?? []).map(
            (t): FeedEvent => ({
              id: `caisse:${t.id}`,
              kind: "caisse_ticket",
              category: "caisse",
              label: `Ticket caisse — ${t.number}`,
              description: `${Math.round(Number(t.total_ttc ?? 0))}€ TTC · ${t.payment_method}`,
              occurredAt: t.created_at,
              severity: "ok",
              link: "/caisse",
              details: { number: t.number, method: t.payment_method, amount: t.total_ttc, client_id: t.client_id },
            }),
          ),
        ),
    );
  }

  // ---- SMS LOG ----
  if (wantsCategory("sms")) {
    queries.push(
      supabase
        .from("sms_log")
        .select("id, template_key, client_id, to_phone, body, brevo_message_id, status, error, sent_at, created_at, event_key, trigger_source")
        .order("created_at", { ascending: false })
        .limit(perTable)
        .then(({ data }) =>
          (data ?? []).map((s): FeedEvent => {
            const failed = s.status === "failed" || s.status === "bounced";
            const skippedDup = s.status === "skipped_duplicate";
            const skippedCfg = s.status === "skipped";
            const sourceLabel = s.trigger_source ? humanizeSource(s.trigger_source) : null;
            const descParts = [
              s.template_key ? `Template: ${s.template_key}` : "Message libre",
              s.event_key ? `Événement: ${s.event_key}` : null,
              sourceLabel ? `Source: ${sourceLabel}` : null,
            ];
            if (skippedDup && s.error) descParts.push(s.error);
            const desc = descParts.filter(Boolean).join(" · ");
            const kind: FeedEventKind = failed
              ? "sms_failed"
              : skippedDup || skippedCfg
                ? "sms_skipped"
                : "sms_sent";
            const label = failed
              ? `SMS échec — ${s.to_phone}`
              : skippedDup
                ? `SMS ignoré (déjà envoyé) — ${s.to_phone}`
                : skippedCfg
                  ? `SMS ignoré (Brevo non configuré) — ${s.to_phone}`
                  : `SMS envoyé — ${s.to_phone}`;
            return {
              id: `sms:${s.id}`,
              kind,
              category: "sms",
              label,
              description: desc,
              occurredAt: s.created_at,
              severity: failed ? "error" : skippedDup || skippedCfg ? "warning" : "ok",
              link: null,
              details: {
                body: s.body,
                status: s.status,
                template_key: s.template_key,
                event_key: s.event_key,
                trigger_source: s.trigger_source,
                trigger_source_human: sourceLabel,
                client_id: s.client_id,
                brevo_message_id: s.brevo_message_id,
                error: s.error,
                sent_at: s.sent_at,
              },
            };
          }),
        ),
    );
  }

  // ---- EMAIL LOG ----
  if (wantsCategory("email")) {
    queries.push(
      supabase
        .from("email_log")
        .select("id, template_key, client_id, to_email, subject, body_html, brevo_message_id, status, error, sent_at, created_at, event_key, trigger_source")
        .order("created_at", { ascending: false })
        .limit(perTable)
        .then(({ data }) =>
          (data ?? []).map((e): FeedEvent => {
            const failed = e.status === "failed" || e.status === "bounced";
            const sourceLabel = e.trigger_source ? humanizeSource(e.trigger_source) : null;
            const desc = [
              e.subject,
              e.event_key ? `Événement: ${e.event_key}` : null,
              sourceLabel ? `Source: ${sourceLabel}` : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return {
              id: `email:${e.id}`,
              kind: failed ? "email_failed" : "email_sent",
              category: "email",
              label: failed
                ? `Email échec — ${e.to_email}`
                : e.status === "skipped"
                  ? `Email skip (no Brevo) — ${e.to_email}`
                  : `Email envoyé — ${e.to_email}`,
              description: desc,
              occurredAt: e.created_at,
              severity: failed ? "error" : e.status === "skipped" ? "warning" : "ok",
              link: null,
              details: {
                subject: e.subject,
                body_html: e.body_html,
                status: e.status,
                template_key: e.template_key,
                event_key: e.event_key,
                trigger_source: e.trigger_source,
                trigger_source_human: sourceLabel,
                client_id: e.client_id,
                brevo_message_id: e.brevo_message_id,
                error: e.error,
                sent_at: e.sent_at,
              },
            };
          }),
        ),
    );
  }

  const results = await Promise.all(queries);
  const merged = results.flat();
  merged.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  return merged.slice(0, limit);
}

/**
 * Convertit un trigger_source technique en label humain.
 * "webhook:lm-lead-created" → "Webhook Atmolead"
 * "manual:leads-lm-button"  → "Clic manuel sur /leads-lm"
 */
function humanizeSource(source: string): string {
  const baseSrc = source.split("+")[0];
  const map: Record<string, string> = {
    "webhook:lm-lead-created": "Webhook Atmolead",
    "manual:leads-lm-button": "Clic manuel · Leads LM",
    "manual:leads-lm-button-force": "Clic manuel forcé · Leads LM",
    "cron:process-pending": "Poller automatique",
    "action:change-devis-status": "Devis envoyé manuellement",
    "action:mark-acompte-recu": "Acompte marqué reçu",
    "action:receive-by-qr": "Scan QR réception",
    "action:mark-pose-done": "Pose marquée effectuée",
    "stripe:checkout-completed": "Webhook Stripe (paiement)",
    "test:sms-tab": "Test depuis /parametres",
    "test:email-tab": "Test depuis /parametres",
    "test:templates-sms-button": "Bouton 'Tester l'envoi' (Templates SMS)",
  };
  if (baseSrc in map) {
    const human = map[baseSrc];
    if (source.includes("+alert:")) return `${human} → Alerte interne`;
    return human;
  }
  return source;
}
