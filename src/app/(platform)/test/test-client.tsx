"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  ChevronDown,
  ChevronUp,
  Play,
  ExternalLink,
  AlertTriangle,
  RotateCcw,
  Wand2,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  testCreateClient,
  testCreateDevis,
  testSendDevis,
  testValidateDevis,
  testMarkAcomptePaid,
  testListDossierItems,
  testReceiveAllItems,
  testCreateAndSchedulePose,
  testMarkPoseDone,
  testMarkSoldePaid,
  testSendCustomSms,
  testSendCustomEmail,
  startTestRun,
  appendTestStep,
  finishTestRun,
  listTestRuns,
  getTestRun,
  deleteTestRun,
  testGetStripeCheckoutUrl,
  pollDevisState,
  pollDossierState,
  type TestLog,
  type TestRunSummary,
  type TestRunDetail,
  type TestRunStep,
} from "./actions";
import { Trash2, ChevronLeft, CreditCard, ScanLine, Hammer } from "lucide-react";

const TEST_PHONE = "0667699490";
const TEST_EMAIL = "dmanscour70@gmail.com";

type ClientLite = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  channel: string;
  city: string | null;
};

type DevisLite = {
  id: string;
  number: string;
  status: string;
  total_ttc: number;
  client_name: string;
};

type DossierLite = {
  id: string;
  number: string;
  status: string;
  client_name: string;
  items_received: number;
  items_total: number;
};

type StepKey =
  | "client"
  | "devis"
  | "send"
  | "validate"
  | "acompte"
  | "reception"
  | "pose-plan"
  | "pose-done"
  | "solde"
  | "sms-libre"
  | "email-libre";

type StepStatus = "pending" | "running" | "done" | "error";

type StepState = {
  status: StepStatus;
  message?: string;
  detail?: string;
  logs?: TestLog[];
};

const ALL_STEPS: { key: StepKey; label: string; sub: string }[] = [
  { key: "client", label: "Client", sub: "Créer ou choisir" },
  { key: "devis", label: "Devis", sub: "Lignes + total" },
  { key: "send", label: "Envoi", sub: "SMS + email" },
  { key: "validate", label: "Validation", sub: "Accord client" },
  { key: "acompte", label: "Acompte", sub: "50% + dossier" },
  { key: "reception", label: "Réception", sub: "Scan QR colis" },
  { key: "pose-plan", label: "Planning pose", sub: "Date & heure" },
  { key: "pose-done", label: "Pose effectuée", sub: "Fin chantier" },
  { key: "solde", label: "Solde", sub: "Encaissement final" },
  { key: "sms-libre", label: "Test SMS", sub: "Canal isolé" },
  { key: "email-libre", label: "Test email", sub: "Canal isolé" },
];

