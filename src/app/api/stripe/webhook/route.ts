import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createDossierFromDevis } from "@/lib/db/dossiers";
import { triggerEvent, firstNameOf } from "@/lib/brevo/trigger-event";

/**
 * Webhook Stripe — point d'entrée des notifications de paiement.
 *
 * Évènements traités :
 *   - checkout.session.completed → acompte reçu, on marque le devis et crée le dossier
 *
 * Sécurité : signature vérifiée via STRIPE_WEBHOOK_SECRET. Aucune action effectuée
 * si la signature est invalide ou manquante.
 *
 * IMPORTANT : Ce handler utilise le service_role Supabase pour bypasser RLS
 * (les webhooks ne sont pas authentifiés en tant qu'utilisateur).
 */
export async function POST(request: NextRequest) {
  const t0 = Date.now();
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  // Log helper — écrit dans stripe_webhook_log même en cas d'erreur précoce.
  // Best-effort : si le log lui-même échoue, on ne bloque pas la réponse.
  const logCall = async (patch: {
    eventId?: string | null;
    eventType?: string | null;
    signatureValid?: boolean;
    devisId?: string | null;
    paymentKind?: string | null;
    sessionId?: string | null;
    paymentIntentId?: string | null;
    amountTotal?: number | null;
    responseStatus: number;
    responseBody?: string | null;
    errorMessage?: string | null;
  }) => {
    try {
      const sb = createServiceRoleClient();
      // Cast : la table stripe_webhook_log est trop récente pour être
      // dans le typegen Supabase. Insert direct via cast unknown.
      await (
        sb as unknown as {
          from: (t: string) => {
            insert: (v: Record<string, unknown>) => Promise<{
              error: { message?: string } | null;
            }>;
          };
        }
      )
        .from("stripe_webhook_log")
        .insert({
          event_id: patch.eventId ?? null,
          event_type: patch.eventType ?? null,
          signature_valid: patch.signatureValid ?? null,
          devis_id: patch.devisId ?? null,
          payment_kind: patch.paymentKind ?? null,
          session_id: patch.sessionId ?? null,
          payment_intent_id: patch.paymentIntentId ?? null,
          amount_total: patch.amountTotal ?? null,
          response_status: patch.responseStatus,
          response_body: patch.responseBody?.slice(0, 500) ?? null,
          error_message: patch.errorMessage?.slice(0, 500) ?? null,
          processing_ms: Date.now() - t0,
        });
    } catch (e) {
      console.warn("[stripe webhook log fail]", e);
    }
  };

  if (!sig || !secret) {
    const missing = !sig
      ? "missing stripe-signature header"
      : "missing STRIPE_WEBHOOK_SECRET env";
    await logCall({
      signatureValid: false,
      responseStatus: 400,
      errorMessage: `Webhook non configuré : ${missing}`,
    });
    return NextResponse.json(
      { error: `Webhook non configuré : ${missing}` },
      { status: 400 },
    );
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "?";
    // Diagnostic : affiche le fingerprint du secret utilisé + la signature reçue
    // pour comparer avec ce que Stripe attend. Utile pour lever le doute
    // "j'ai bien mis le bon secret" vs réalité côté conteneur Railway.
    const secretFingerprint = `${secret.slice(0, 10)}…${secret.slice(-4)} (len ${secret.length})`;
    const sigPreview = sig.slice(0, 80);
    const bodyLen = body.length;
    const debug = `secret=${secretFingerprint} · sig=${sigPreview}… · bodyLen=${bodyLen}`;
    await logCall({
      signatureValid: false,
      responseStatus: 400,
      errorMessage: `Signature invalide : ${msg} — ${debug}`,
    });
    return NextResponse.json(
      { error: `Signature invalide: ${msg}` },
      { status: 400 },
    );
  }

  // Service role — bypass RLS pour les writes système
  const supabase = createServiceRoleClient();

  // ── IDEMPOTENCE (critique) ─────────────────────────────────────────
  // Stripe garantit une livraison "at-least-once" — le même event.id
  // peut arriver plusieurs fois (retry sur timeout, redélivrage manuel
  // depuis le dashboard, etc.). On vérifie qu'on ne l'a pas déjà
  // traité avec succès pour éviter :
  //   - Un 2e SMS/email "acompte reçu" au client
  //   - Un 2e push Pennylane
  //   - Une 2e facture PDF renvoyée
  // La contrainte unique DB sur payments.stripe_payment_intent_id
  // ne protégeait que la table payments, pas les side-effects.
  const { data: prior } = await (
    supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: string) => {
            lt: (c: string, v: number) => {
              limit: (n: number) => {
                maybeSingle: () => Promise<{
                  data: { id: string } | null;
                }>;
              };
            };
          };
        };
      };
    }
  )
    .from("stripe_webhook_log")
    .select("id")
    .eq("event_id", event.id)
    .lt("response_status", 400)
    .limit(1)
    .maybeSingle();

  if (prior) {
    await logCall({
      eventId: event.id,
      eventType: event.type,
      signatureValid: true,
      responseStatus: 200,
      responseBody: `duplicate event — déjà traité (log précédent ${prior.id}), side-effects skippés`,
    });
    return NextResponse.json({
      received: true,
      note: "duplicate event, already processed",
    });
  }

  // Événements ignorés : on log + 200 pour éviter les retries Stripe.
  if (event.type !== "checkout.session.completed") {
    await logCall({
      eventId: event.id,
      eventType: event.type,
      signatureValid: true,
      responseStatus: 200,
      responseBody: `ignored (type ${event.type})`,
    });
    return NextResponse.json({ received: true, note: `ignored ${event.type}` });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const devisId = session.metadata?.devis_id;
  const paymentKind = (session.metadata?.kind ?? "acompte") as
    | "acompte"
    | "solde";
  const sessionId = session.id;
  const piIdEarly =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;
  const amountEuros =
    typeof session.amount_total === "number"
      ? session.amount_total / 100
      : null;

  if (!devisId) {
    await logCall({
      eventId: event.id,
      eventType: event.type,
      signatureValid: true,
      sessionId,
      paymentIntentId: piIdEarly,
      amountTotal: amountEuros,
      responseStatus: 200,
      responseBody: "no devis_id in metadata",
      errorMessage:
        "session.metadata.devis_id absent — la Checkout Session a été créée sans passer par nos actions Atmo (créé côté Dashboard Stripe ?)",
    });
    return NextResponse.json({ received: true, note: "no devis_id metadata" });
  }

  // Lit le devis pour calculer les montants et trigger les events
  const { data: devis } = await supabase
    .from("devis")
    .select("client_id, acompte_ttc, total_ttc, channel, number")
    .eq("id", devisId)
    .maybeSingle();
  if (!devis) {
    await logCall({
      eventId: event.id,
      eventType: event.type,
      signatureValid: true,
      devisId,
      paymentKind,
      sessionId,
      paymentIntentId: piIdEarly,
      amountTotal: amountEuros,
      responseStatus: 404,
      errorMessage: `Devis ${devisId} introuvable en base`,
    });
    return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  }

  // ─── Bloc rebranché : la valeur du bloc historique conservée dans un
  //     wrapper try/catch pour logger le résultat final ───
  try {

    const totalTtc = Number(devis.total_ttc ?? 0);
    const acompteTtc = Number(devis.acompte_ttc ?? totalTtc * 0.5);
    const soldeTtc = Math.max(0, totalTtc - acompteTtc);
    const piId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    if (paymentKind === "solde") {
      // ── SOLDE : encaissement final
      const amount = Number(session.amount_total ?? 0) / 100 || soldeTtc;

      // 1. Insert payment kind=solde — TOUS les side-effects observables
      //    (SMS, email, facture, Pennylane) sont gatés derrière la réussite
      //    de cet insert, pour éviter les doublons en cas de retry Stripe.
      const { data: solPay, error: solErr } = await (
        supabase as unknown as {
          from: (t: string) => {
            insert: (v: unknown) => {
              select: (s: string) => {
                single: () => Promise<{
                  data: { id: string } | null;
                  error: { message?: string; code?: string } | null;
                }>;
              };
            };
          };
        }
      )
        .from("payments")
        .insert({
          devis_id: devisId,
          client_id: devis.client_id,
          kind: "solde",
          method: "stripe",
          amount_ttc: amount,
          stripe_payment_intent_id: piId,
          notes: `Solde Stripe — ${session.id}`,
        })
        .select("id")
        .single();

      // Si l'insert échoue : distinguer un vrai doublon (unique_violation
      // Postgres 23505 sur stripe_payment_intent_id) d'une vraie erreur.
      // Doublon → 200 (idempotent, on skip TOUT le reste). Vraie erreur
      // → throw → 500 → Stripe retry.
      if (!solPay) {
        const isDuplicate = solErr?.code === "23505";
        if (isDuplicate) {
          await logCall({
            eventId: event.id,
            eventType: event.type,
            signatureValid: true,
            devisId,
            paymentKind: "solde",
            sessionId,
            paymentIntentId: piId,
            amountTotal: amount,
            responseStatus: 200,
            responseBody: `duplicate payment_intent — solde déjà enregistré, side-effects skippés`,
          });
          return NextResponse.json({
            received: true,
            devisId,
            paymentKind: "solde",
            note: "duplicate payment, already recorded",
          });
        }
        throw new Error(
          `Insert payment (solde) échoué : ${solErr?.message ?? "?"}`,
        );
      }

      // À partir d'ici, le payment est nouveau et inséré → OK pour
      // exécuter tous les side-effects observables.
      const { pushInvoiceForDevisPayment } = await import(
        "@/lib/pennylane/push"
      );
      pushInvoiceForDevisPayment({
        devisId,
        paymentId: solPay.id,
        kind: "solde",
        amountTtc: amount,
        paidAt: new Date().toISOString(),
        paymentMethod: "stripe",
      }).catch((e) => console.warn("[pennylane push stripe solde]", e));

      // 2. Update dossier.solde_paid (guard eq false pour ne pas écraser
      //    solde_paid_at en cas d'un chemin exceptionnel qui repasserait ici)
      const { data: dossier } = await supabase
        .from("dossiers")
        .select("id")
        .eq("devis_id", devisId)
        .maybeSingle();
      if (dossier?.id) {
        await supabase
          .from("dossiers")
          .update({ solde_paid: true, solde_paid_at: new Date().toISOString() })
          .eq("id", dossier.id)
          .eq("solde_paid", false);
      }

      // 2b. Advance devis.status → solde_recu (progression linéaire)
      await (
        supabase as unknown as {
          from: (t: string) => {
            update: (v: unknown) => {
              eq: (c: string, v: string) => Promise<{ error: unknown }>;
            };
          };
        }
      )
        .from("devis")
        .update({ status: "solde_recu" })
        .eq("id", devisId);

      // 3. Trigger event interne (SMS/email "solde encaissé"). Gaté par
      //    la réussite de l'insert payment ci-dessus.
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
              solde: String(Math.round(amount)),
              numero_devis: devis.number,
            },
            criteriaContext: { amount: totalTtc, channel: devis.channel ?? undefined },
            triggerSource: "stripe:checkout-completed",
          });
        }
      } catch (err) {
        console.warn("[trigger stripe → solde_recu]", err);
      }

      // F9 : facture solde par email — best-effort (n'échoue jamais le webhook)
      try {
        const { sendFactureEmailAction } = await import(
          "@/app/(platform)/devis/facture-email-actions"
        );
        void sendFactureEmailAction(devisId, "solde", {
          paidAt: new Date().toISOString(),
          paidMethod: "stripe",
        }).catch((e) => console.warn("[stripe→auto facture solde]", e));
      } catch (err) {
        console.warn("[stripe→auto facture solde import]", err);
      }

      await logCall({
        eventId: event.id,
        eventType: event.type,
        signatureValid: true,
        devisId,
        paymentKind: "solde",
        sessionId,
        paymentIntentId: piId,
        amountTotal: amount,
        responseStatus: 200,
        responseBody: `solde marqué (${amount}€), dossier updated, facture envoyée`,
      });
      return NextResponse.json({ received: true, devisId, paymentKind: "solde" });
    }

    // ── ACOMPTE : flow original
    // 1. Insert payment record EN PREMIER — même logique que solde :
    //    tous les side-effects (SMS, email, Pennylane, facture) sont
    //    gatés derrière la réussite de cet insert pour éviter les
    //    doublons en cas de retry Stripe.
    const { data: acoPay, error: acoErr } = await (
      supabase as unknown as {
        from: (t: string) => {
          insert: (v: unknown) => {
            select: (s: string) => {
              single: () => Promise<{
                data: { id: string } | null;
                error: { message?: string; code?: string } | null;
              }>;
            };
          };
        };
      }
    )
      .from("payments")
      .insert({
        devis_id: devisId,
        client_id: devis.client_id,
        kind: "acompte",
        method: "stripe",
        amount_ttc: acompteTtc,
        stripe_payment_intent_id: piId,
        notes: `Acompte Stripe — ${session.id}`,
      })
      .select("id")
      .single();

    if (!acoPay) {
      const isDuplicate = acoErr?.code === "23505";
      if (isDuplicate) {
        await logCall({
          eventId: event.id,
          eventType: event.type,
          signatureValid: true,
          devisId,
          paymentKind: "acompte",
          sessionId,
          paymentIntentId: piId,
          amountTotal: acompteTtc,
          responseStatus: 200,
          responseBody: `duplicate payment_intent — acompte déjà enregistré, side-effects skippés`,
        });
        return NextResponse.json({
          received: true,
          devisId,
          paymentKind: "acompte",
          note: "duplicate payment, already recorded",
        });
      }
      throw new Error(
        `Insert payment (acompte) échoué : ${acoErr?.message ?? "?"}`,
      );
    }

    // Payment nouveau et inséré → OK pour tout ce qui suit.

    // 2. Update devis status → acompte_recu
    await supabase
      .from("devis")
      .update({ status: "acompte_recu" })
      .eq("id", devisId);

    // 3. Push Pennylane (best-effort, ne fait pas échouer le webhook)
    const { pushInvoiceForDevisPayment } = await import(
      "@/lib/pennylane/push"
    );
    pushInvoiceForDevisPayment({
      devisId,
      paymentId: acoPay.id,
      kind: "acompte",
      amountTtc: acompteTtc,
      paidAt: new Date().toISOString(),
      paymentMethod: "stripe",
    }).catch((e) => console.warn("[pennylane push stripe acompte]", e));

    // 4. Trigger event "acompte_recu" (SMS et/ou email selon règle)
    try {
      const { data: client } = await supabase
        .from("clients")
        .select("phone, email, display_name")
        .eq("id", devis.client_id)
        .maybeSingle();
      if (client) {
        await triggerEvent("acompte_recu", {
          toPhone: client.phone,
          toEmail: client.email,
          toName: client.display_name,
          clientId: devis.client_id,
          vars: {
            prenom: firstNameOf(client.display_name),
            acompte: String(Math.round(acompteTtc)),
          },
          triggerSource: "stripe:checkout-completed",
        });
      }
    } catch (err) {
      console.warn("[trigger stripe → acompte_recu]", err);
    }

    // 5. Facture d'acompte par email — best-effort
    try {
      const { sendFactureEmailAction } = await import(
        "@/app/(platform)/devis/facture-email-actions"
      );
      void sendFactureEmailAction(devisId, "acompte", {
        paidAt: new Date().toISOString(),
        paidMethod: "stripe",
      }).catch((e) => console.warn("[stripe→auto facture acompte]", e));
    } catch (err) {
      console.warn("[stripe→auto facture acompte import]", err);
    }

    // 6. Auto-création (ou récupération) du dossier — idempotent.
    //    On passe le service-role client car le webhook n'a pas de session user
    //    et les RLS dossiers/items/bons_commande exigent un rôle 'staff'.
    const dossierResult = await createDossierFromDevis(devisId, supabase);
    if (!dossierResult.ok) {
      console.error("Webhook: failed to create dossier", dossierResult.message);
    } else {
      await supabase
        .from("dossiers")
        .update({ acompte_paid: true, acompte_paid_at: new Date().toISOString() })
        .eq("id", dossierResult.dossierId)
        .eq("acompte_paid", false);
    }

    await logCall({
      eventId: event.id,
      eventType: event.type,
      signatureValid: true,
      devisId,
      paymentKind: "acompte",
      sessionId,
      paymentIntentId: piId,
      amountTotal: acompteTtc,
      responseStatus: 200,
      responseBody: `acompte marqué (${acompteTtc}€), dossier ${dossierResult.ok ? "créé" : "non créé"}, facture envoyée`,
    });
    return NextResponse.json({
      received: true,
      devisId,
      paymentKind: "acompte",
      dossierCreated: dossierResult.ok ? dossierResult.created : false,
    });
  } catch (err) {
    // Un throw dans le pipeline (update DB, création dossier, etc.) est loggé
    // ET renvoyé en 500 pour que Stripe retente.
    const msg = err instanceof Error ? err.message : String(err);
    await logCall({
      eventId: event.id,
      eventType: event.type,
      signatureValid: true,
      devisId,
      paymentKind,
      sessionId,
      paymentIntentId: piIdEarly,
      amountTotal: amountEuros,
      responseStatus: 500,
      errorMessage: msg,
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