export default function TestClient({
  clients,
  devis,
  dossiers,
  initialRuns,
}: {
  clients: ClientLite[];
  devis: DevisLite[];
  dossiers: DossierLite[];
  initialRuns: TestRunSummary[];
}) {
  // État du parcours (entités créées au fil de l'eau)
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientLabel, setClientLabel] = useState<string>("");
  const [devisId, setDevisId] = useState<string | null>(null);
  const [devisNumber, setDevisNumber] = useState<string>("");
  const [dossierId, setDossierId] = useState<string | null>(null);
  const [poseId, setPoseId] = useState<string | null>(null);

  const [steps, setSteps] = useState<Record<StepKey, StepState>>(() =>
    Object.fromEntries(
      ALL_STEPS.map((s) => [s.key, { status: "pending" }]),
    ) as Record<StepKey, StepState>,
  );
  const [openStep, setOpenStep] = useState<StepKey>("client");
  const [pending, startTransition] = useTransition();
  const [autoRunning, setAutoRunning] = useState(false);
  const [tab, setTab] = useState<"new" | "history">("new");
  const [runs, setRuns] = useState<TestRunSummary[]>(initialRuns);
  const [refreshingRuns, setRefreshingRuns] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<TestRunDetail | null>(null);

  const refreshRuns = () => {
    setRefreshingRuns(true);
    startTransition(async () => {
      const r = await listTestRuns(50);
      setRuns(r);
      setRefreshingRuns(false);
    });
  };

  /** Crée le run en BDD au premier step si pas encore créé. */
  const ensureRun = async (mode: "manual" | "auto"): Promise<string | null> => {
    if (runId) return runId;
    const r = await startTestRun({ mode });
    if (!r.ok) return null;
    setRunId(r.runId);
    return r.runId;
  };

  /** Persist une étape en BDD (best-effort). */
  const persistStep = async (
    key: StepKey,
    state: StepState,
    entityPatch?: Parameters<typeof appendTestStep>[0]["entityPatch"],
    mode: "manual" | "auto" = "manual",
  ) => {
    const id = await ensureRun(mode);
    if (!id) return;
    const step: TestRunStep = {
      key,
      label: ALL_STEPS.find((s) => s.key === key)?.label ?? key,
      status: state.status,
      message: state.message,
      detail: state.detail,
      logs: state.logs,
      at: new Date().toISOString(),
    };
    await appendTestStep({ runId: id, step, entityPatch });
  };

  /** Helper compact : setStep + persistStep + optionnel refreshRuns. */
  const recordStep = async (
    key: StepKey,
    state: StepState,
    entityPatch?: Parameters<typeof appendTestStep>[0]["entityPatch"],
  ) => {
    setStep(key, state);
    await persistStep(key, state, entityPatch);
    refreshRuns();
  };

  const setStep = (key: StepKey, patch: Partial<StepState>) =>
    setSteps((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const progress = useMemo(() => {
    const done = ALL_STEPS.filter((s) => steps[s.key].status === "done").length;
    return Math.round((done / ALL_STEPS.length) * 100);
  }, [steps]);

  const reset = () => {
    // Si un run est en cours, on le marque comme annulé.
    const currentRunId = runId;
    if (currentRunId) {
      startTransition(async () => {
        await finishTestRun({ runId: currentRunId, status: "cancelled" });
        refreshRuns();
      });
    }
    setRunId(null);
    setClientId(null);
    setClientLabel("");
    setDevisId(null);
    setDevisNumber("");
    setDossierId(null);
    setPoseId(null);
    setSteps(
      Object.fromEntries(
        ALL_STEPS.map((s) => [s.key, { status: "pending" }]),
      ) as Record<StepKey, StepState>,
    );
    setOpenStep("client");
  };

  // ──────────────────────────────── STEP HANDLERS ────────────────────────────

  const runClient = (payload: {
    mode: "create" | "existing";
    existingId?: string;
    display_name?: string;
    email?: string;
    phone?: string;
    channel?: string;
    city?: string;
  }) => {
    setStep("client", { status: "running" });
    startTransition(async () => {
      if (payload.mode === "existing" && payload.existingId) {
        const c = clients.find((x) => x.id === payload.existingId);
        if (!c) {
          const errState: StepState = { status: "error", message: "Client introuvable" };
          setStep("client", errState);
          await persistStep("client", errState);
          return;
        }
        setClientId(c.id);
        const label = `${c.display_name} · ${c.id.slice(0, 8)}…`;
        setClientLabel(label);
        const okState: StepState = { status: "done", message: `Client réutilisé : ${c.display_name}` };
        setStep("client", okState);
        await persistStep("client", okState, { client_id: c.id, client_label: c.display_name });
        setOpenStep("devis");
        refreshRuns();
        return;
      }
      const r = await testCreateClient({
        display_name: payload.display_name ?? "Client Test",
        email: payload.email ?? TEST_EMAIL,
        phone: payload.phone ?? TEST_PHONE,
        channel: (payload.channel as never) ?? "magasin",
        city: payload.city,
      });
      if (r.ok) {
        setClientId(r.id);
        const label = `${payload.display_name ?? "Client Test"} (nouveau)`;
        setClientLabel(label);
        const okState: StepState = { status: "done", message: `Client créé · id ${r.id.slice(0, 8)}…` };
        setStep("client", okState);
        await persistStep("client", okState, {
          client_id: r.id,
          client_label: payload.display_name ?? "Client Test",
        });
        setOpenStep("devis");
        refreshRuns();
      } else {
        const errState: StepState = { status: "error", message: r.message };
        setStep("client", errState);
        await persistStep("client", errState);
      }
    });
  };

  const runDevis = (payload: {
    mode: "create" | "existing";
    existingId?: string;
    product_summary?: string;
    line_label?: string;
    qty?: number;
    unit_price?: number;
  }) => {
    setStep("devis", { status: "running" });
    startTransition(async () => {
      if (payload.mode === "existing" && payload.existingId) {
        const d = devis.find((x) => x.id === payload.existingId);
        if (!d) {
          await recordStep("devis", { status: "error", message: "Devis introuvable" });
          return;
        }
        setDevisId(d.id);
        setDevisNumber(d.number);
        await recordStep(
          "devis",
          {
            status: "done",
            message: `Devis réutilisé : ${d.number} (${d.total_ttc}€ TTC)`,
          },
          { devis_id: d.id },
        );
        setOpenStep("send");
        return;
      }
      if (!clientId) {
        await recordStep("devis", { status: "error", message: "Crée d'abord un client (étape 1)." });
        return;
      }
      const r = await testCreateDevis({
        client_id: clientId,
        channel: "magasin",
        product_summary: payload.product_summary ?? "Rideaux salon sur mesure",
        lines: [
          {
            label: payload.line_label ?? "Rideaux occultants sur mesure",
            qty: payload.qty ?? 2,
            unit_label: "u",
            unit_price_ht: payload.unit_price ?? 380,
          },
        ],
      });
      if (r.ok) {
        setDevisId(r.id);
        setDevisNumber(r.number);
        await recordStep(
          "devis",
          { status: "done", message: `Devis créé · ${r.number} · ${r.total_ttc}€ TTC` },
          { devis_id: r.id },
        );
        setOpenStep("send");
      } else {
        await recordStep("devis", { status: "error", message: r.message });
      }
    });
  };

  const runSend = () => {
    if (!devisId) {
      setStep("send", { status: "error", message: "Pas de devis (étape 2)." });
      return;
    }
    setStep("send", { status: "running" });
    startTransition(async () => {
      const r = await testSendDevis(devisId);
      if (r.ok) {
        await recordStep("send", {
          status: "done",
          message: r.emailedTo ? `Email envoyé à ${r.emailedTo}` : "Devis envoyé",
          logs: r.logs,
        });
        setOpenStep("validate");
      } else {
        await recordStep("send", { status: "error", message: r.message, logs: r.logs });
      }
    });
  };

  const runValidate = () => {
    if (!devisId) {
      setStep("validate", { status: "error", message: "Pas de devis." });
      return;
    }
    setStep("validate", { status: "running" });
    startTransition(async () => {
      const r = await testValidateDevis(devisId);
      if (r.ok) {
        await recordStep("validate", { status: "done", message: "Devis marqué validé" });
        setOpenStep("acompte");
      } else {
        await recordStep("validate", { status: "error", message: r.message });
      }
    });
  };

  /** Vrai paiement Stripe : ouvre Checkout, poll jusqu'à confirmation
   *  webhook (status devis → acompte_recu), puis marque l'étape done. */
  const runAcompteReal = () => {
    if (!devisId) {
      setStep("acompte", { status: "error", message: "Pas de devis." });
      return;
    }
    setStep("acompte", {
      status: "running",
      message: "Génération du lien Stripe…",
    });
    startTransition(async () => {
      const link = await testGetStripeCheckoutUrl(devisId);
      if (!link.ok) {
        await recordStep("acompte", {
          status: "error",
          message: link.message,
          logs: [{ level: "error", label: "Échec génération lien Stripe", detail: link.message }],
        });
        return;
      }
      // Ouvre Stripe dans un nouvel onglet.
      window.open(link.url, "_blank", "noopener,noreferrer");
      setStep("acompte", {
        status: "running",
        message: "Stripe ouvert dans un nouvel onglet — paie avec la carte test 4242 4242 4242 4242, je détecte automatiquement le paiement.",
        detail: "Polling toutes les 3s (timeout 5 min)…",
      });

      const start = Date.now();
      const TIMEOUT_MS = 5 * 60 * 1000;
      let detected: Awaited<ReturnType<typeof pollDevisState>> | null = null;
      while (Date.now() - start < TIMEOUT_MS) {
        await new Promise((r) => setTimeout(r, 3000));
        const s = await pollDevisState(devisId);
        if (s.ok && s.acompteRecu) {
          detected = s;
          break;
        }
      }

      if (!detected || !detected.ok || !detected.dossierId) {
        await recordStep("acompte", {
          status: "error",
          message: "Timeout (5 min) — paiement non détecté",
          detail: "Vérifie que le webhook Stripe est bien configuré (whsec_…) et que la session Stripe a été complétée.",
          logs: [{ level: "warn", label: "Polling expiré", detail: "5 minutes sans détecter status=acompte_recu" }],
        });
        return;
      }

      setDossierId(detected.dossierId);
      await recordStep(
        "acompte",
        {
          status: "done",
          message: "💳 Paiement Stripe confirmé via webhook",
          detail: `Dossier ${detected.dossierId.slice(0, 8)} créé · ${detected.itemCount} items · ${detected.bcCount} BC · ${detected.paymentCount} paiement(s) enregistré(s)`,
          logs: [
            { level: "success", label: "Webhook Stripe reçu", detail: "checkout.session.completed → devis.status = acompte_recu" },
            { level: "success", label: `Dossier créé automatiquement (${detected.itemCount} items + ${detected.bcCount} BC)` },
          ],
        },
        { dossier_id: detected.dossierId },
      );
      // marquer aussi validate comme fait si pas déjà
      if (steps.validate.status !== "done") {
        await recordStep("validate", { status: "done", message: "Implicite : paiement = acceptation" });
      }
      setOpenStep("reception");
    });
  };

  /** Vrai parcours réception : ouvre /reception dans nouvel onglet, poll
   *  jusqu'à ce que tous les items du dossier soient reçus. */
  const runReceptionReal = () => {
    if (!dossierId) {
      setStep("reception", { status: "error", message: "Pas de dossier." });
      return;
    }
    setStep("reception", {
      status: "running",
      message: "Ouvre l'onglet réception et scanne les QR codes des items du dossier…",
    });
    startTransition(async () => {
      window.open("/reception", "_blank", "noopener,noreferrer");

      const start = Date.now();
      const TIMEOUT_MS = 10 * 60 * 1000;
      while (Date.now() - start < TIMEOUT_MS) {
        await new Promise((r) => setTimeout(r, 3000));
        const s = await pollDossierState(dossierId);
        if (s.ok && s.itemsTotal > 0 && s.itemsReceived === s.itemsTotal) {
          await recordStep("reception", {
            status: "done",
            message: `Tous les ${s.itemsTotal} items scannés via /reception`,
            detail: "Dossier passé à 'prêt pour pose'. SMS tous_recus déclenché.",
            logs: [
              { level: "success", label: `${s.itemsTotal}/${s.itemsTotal} items reçus`, detail: "Statut dossier: pret_pose" },
            ],
          });
          setOpenStep("pose-plan");
          return;
        }
        // mise à jour live de la progression
        if (s.ok) {
          setStep("reception", {
            status: "running",
            message: `${s.itemsReceived}/${s.itemsTotal} items scannés — continue les scans…`,
          });
        }
      }
      await recordStep("reception", {
        status: "error",
        message: "Timeout (10 min) — items non tous scannés",
        logs: [{ level: "warn", label: "Polling expiré", detail: "Reviens et reprends quand les colis sont reçus." }],
      });
    });
  };

  /** Vrai parcours pose : ouvre la fiche pose, poll jusqu'à pose marquée done. */
  const runPoseDoneReal = () => {
    if (!poseId) {
      setStep("pose-done", { status: "error", message: "Pas de pose planifiée." });
      return;
    }
    setStep("pose-done", {
      status: "running",
      message: "Ouvre la fiche pose et clique 'Marquer comme posée' depuis l'app poseur…",
    });
    startTransition(async () => {
      window.open(`/poses/${poseId}`, "_blank", "noopener,noreferrer");

      const start = Date.now();
      const TIMEOUT_MS = 10 * 60 * 1000;
      while (Date.now() - start < TIMEOUT_MS) {
        await new Promise((r) => setTimeout(r, 3000));
        if (!dossierId) break;
        const s = await pollDossierState(dossierId);
        if (s.ok && s.poseStatus === "pose") {
          await recordStep("pose-done", {
            status: "done",
            message: "Pose marquée effectuée depuis l'interface poseur",
            detail: "SMS satisfaction déclenché automatiquement.",
            logs: [
              { level: "success", label: "pose.status = pose", detail: "Trigger pose_effectuee firé" },
            ],
          });
          setOpenStep("solde");
          return;
        }
      }
      await recordStep("pose-done", {
        status: "error",
        message: "Timeout (10 min) — pose non marquée",
      });
    });
  };

  const runAcompte = () => {
    if (!devisId) {
      setStep("acompte", { status: "error", message: "Pas de devis." });
      return;
    }
    setStep("acompte", { status: "running" });
    startTransition(async () => {
      const r = await testMarkAcomptePaid(devisId);
      if (r.ok) {
        setDossierId(r.dossierId);
        await recordStep(
          "acompte",
          {
            status: "done",
            message: `Acompte encaissé · dossier créé`,
            detail: `Dossier ${r.dossierId.slice(0, 8)}… · ${r.itemCount} items · ${r.bcCount} BC fournisseurs auto-générés`,
            logs: r.logs,
          },
          { dossier_id: r.dossierId },
        );
        setOpenStep("reception");
      } else {
        await recordStep("acompte", { status: "error", message: r.message, logs: r.logs });
      }
    });
  };

  const runReception = () => {
    if (!dossierId) {
      setStep("reception", { status: "error", message: "Pas de dossier (étape 5)." });
      return;
    }
    setStep("reception", { status: "running" });
    startTransition(async () => {
      const list = await testListDossierItems(dossierId);
      if (!list.ok) {
        setStep("reception", { status: "error", message: list.message });
        return;
      }
      const r = await testReceiveAllItems(dossierId);
      if (r.ok) {
        await recordStep("reception", {
          status: "done",
          message: `${r.received} colis reçus (${r.skipped} déjà reçus)`,
          detail: `Total items du dossier : ${r.total} · QR codes scannés en cascade`,
          logs: r.logs,
        });
        setOpenStep("pose-plan");
      } else {
        await recordStep("reception", { status: "error", message: r.message, logs: r.logs });
      }
    });
  };

  const runPosePlan = (payload: { scheduledAt: string }) => {
    if (!dossierId) {
      setStep("pose-plan", { status: "error", message: "Pas de dossier." });
      return;
    }
    setStep("pose-plan", { status: "running" });
    startTransition(async () => {
      const r = await testCreateAndSchedulePose(dossierId, payload.scheduledAt);
      if (r.ok) {
        setPoseId(r.poseId);
        await recordStep(
          "pose-plan",
          {
            status: "done",
            message: `Pose planifiée le ${new Date(payload.scheduledAt).toLocaleString("fr-FR")}`,
          },
          { pose_id: r.poseId },
        );
        setOpenStep("pose-done");
      } else {
        await recordStep("pose-plan", { status: "error", message: r.message });
      }
    });
  };

  const runPoseDone = () => {
    if (!poseId) {
      setStep("pose-done", { status: "error", message: "Pas de pose planifiée." });
      return;
    }
    setStep("pose-done", { status: "running" });
    startTransition(async () => {
      const r = await testMarkPoseDone(poseId);
      if (r.ok) {
        await recordStep("pose-done", {
          status: "done",
          message: "Pose marquée effectuée · SMS satisfaction déclenché",
          logs: r.logs,
        });
        setOpenStep("solde");
      } else {
        await recordStep("pose-done", { status: "error", message: r.message, logs: r.logs });
      }
    });
  };

  const runSolde = () => {
    if (!devisId) {
      setStep("solde", { status: "error", message: "Pas de devis." });
      return;
    }
    setStep("solde", { status: "running" });
    startTransition(async () => {
      const r = await testMarkSoldePaid(devisId);
      if (r.ok) {
        await recordStep("solde", {
          status: "done",
          message: `Solde encaissé · ${Math.round(r.amount)}€`,
          logs: r.logs,
        });
        setOpenStep("sms-libre");
      } else {
        await recordStep("solde", { status: "error", message: r.message, logs: r.logs });
      }
    });
  };

  const runSmsLibre = (phone: string, body: string) => {
    setStep("sms-libre", { status: "running" });
    startTransition(async () => {
      const r = await testSendCustomSms({ phone, body });
      if (r.ok) {
        await recordStep("sms-libre", {
          status: "done",
          message: `SMS envoyé à ${phone}`,
          detail: r.messageId ? `Brevo ID : ${r.messageId}` : undefined,
          logs: [{ level: "success", label: `SMS envoyé à ${phone}`, detail: r.messageId ? `Brevo ID : ${r.messageId}` : undefined }],
        });
        setOpenStep("email-libre");
      } else {
        await recordStep("sms-libre", {
          status: "error",
          message: r.message,
          logs: [{ level: "error", label: "Échec envoi SMS", detail: r.message }],
        });
      }
    });
  };

  const runEmailLibre = (toEmail: string, subject: string, html: string) => {
    setStep("email-libre", { status: "running" });
    startTransition(async () => {
      const r = await testSendCustomEmail({
        toEmail,
        subject,
        htmlBody: html,
      });
      if (r.ok) {
        await recordStep("email-libre", {
          status: "done",
          message: `Email envoyé à ${toEmail}`,
          detail: r.messageId ? `Brevo ID : ${r.messageId}` : undefined,
          logs: [{ level: "success", label: `Email envoyé à ${toEmail}`, detail: r.messageId ? `Brevo ID : ${r.messageId}` : undefined }],
        });
        // Dernière étape : on marque le run comme success (ou partial si erreurs).
        if (runId) {
          const hasError = Object.values(steps).some((s) => s.status === "error");
          await finishTestRun({ runId, status: hasError ? "partial" : "success" });
          setRunId(null);
          refreshRuns();
        }
      } else {
        await recordStep("email-libre", {
          status: "error",
          message: r.message,
          logs: [{ level: "error", label: "Échec envoi email", detail: r.message }],
        });
        if (runId) {
          await finishTestRun({ runId, status: "partial" });
          setRunId(null);
          refreshRuns();
        }
      }
    });
  };

  // ──────────────────────────────── AUTO RUN (full path) ────────────────────

  const autoRun = () => {
    setAutoRunning(true);
    reset();
    startTransition(async () => {
      // Crée le run en mode "auto" dès le départ.
      const runStart = await startTestRun({ mode: "auto" });
      const newRunId = runStart.ok ? runStart.runId : null;
      if (newRunId) setRunId(newRunId);

      // Helper local : persiste l'étape AVEC le runId capturé en closure.
      const persist = async (
        key: StepKey,
        state: StepState,
        entityPatch?: Parameters<typeof appendTestStep>[0]["entityPatch"],
      ) => {
        setStep(key, state);
        if (newRunId) {
          await appendTestStep({
            runId: newRunId,
            step: {
              key,
              label: ALL_STEPS.find((s) => s.key === key)?.label ?? key,
              status: state.status,
              message: state.message,
              detail: state.detail,
              logs: state.logs,
              at: new Date().toISOString(),
            },
            entityPatch,
          });
        }
      };

      const finishWith = async (finalStatus: "success" | "partial" | "failed") => {
        if (newRunId) await finishTestRun({ runId: newRunId, status: finalStatus });
        setRunId(null);
        setAutoRunning(false);
        refreshRuns();
      };

      // 1. Client
      await persist("client", { status: "running" });
      const c = await testCreateClient({
        display_name: `Client Test ${new Date().toLocaleTimeString("fr-FR")}`,
        email: TEST_EMAIL,
        phone: TEST_PHONE,
        channel: "magasin",
        city: "Bordeaux",
      });
      if (!c.ok) {
        await persist("client", { status: "error", message: c.message });
        return finishWith("failed");
      }
      setClientId(c.id);
      setClientLabel("Client Test (auto)");
      await persist(
        "client",
        { status: "done", message: `Client créé · ${c.id.slice(0, 8)}…` },
        { client_id: c.id, client_label: `Client Test (auto)` },
      );

      // 2. Devis
      await persist("devis", { status: "running" });
      const d = await testCreateDevis({
        client_id: c.id,
        channel: "magasin",
        product_summary: "Parcours test complet — rideaux salon",
        lines: [
          { label: "Rideaux occultants sur mesure", qty: 2, unit_label: "u", unit_price_ht: 380 },
          { label: "Rail DS 200cm", qty: 2, unit_label: "u", unit_price_ht: 45 },
          { label: "Pose à domicile", qty: 1, unit_label: "f", unit_price_ht: 120 },
        ],
      });
      if (!d.ok) {
        await persist("devis", { status: "error", message: d.message });
        return finishWith("partial");
      }
      setDevisId(d.id);
      setDevisNumber(d.number);
      await persist(
        "devis",
        { status: "done", message: `${d.number} · ${d.total_ttc}€ TTC` },
        { devis_id: d.id },
      );

      // 3. Envoi
      await persist("send", { status: "running" });
      const s = await testSendDevis(d.id);
      await persist(
        "send",
        s.ok
          ? { status: "done", message: s.emailedTo ? `Email envoyé à ${s.emailedTo}` : "Envoi OK", logs: s.logs }
          : { status: "error", message: s.message, logs: s.logs },
      );
      if (!s.ok) return finishWith("partial");

      // 4. Validation
      await persist("validate", { status: "running" });
      const v = await testValidateDevis(d.id);
      await persist("validate", v.ok ? { status: "done", message: "Validé" } : { status: "error", message: v.message });
      if (!v.ok) return finishWith("partial");

      // 5. Acompte
      await persist("acompte", { status: "running" });
      const a = await testMarkAcomptePaid(d.id);
      if (!a.ok) {
        await persist("acompte", { status: "error", message: a.message, logs: a.logs });
        return finishWith("partial");
      }
      setDossierId(a.dossierId);
      await persist(
        "acompte",
        {
          status: "done",
          message: `Acompte OK · dossier ${a.dossierId.slice(0, 8)}…`,
          detail: `${a.itemCount} items · ${a.bcCount} BC`,
          logs: a.logs,
        },
        { dossier_id: a.dossierId },
      );

      // 6. Réception
      await persist("reception", { status: "running" });
      const r = await testReceiveAllItems(a.dossierId);
      if (!r.ok) {
        await persist("reception", { status: "error", message: r.message, logs: r.logs });
        return finishWith("partial");
      }
      await persist("reception", {
        status: "done",
        message: `${r.received} colis reçus`,
        detail: `Total ${r.total}`,
        logs: r.logs,
      });

      // 7. Pose planifiée
      await persist("pose-plan", { status: "running" });
      const inFiveDays = new Date(Date.now() + 5 * 86400000);
      inFiveDays.setHours(10, 0, 0, 0);
      const p = await testCreateAndSchedulePose(a.dossierId, inFiveDays.toISOString());
      if (!p.ok) {
        await persist("pose-plan", { status: "error", message: p.message });
        return finishWith("partial");
      }
      setPoseId(p.poseId);
      await persist(
        "pose-plan",
        { status: "done", message: `Planifiée le ${inFiveDays.toLocaleString("fr-FR")}` },
        { pose_id: p.poseId },
      );

      // 8. Pose effectuée
      await persist("pose-done", { status: "running" });
      const pd = await testMarkPoseDone(p.poseId);
      await persist(
        "pose-done",
        pd.ok
          ? { status: "done", message: "Pose effectuée", logs: pd.logs }
          : { status: "error", message: pd.message, logs: pd.logs },
      );
      if (!pd.ok) return finishWith("partial");

      // 9. Solde
      await persist("solde", { status: "running" });
      const so = await testMarkSoldePaid(d.id);
      await persist(
        "solde",
        so.ok
          ? { status: "done", message: `Solde ${Math.round(so.amount)}€`, logs: so.logs }
          : { status: "error", message: so.message, logs: so.logs },
      );

      // 10. SMS libre
      await persist("sms-libre", { status: "running" });
      const sms = await testSendCustomSms({
        phone: TEST_PHONE,
        body: "Test parcours complet — toutes les étapes ont été exécutées sur la plateforme Atmosphère.",
      });
      await persist(
        "sms-libre",
        sms.ok
          ? {
              status: "done",
              message: `Envoyé à ${TEST_PHONE}`,
              logs: [{ level: "success", label: `SMS envoyé à ${TEST_PHONE}`, detail: sms.messageId ? `Brevo ID : ${sms.messageId}` : undefined }],
            }
          : { status: "error", message: sms.message, logs: [{ level: "error", label: "Échec SMS", detail: sms.message }] },
      );

      // 11. Email libre
      await persist("email-libre", { status: "running" });
      const em = await testSendCustomEmail({
        toEmail: TEST_EMAIL,
        subject: "Atmosphère — test parcours complet",
        htmlBody: `<p>Bonjour,</p><p>Le parcours de test a été exécuté avec succès :</p><ul><li>Client créé</li><li>Devis ${d.number} envoyé puis validé</li><li>Acompte + solde encaissés</li><li>Colis reçus + pose effectuée</li></ul><p>— Plateforme Atmosphère</p>`,
      });
      await persist(
        "email-libre",
        em.ok
          ? {
              status: "done",
              message: `Envoyé à ${TEST_EMAIL}`,
              logs: [{ level: "success", label: `Email envoyé à ${TEST_EMAIL}`, detail: em.messageId ? `Brevo ID : ${em.messageId}` : undefined }],
            }
          : { status: "error", message: em.message, logs: [{ level: "error", label: "Échec email", detail: em.message }] },
      );

      setOpenStep("email-libre");
      // On regarde les erreurs accumulées via le state final.
      const hasError = !sms.ok || !em.ok;
      await finishWith(hasError ? "partial" : "success");
    });
  };

  // ──────────────────────────────── RENDER ──────────────────────────────────

  return (
    <>
      <Topbar
        breadcrumb={
          tab === "history" && selectedRunId
            ? [
                { label: "Atmosphère" },
                { label: "Test parcours", href: "/test" },
                { label: "Détail run" },
              ]
            : [{ label: "Atmosphère" }, { label: "Test parcours" }]
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="px-8 pt-3 bg-canvas sticky top-0 z-20 border-b border-line">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "new" | "history")}>
            <TabsList className="border-b-0">
              <TabsTrigger value="new">Nouveau test</TabsTrigger>
              <TabsTrigger value="history">
                Liste des tests
                <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-canvas-2 text-[10.5px] font-semibold tabular-nums text-muted">
                  {runs.length}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {tab === "history" ? (
          <HistoryTab
            runs={runs}
            selectedRunId={selectedRunId}
            selectedRun={selectedRun}
            onSelect={(id) => {
              setSelectedRunId(id);
              startTransition(async () => {
                const r = await getTestRun(id);
                setSelectedRun(r);
              });
            }}
            onClose={() => {
              setSelectedRunId(null);
              setSelectedRun(null);
            }}
            onDelete={(id) => {
              startTransition(async () => {
                const r = await deleteTestRun(id);
                if (r.ok) {
                  if (selectedRunId === id) {
                    setSelectedRunId(null);
                    setSelectedRun(null);
                  }
                  refreshRuns();
                }
              });
            }}
          />
        ) : (
          <>
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">QA · Simulation bout-en-bout</p>
          <div className="flex items-end justify-between gap-8 flex-wrap mb-2">
            <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1]">
              Test parcours complet
            </h1>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Button variant="secondary" size="sm" onClick={reset} disabled={pending || autoRunning}>
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.2} />
                Réinitialiser
              </Button>
              <Button variant="accent" size="sm" onClick={autoRun} disabled={pending || autoRunning}>
                <Wand2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                Lancer le parcours complet
              </Button>
            </div>
          </div>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Simule l'intégralité du cycle de vente — création client, devis, envoi,
            validation, acompte, dossier de confection, réception QR, pose, solde —
            avec des variables pré-remplies modifiables. Possibilité de reprendre un
            vrai client ou un vrai devis à n'importe quelle étape.
          </p>

          <div className="mt-4 inline-flex items-start gap-2 rounded-lg border border-amber/30 bg-amber-soft/50 px-3 py-2 text-[12px] text-amber max-w-2xl">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" strokeWidth={2.2} />
            <span>
              <strong>Mode test sûr</strong> — tous les SMS et emails déclenchés par ce wizard
              sont <strong>forcés sur {TEST_PHONE} / {TEST_EMAIL}</strong>, même si tu reprends
              un vrai client. Aucun risque de spammer un client réel.
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-6 rounded-xl border border-line bg-white p-4">
            <div className="flex items-center justify-between mb-2 text-[12px] text-muted">
              <span>Progression</span>
              <span className="font-semibold text-ink-2 tabular-nums">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-canvas-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet to-pink transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Step dots */}
            <div className="mt-4 flex items-center justify-between gap-1 flex-wrap">
              {ALL_STEPS.map((s, i) => {
                const st = steps[s.key].status;
                return (
                  <button
                    key={s.key}
                    onClick={() => setOpenStep(s.key)}
                    className="flex flex-col items-center gap-1 min-w-[68px] group"
                    title={s.label}
                  >
                    <div
                      className={cn(
                        "h-6 w-6 rounded-full inline-flex items-center justify-center text-[10px] font-semibold transition-colors",
                        st === "done" && "bg-emerald text-white",
                        st === "running" && "bg-violet text-white animate-pulse",
                        st === "error" && "bg-pink text-white",
                        st === "pending" && "bg-canvas-2 text-muted-2 group-hover:text-ink",
                        openStep === s.key && st === "pending" && "ring-2 ring-violet/40",
                      )}
                    >
                      {st === "done" ? "✓" : st === "error" ? "!" : i + 1}
                    </div>
                    <span
                      className={cn(
                        "text-[10.5px] font-medium truncate max-w-[68px] text-center",
                        openStep === s.key ? "text-ink" : "text-muted-2 group-hover:text-ink-2",
                      )}
                    >
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Entités créées */}
          {(clientId || devisId || dossierId || poseId) && (
            <div className="mt-4 flex items-center gap-2 flex-wrap text-[11.5px]">
              {clientId && (
                <Link
                  href={`/clients/${clientId}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-blue-soft text-blue px-2.5 py-1 font-medium hover:underline"
                >
                  Client · {clientLabel || clientId.slice(0, 8)} <ExternalLink className="h-3 w-3" />
                </Link>
              )}
              {devisId && (
                <Link
                  href={`/devis/${devisId}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-pink-soft text-pink px-2.5 py-1 font-medium hover:underline"
                >
                  Devis · {devisNumber || devisId.slice(0, 8)} <ExternalLink className="h-3 w-3" />
                </Link>
              )}
              {dossierId && (
                <Link
                  href={`/confections/${dossierId}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-orange-soft text-orange px-2.5 py-1 font-medium hover:underline"
                >
                  Dossier · {dossierId.slice(0, 8)} <ExternalLink className="h-3 w-3" />
                </Link>
              )}
              {poseId && (
                <Link
                  href={`/poses/${poseId}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-soft text-emerald px-2.5 py-1 font-medium hover:underline"
                >
                  Pose · {poseId.slice(0, 8)} <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}
        </section>

        {/* Steps */}
        <section className="px-8 pb-12 space-y-3">
          <StepCard
            index={1}
            step={steps.client}
            stepKey="client"
            openStep={openStep}
            setOpenStep={setOpenStep}
            title="Client"
            description="Création d'une fiche client ou réutilisation d'un existant."
            disabled={pending || autoRunning}
          >
            <ClientForm clients={clients} onRun={runClient} disabled={pending || autoRunning} />
          </StepCard>

          <StepCard
            index={2}
            step={steps.devis}
            stepKey="devis"
            openStep={openStep}
            setOpenStep={setOpenStep}
            title="Devis"
            description="Création d'un devis avec lignes pré-remplies, ou réutilisation."
            disabled={pending || autoRunning}
          >
            <DevisForm devis={devis} onRun={runDevis} disabled={pending || autoRunning} canCreate={!!clientId} />
          </StepCard>

          <StepCard
            index={3}
            step={steps.send}
            stepKey="send"
            openStep={openStep}
            setOpenStep={setOpenStep}
            title="Envoi du devis"
            description="Passe le devis en statut « envoyé » et déclenche les SMS/email selon les règles d'automation."
            disabled={pending || autoRunning}
          >
            <SimpleAction onRun={runSend} label="Envoyer le devis" disabled={pending || autoRunning || !devisId} />
          </StepCard>

          <StepCard
            index={4}
            step={steps.validate}
            stepKey="validate"
            openStep={openStep}
            setOpenStep={setOpenStep}
            title="Validation par le client"
            description="Le client accepte le devis (statut « validé »)."
            disabled={pending || autoRunning}
          >
            <SimpleAction onRun={runValidate} label="Marquer comme validé" disabled={pending || autoRunning || !devisId} />
          </StepCard>

          <StepCard
            index={5}
            step={steps.acompte}
            stepKey="acompte"
            openStep={openStep}
            setOpenStep={setOpenStep}
            title="Encaissement acompte 50%"
            description="Crée le paiement, déclenche la création du dossier de confection (avec QR codes) et les bons de commande fournisseurs."
            disabled={pending || autoRunning}
          >
            <DualModeAction
              disabled={pending || autoRunning || !devisId}
              simulateLabel="Simuler (virement manuel)"
              simulateIcon={<Play className="h-3.5 w-3.5" strokeWidth={2.2} />}
              onSimulate={runAcompte}
              realLabel="Tester avec vrai paiement Stripe"
              realIcon={<CreditCard className="h-3.5 w-3.5" strokeWidth={2.2} />}
              onReal={runAcompteReal}
              realHint="Ouvre Stripe Checkout dans un nouvel onglet · carte test 4242 4242 4242 4242 · le webhook valide automatiquement l'étape"
            />
          </StepCard>

          <StepCard
            index={6}
            step={steps.reception}
            stepKey="reception"
            openStep={openStep}
            setOpenStep={setOpenStep}
            title="Réception colis (scan QR)"
            description="Scanne en cascade tous les QR codes des items du dossier. Au dernier item reçu, le dossier passe « Prêt pour pose » et un SMS est envoyé au client."
            disabled={pending || autoRunning}
          >
            <DualModeAction
              disabled={pending || autoRunning || !dossierId}
              simulateLabel="Simuler (scan auto cascade)"
              simulateIcon={<Play className="h-3.5 w-3.5" strokeWidth={2.2} />}
              onSimulate={runReception}
              realLabel="Tester depuis l'écran réception"
              realIcon={<ScanLine className="h-3.5 w-3.5" strokeWidth={2.2} />}
              onReal={runReceptionReal}
              realHint="Ouvre /reception dans un nouvel onglet · scanne ou saisis les QR codes des items du dossier · le polling détecte chaque réception"
            />
          </StepCard>

          <StepCard
            index={7}
            step={steps["pose-plan"]}
            stepKey="pose-plan"
            openStep={openStep}
            setOpenStep={setOpenStep}
            title="Planification de la pose"
            description="Crée la pose puis fixe la date et l'heure."
            disabled={pending || autoRunning}
          >
            <PosePlanForm onRun={runPosePlan} disabled={pending || autoRunning || !dossierId} />
          </StepCard>

          <StepCard
            index={8}
            step={steps["pose-done"]}
            stepKey="pose-done"
            openStep={openStep}
            setOpenStep={setOpenStep}
            title="Pose effectuée"
            description="Marque la pose comme terminée et envoie le SMS de satisfaction."
            disabled={pending || autoRunning}
          >
            <DualModeAction
              disabled={pending || autoRunning || !poseId}
              simulateLabel="Simuler (clic admin)"
              simulateIcon={<Play className="h-3.5 w-3.5" strokeWidth={2.2} />}
              onSimulate={runPoseDone}
              realLabel="Tester depuis la fiche pose"
              realIcon={<Hammer className="h-3.5 w-3.5" strokeWidth={2.2} />}
              onReal={runPoseDoneReal}
              realHint="Ouvre /poses/[id] dans un nouvel onglet · le poseur clique 'Marquer comme posée' · le polling détecte le passage en statut 'pose'"
            />
          </StepCard>

          <StepCard
            index={9}
            step={steps.solde}
            stepKey="solde"
            openStep={openStep}
            setOpenStep={setOpenStep}
            title="Encaissement solde"
            description="Enregistre le paiement du solde restant (total − acompte)."
            disabled={pending || autoRunning}
          >
            <SimpleAction onRun={runSolde} label="Encaisser le solde" disabled={pending || autoRunning || !devisId} />
          </StepCard>

          <StepCard
            index={10}
            step={steps["sms-libre"]}
            stepKey="sms-libre"
            openStep={openStep}
            setOpenStep={setOpenStep}
            title="Test SMS libre"
            description="Envoie un SMS arbitraire via Brevo (test du canal indépendant du parcours)."
            disabled={pending || autoRunning}
          >
            <SmsForm onRun={runSmsLibre} disabled={pending || autoRunning} />
          </StepCard>

          <StepCard
            index={11}
            step={steps["email-libre"]}
            stepKey="email-libre"
            openStep={openStep}
            setOpenStep={setOpenStep}
            title="Test email libre"
            description="Envoie un email arbitraire via Brevo (test du canal email)."
            disabled={pending || autoRunning}
          >
            <EmailForm onRun={runEmailLibre} disabled={pending || autoRunning} />
          </StepCard>

          {dossiers.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Dossiers récents (pour démarrer en cours de parcours)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[12px]">
                  {dossiers.slice(0, 9).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        setDossierId(d.id);
                        setStep("acompte", {
                          status: "done",
                          message: `Dossier réutilisé : ${d.number}`,
                          detail: `${d.items_received}/${d.items_total} items reçus`,
                        });
                        setOpenStep("reception");
                      }}
                      className="text-left rounded-lg border border-line hover:border-line-strong bg-white p-2.5 transition-colors"
                    >
                      <p className="font-semibold text-ink-2">{d.number}</p>
                      <p className="text-muted truncate">{d.client_name}</p>
                      <p className="text-muted-2 tabular-nums">
                        {d.items_received}/{d.items_total} reçus · {d.status}
                      </p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </section>
          </>
        )}
      </div>
    </>
  );
}

// ──────────────────────────────── COMPONENTS ──────────────────────────────────

function StepCard({
  index,
  step,
  stepKey,
  openStep,
  setOpenStep,
  title,
  description,
  children,
}: {
  index: number;
  step: StepState;
  stepKey: StepKey;
  openStep: StepKey;
  setOpenStep: (k: StepKey) => void;
  title: string;
  description: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const open = openStep === stepKey;
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpenStep(open ? ("__none__" as StepKey) : stepKey)}
        className="w-full text-left flex items-center gap-3 px-5 py-3.5 hover:bg-canvas-2/40 transition-colors"
      >
        <StepIcon status={step.status} index={index} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-semibold text-ink">{title}</p>
            <StepBadge status={step.status} />
            {step.message && (
              <span className="text-[12px] text-muted truncate">— {step.message}</span>
            )}
          </div>
          {!open && <p className="text-[12px] text-muted-2 mt-0.5 truncate">{description}</p>}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-2" strokeWidth={2.2} />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-2" strokeWidth={2.2} />
        )}
      </button>
      {open && (
        <div className="border-t border-line px-5 py-4 bg-canvas-2/20">
          <p className="text-[12.5px] text-muted mb-4">{description}</p>
          {children}
          {step.detail && (
            <p className="text-[11.5px] text-muted-2 mt-3 italic">{step.detail}</p>
          )}
          {step.logs && step.logs.length > 0 && <LogsPanel logs={step.logs} />}
        </div>
      )}
    </Card>
  );
}

function LogsPanel({ logs }: { logs: TestLog[] }) {
  return (
    <div className="mt-4 rounded-lg border border-line bg-white p-3 space-y-1.5">
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-2 mb-1">
        Logs d'exécution ({logs.length})
      </p>
      {logs.map((l, i) => (
        <LogLine key={i} log={l} />
      ))}
    </div>
  );
}

function LogLine({ log }: { log: TestLog }) {
  const icon =
    log.level === "success" ? (
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald shrink-0 mt-0.5" strokeWidth={2.4} />
    ) : log.level === "warn" ? (
      <AlertTriangle className="h-3.5 w-3.5 text-amber shrink-0 mt-0.5" strokeWidth={2.4} />
    ) : log.level === "error" ? (
      <XCircle className="h-3.5 w-3.5 text-pink shrink-0 mt-0.5" strokeWidth={2.4} />
    ) : (
      <Circle className="h-3.5 w-3.5 text-blue shrink-0 mt-0.5" strokeWidth={2.4} />
    );
  return (
    <div className="flex items-start gap-2 text-[12px]">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-ink-2 font-medium">{log.label}</p>
        {log.detail && (
          <p className="text-muted-2 text-[11.5px] mt-0.5 break-words">{log.detail}</p>
        )}
      </div>
    </div>
  );
}

function StepIcon({ status, index }: { status: StepStatus; index: number }) {
  if (status === "done") {
    return (
      <div className="h-8 w-8 rounded-full bg-emerald-soft inline-flex items-center justify-center">
        <CheckCircle2 className="h-4 w-4 text-emerald" strokeWidth={2.4} />
      </div>
    );
  }
  if (status === "running") {
    return (
      <div className="h-8 w-8 rounded-full bg-violet-soft inline-flex items-center justify-center">
        <Loader2 className="h-4 w-4 text-violet animate-spin" strokeWidth={2.4} />
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="h-8 w-8 rounded-full bg-pink-soft inline-flex items-center justify-center">
        <XCircle className="h-4 w-4 text-pink" strokeWidth={2.4} />
      </div>
    );
  }
  return (
    <div className="h-8 w-8 rounded-full bg-canvas-2 inline-flex items-center justify-center">
      <Circle className="h-4 w-4 text-muted-2" strokeWidth={1.8} />
      <span className="sr-only">Étape {index}</span>
    </div>
  );
}

function StepBadge({ status }: { status: StepStatus }) {
  if (status === "done") return <StatusPill tone="emerald">Fait</StatusPill>;
  if (status === "running") return <StatusPill tone="violet">En cours…</StatusPill>;
  if (status === "error") return <StatusPill tone="pink">Erreur</StatusPill>;
  return <StatusPill tone="muted">En attente</StatusPill>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-2 block mb-1">
      {children}
    </label>
  );
}

function ClientForm({
  clients,
  onRun,
  disabled,
}: {
  clients: ClientLite[];
  onRun: (p: {
    mode: "create" | "existing";
    existingId?: string;
    display_name?: string;
    email?: string;
    phone?: string;
    channel?: string;
    city?: string;
  }) => void;
  disabled?: boolean;
}) {
  const [mode, setMode] = useState<"create" | "existing">("create");
  const [displayName, setDisplayName] = useState("Marie Dupont");
  const [email, setEmail] = useState(TEST_EMAIL);
  const [phone, setPhone] = useState(TEST_PHONE);
  const [channel, setChannel] = useState("magasin");
  const [city, setCity] = useState("Bordeaux");
  const [existingId, setExistingId] = useState(clients[0]?.id ?? "");

  return (
    <div className="space-y-4">
      <ModeToggle mode={mode} setMode={setMode} createLabel="Créer un client" existingLabel="Réutiliser un client" hasExisting={clients.length > 0} />

      {mode === "create" ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Nom complet</FieldLabel>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Téléphone</FieldLabel>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Canal source</FieldLabel>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[13px]"
            >
              <option value="magasin">Magasin</option>
              <option value="leroy_merlin">Leroy Merlin (Atmolead)</option>
              <option value="ecommerce">E-commerce</option>
              <option value="decoratrice">Décoratrice</option>
              <option value="visio">Visio</option>
            </select>
          </div>
          <div className="col-span-2">
            <FieldLabel>Ville</FieldLabel>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </div>
      ) : (
        <div>
          <FieldLabel>Client existant</FieldLabel>
          <select
            value={existingId}
            onChange={(e) => setExistingId(e.target.value)}
            className="h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[13px]"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.display_name} — {c.city ?? "—"} ({c.channel})
              </option>
            ))}
          </select>
        </div>
      )}

      <Button
        variant="primary"
        size="sm"
        disabled={disabled}
        onClick={() =>
          onRun(
            mode === "create"
              ? { mode, display_name: displayName, email, phone, channel, city }
              : { mode, existingId },
          )
        }
      >
        <Play className="h-3.5 w-3.5" strokeWidth={2.2} />
        {mode === "create" ? "Créer le client" : "Sélectionner"}
      </Button>
    </div>
  );
}

function DevisForm({
  devis,
  onRun,
  disabled,
  canCreate,
}: {
  devis: DevisLite[];
  onRun: (p: {
    mode: "create" | "existing";
    existingId?: string;
    product_summary?: string;
    line_label?: string;
    qty?: number;
    unit_price?: number;
  }) => void;
  disabled?: boolean;
  canCreate: boolean;
}) {
  const [mode, setMode] = useState<"create" | "existing">("create");
  const [summary, setSummary] = useState("Rideaux salon sur mesure");
  const [lineLabel, setLineLabel] = useState("Rideaux occultants 240×280");
  const [qty, setQty] = useState(2);
  const [unitPrice, setUnitPrice] = useState(380);
  const [existingId, setExistingId] = useState(devis[0]?.id ?? "");

  return (
    <div className="space-y-4">
      <ModeToggle mode={mode} setMode={setMode} createLabel="Créer un devis" existingLabel="Réutiliser un devis" hasExisting={devis.length > 0} />

      {mode === "create" ? (
        <>
          {!canCreate && (
            <div className="flex items-center gap-2 text-[12px] text-amber bg-amber-soft px-3 py-2 rounded-lg">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.2} />
              Crée d'abord un client (étape 1).
            </div>
          )}
          <div>
            <FieldLabel>Description produit (résumé)</FieldLabel>
            <Input value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3">
              <FieldLabel>Ligne — Libellé</FieldLabel>
              <Input value={lineLabel} onChange={(e) => setLineLabel(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Quantité</FieldLabel>
              <Input
                type="number"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value) || 1)}
              />
            </div>
            <div>
              <FieldLabel>Prix HT unitaire</FieldLabel>
              <Input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
              />
            </div>
            <div className="text-[12px] text-muted-2 flex flex-col justify-end">
              <p className="font-semibold text-ink-2 tabular-nums">
                Total HT : {(qty * unitPrice).toFixed(2)}€
              </p>
              <p className="tabular-nums">
                TTC ~ {(qty * unitPrice * 1.2).toFixed(2)}€
              </p>
            </div>
          </div>
        </>
      ) : (
        <div>
          <FieldLabel>Devis existant</FieldLabel>
          <select
            value={existingId}
            onChange={(e) => setExistingId(e.target.value)}
            className="h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[13px]"
          >
            {devis.map((d) => (
              <option key={d.id} value={d.id}>
                {d.number} — {d.client_name} ({d.total_ttc}€ TTC · {d.status})
              </option>
            ))}
          </select>
        </div>
      )}

      <Button
        variant="primary"
        size="sm"
        disabled={disabled || (mode === "create" && !canCreate)}
        onClick={() =>
          onRun(
            mode === "create"
              ? { mode, product_summary: summary, line_label: lineLabel, qty, unit_price: unitPrice }
              : { mode, existingId },
          )
        }
      >
        <Play className="h-3.5 w-3.5" strokeWidth={2.2} />
        {mode === "create" ? "Créer le devis" : "Sélectionner"}
      </Button>
    </div>
  );
}

function SimpleAction({
  onRun,
  label,
  disabled,
}: {
  onRun: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Button variant="primary" size="sm" disabled={disabled} onClick={onRun}>
      <Play className="h-3.5 w-3.5" strokeWidth={2.2} />
      {label}
    </Button>
  );
}

/**
 * Étape avec deux modes : "Simuler" (action serveur directe) ou "Mode réel"
 * (interaction utilisateur + polling). Le bouton réel est mis en avant car
 * c'est le test de référence.
 */
function DualModeAction({
  disabled,
  simulateLabel,
  simulateIcon,
  onSimulate,
  realLabel,
  realIcon,
  onReal,
  realHint,
}: {
  disabled?: boolean;
  simulateLabel: string;
  simulateIcon: React.ReactNode;
  onSimulate: () => void;
  realLabel: string;
  realIcon: React.ReactNode;
  onReal: () => void;
  realHint?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-stretch gap-2 flex-wrap">
        <Button variant="accent" size="sm" disabled={disabled} onClick={onReal}>
          {realIcon}
          {realLabel}
        </Button>
        <Button variant="secondary" size="sm" disabled={disabled} onClick={onSimulate}>
          {simulateIcon}
          {simulateLabel}
        </Button>
      </div>
      {realHint && (
        <p className="text-[11.5px] text-muted-2 max-w-2xl">
          <span className="font-semibold text-ink-2">Mode réel</span> · {realHint}
        </p>
      )}
    </div>
  );
}

function PosePlanForm({
  onRun,
  disabled,
}: {
  onRun: (p: { scheduledAt: string }) => void;
  disabled?: boolean;
}) {
  const defaultDate = useMemo(() => {
    const d = new Date(Date.now() + 5 * 86400000);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  }, []);
  const [scheduledAt, setScheduledAt] = useState(defaultDate);
  return (
    <div className="space-y-3">
      <div className="max-w-xs">
        <FieldLabel>Date & heure de pose</FieldLabel>
        <Input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
      </div>
      <Button
        variant="primary"
        size="sm"
        disabled={disabled}
        onClick={() => onRun({ scheduledAt: new Date(scheduledAt).toISOString() })}
      >
        <Play className="h-3.5 w-3.5" strokeWidth={2.2} />
        Créer + planifier la pose
      </Button>
    </div>
  );
}

function SmsForm({
  onRun,
  disabled,
}: {
  onRun: (phone: string, body: string) => void;
  disabled?: boolean;
}) {
  const [phone, setPhone] = useState(TEST_PHONE);
  const [body, setBody] = useState(
    "Bonjour, ceci est un test du canal SMS Atmosphère Tissus.",
  );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Téléphone</FieldLabel>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="text-[11.5px] text-muted-2 self-end">
          Format accepté : 06… ou +336…
        </div>
      </div>
      <div>
        <FieldLabel>Corps du SMS</FieldLabel>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-line bg-white p-2.5 text-[13px] resize-none"
        />
      </div>
      <Button variant="primary" size="sm" disabled={disabled} onClick={() => onRun(phone, body)}>
        <Play className="h-3.5 w-3.5" strokeWidth={2.2} />
        Envoyer le SMS
      </Button>
    </div>
  );
}

function EmailForm({
  onRun,
  disabled,
}: {
  onRun: (toEmail: string, subject: string, html: string) => void;
  disabled?: boolean;
}) {
  const [toEmail, setToEmail] = useState(TEST_EMAIL);
  const [subject, setSubject] = useState("Test email Atmosphère");
  const [body, setBody] = useState(
    "<p>Bonjour,</p><p>Ceci est un test du canal <strong>email</strong> Atmosphère Tissus.</p>",
  );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Destinataire</FieldLabel>
          <Input type="email" value={toEmail} onChange={(e) => setToEmail(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Sujet</FieldLabel>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
      </div>
      <div>
        <FieldLabel>Corps HTML</FieldLabel>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-line bg-white p-2.5 text-[13px] font-mono resize-none"
        />
      </div>
      <Button variant="primary" size="sm" disabled={disabled} onClick={() => onRun(toEmail, subject, body)}>
        <Play className="h-3.5 w-3.5" strokeWidth={2.2} />
        Envoyer l'email
      </Button>
    </div>
  );
}

function HistoryTab({
  runs,
  selectedRunId,
  selectedRun,
  onSelect,
  onClose,
  onDelete,
}: {
  runs: TestRunSummary[];
  selectedRunId: string | null;
  selectedRun: TestRunDetail | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  if (selectedRunId) {
    return <HistoryDetail run={selectedRun} onClose={onClose} onDelete={onDelete} />;
  }
  return (
    <section className="px-8 pt-8 pb-12">
      <p className="eyebrow mb-3">QA · Historique</p>
      <h2 className="text-[28px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
        Tests précédents
      </h2>
      <p className="text-[13.5px] text-muted max-w-2xl mb-6">
        Chaque parcours exécuté depuis l'onglet « Nouveau test » est enregistré ici
        avec les entités créées, les étapes validées et les logs détaillés.
      </p>

      {runs.length === 0 ? (
        <Card className="py-16 px-6 text-center">
          <Wand2 className="h-8 w-8 text-muted-2 mx-auto mb-3" />
          <p className="text-[13px] text-muted">Aucun test enregistré pour le moment.</p>
          <p className="text-[11.5px] text-muted-2 mt-1">
            Lance un parcours depuis l'onglet « Nouveau test » pour le voir apparaître ici.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-canvas-2/60 border-b border-line text-left">
                <th className="px-4 py-2.5 eyebrow">Démarré</th>
                <th className="px-4 py-2.5 eyebrow">Mode</th>
                <th className="px-4 py-2.5 eyebrow">Statut</th>
                <th className="px-4 py-2.5 eyebrow">Client</th>
                <th className="px-4 py-2.5 eyebrow text-right">Étapes</th>
                <th className="px-4 py-2.5 eyebrow text-right">Durée</th>
                <th className="px-4 py-2.5 eyebrow"></th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-line/60 last:border-0 hover:bg-canvas-2/30 cursor-pointer"
                  onClick={() => onSelect(r.id)}
                >
                  <td className="px-4 py-2.5 tabular-nums">
                    <div className="text-[12.5px] text-ink-2">
                      {new Date(r.startedAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </div>
                    <div className="text-[11px] text-muted-2 font-mono">
                      {new Date(r.startedAt).toLocaleTimeString("fr-FR")}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill tone={r.mode === "auto" ? "violet" : "muted"} dot={false}>
                      {r.mode === "auto" ? "Auto" : "Manuel"}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-2.5">
                    <RunStatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-2.5 text-ink-2 truncate max-w-[200px]">
                    {r.clientLabel ?? <span className="text-muted-2">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    <span className="text-emerald font-medium">{r.stepsDone}</span>
                    <span className="text-muted-2"> / {r.stepsTotal}</span>
                    {r.stepsError > 0 && (
                      <span className="ml-1.5 text-pink font-medium">!{r.stepsError}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                    {formatDuration(r.durationMs)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Supprimer ce parcours de l'historique ?")) onDelete(r.id);
                      }}
                      className="h-7 w-7 rounded-md text-muted-2 hover:text-pink hover:bg-pink-soft/50 inline-flex items-center justify-center"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </section>
  );
}

function HistoryDetail({
  run,
  onClose,
  onDelete,
}: {
  run: TestRunDetail | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  if (!run) {
    return (
      <section className="px-8 pt-8 pb-12">
        <Button variant="secondary" size="sm" onClick={onClose}>
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
          Retour à la liste
        </Button>
        <p className="text-[13px] text-muted mt-6">Chargement…</p>
      </section>
    );
  }
  return (
    <section className="px-8 pt-8 pb-12 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
            Retour
          </Button>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (confirm("Supprimer ce parcours ?")) onDelete(run.id);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
          Supprimer
        </Button>
      </div>

      <div>
        <p className="eyebrow mb-2">Parcours · {run.mode === "auto" ? "exécution automatique" : "manuelle"}</p>
        <h2 className="text-[24px] font-semibold tracking-tight text-ink leading-tight">
          Test du {new Date(run.startedAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}
        </h2>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <RunStatusBadge status={run.status} />
          <span className="text-[12.5px] text-muted tabular-nums">
            {run.stepsDone} / {run.stepsTotal} étapes
            {run.stepsError > 0 && <span className="text-pink ml-2 font-medium">{run.stepsError} en erreur</span>}
          </span>
          {run.durationMs != null && (
            <span className="text-[12.5px] text-muted tabular-nums">
              Durée : {formatDuration(run.durationMs)}
            </span>
          )}
        </div>
      </div>

      {(run.clientId || run.devisId || run.dossierId || run.poseId) && (
        <Card className="px-4 py-3">
          <p className="eyebrow mb-2">Entités créées</p>
          <div className="flex items-center gap-2 flex-wrap text-[12px]">
            {run.clientId && (
              <Link
                href={`/clients/${run.clientId}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-soft text-blue px-2.5 py-1 font-medium hover:underline"
              >
                Client · {run.clientLabel ?? run.clientId.slice(0, 8)} <ExternalLink className="h-3 w-3" />
              </Link>
            )}
            {run.devisId && (
              <Link
                href={`/devis/${run.devisId}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-pink-soft text-pink px-2.5 py-1 font-medium hover:underline"
              >
                Devis · {run.devisId.slice(0, 8)} <ExternalLink className="h-3 w-3" />
              </Link>
            )}
            {run.dossierId && (
              <Link
                href={`/confections/${run.dossierId}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-orange-soft text-orange px-2.5 py-1 font-medium hover:underline"
              >
                Dossier · {run.dossierId.slice(0, 8)} <ExternalLink className="h-3 w-3" />
              </Link>
            )}
            {run.poseId && (
              <Link
                href={`/poses/${run.poseId}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-soft text-emerald px-2.5 py-1 font-medium hover:underline"
              >
                Pose · {run.poseId.slice(0, 8)} <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </Card>
      )}

      <div>
        <h3 className="text-[15px] font-semibold mb-3">Timeline des étapes</h3>
        {run.steps.length === 0 ? (
          <p className="text-[12.5px] text-muted">Aucune étape enregistrée.</p>
        ) : (
          <div className="space-y-3">
            {run.steps.map((s, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="px-4 py-3 flex items-start gap-3">
                  <StepIcon status={s.status === "pending" ? "pending" : s.status === "running" ? "running" : s.status === "error" ? "error" : "done"} index={i + 1} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold text-ink">{s.label ?? s.key}</p>
                      <StepBadge status={s.status === "pending" ? "pending" : s.status === "running" ? "running" : s.status === "error" ? "error" : "done"} />
                      <span className="text-[10.5px] text-muted-2 tabular-nums font-mono ml-auto">
                        {new Date(s.at).toLocaleTimeString("fr-FR")}
                      </span>
                    </div>
                    {s.message && (
                      <p className="text-[12px] text-muted mt-0.5">{s.message}</p>
                    )}
                    {s.detail && (
                      <p className="text-[11.5px] text-muted-2 mt-0.5 italic">{s.detail}</p>
                    )}
                  </div>
                </div>
                {s.logs && s.logs.length > 0 && (
                  <div className="border-t border-line bg-canvas-2/20 px-4 py-3">
                    <LogsPanel logs={s.logs} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {run.notes && (
        <Card className="px-4 py-3">
          <p className="eyebrow mb-1">Notes</p>
          <p className="text-[12.5px] text-ink-2 whitespace-pre-wrap">{run.notes}</p>
        </Card>
      )}
    </section>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: "emerald" | "amber" | "pink" | "violet" | "muted" | "blue"; label: string }> = {
    success:   { tone: "emerald", label: "Succès" },
    partial:   { tone: "amber",   label: "Partiel" },
    failed:    { tone: "pink",    label: "Échec" },
    running:   { tone: "blue",    label: "En cours" },
    cancelled: { tone: "muted",   label: "Annulé" },
  };
  const m = map[status] ?? { tone: "muted" as const, label: status };
  return <StatusPill tone={m.tone}>{m.label}</StatusPill>;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = Math.round(s % 60);
  return `${m}m ${rs}s`;
}

function ModeToggle({
  mode,
  setMode,
  createLabel,
  existingLabel,
  hasExisting,
}: {
  mode: "create" | "existing";
  setMode: (m: "create" | "existing") => void;
  createLabel: string;
  existingLabel: string;
  hasExisting: boolean;
}) {
  return (
    <div className="inline-flex rounded-lg bg-canvas-2 p-1">
      <button
        onClick={() => setMode("create")}
        className={cn(
          "px-3 h-7 rounded-md text-[12px] font-medium transition-colors",
          mode === "create" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink-2",
        )}
      >
        {createLabel}
      </button>
      <button
        onClick={() => hasExisting && setMode("existing")}
        disabled={!hasExisting}
        className={cn(
          "px-3 h-7 rounded-md text-[12px] font-medium transition-colors",
          mode === "existing" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink-2",
          !hasExisting && "opacity-40 cursor-not-allowed",
        )}
      >
        {existingLabel}
      </button>
    </div>
  );
}

