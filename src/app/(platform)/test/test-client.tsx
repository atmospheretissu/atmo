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
  getTestHistory,
  type TestLog,
  type TestHistoryEntry,
} from "./actions";

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
  initialHistory,
}: {
  clients: ClientLite[];
  devis: DevisLite[];
  dossiers: DossierLite[];
  initialHistory: TestHistoryEntry[];
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
  const [history, setHistory] = useState<TestHistoryEntry[]>(initialHistory);
  const [refreshingHistory, setRefreshingHistory] = useState(false);

  const refreshHistory = () => {
    setRefreshingHistory(true);
    startTransition(async () => {
      const h = await getTestHistory(30);
      setHistory(h);
      setRefreshingHistory(false);
    });
  };

  const setStep = (key: StepKey, patch: Partial<StepState>) =>
    setSteps((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const progress = useMemo(() => {
    const done = ALL_STEPS.filter((s) => steps[s.key].status === "done").length;
    return Math.round((done / ALL_STEPS.length) * 100);
  }, [steps]);

  const reset = () => {
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
          setStep("client", { status: "error", message: "Client introuvable" });
          return;
        }
        setClientId(c.id);
        setClientLabel(`${c.display_name} · ${c.id.slice(0, 8)}…`);
        setStep("client", { status: "done", message: `Client réutilisé : ${c.display_name}` });
        setOpenStep("devis");
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
        setClientLabel(`${payload.display_name ?? "Client Test"} (nouveau)`);
        setStep("client", { status: "done", message: `Client créé · id ${r.id.slice(0, 8)}…` });
        setOpenStep("devis");
      } else {
        setStep("client", { status: "error", message: r.message });
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
          setStep("devis", { status: "error", message: "Devis introuvable" });
          return;
        }
        setDevisId(d.id);
        setDevisNumber(d.number);
        setStep("devis", {
          status: "done",
          message: `Devis réutilisé : ${d.number} (${d.total_ttc}€ TTC)`,
        });
        setOpenStep("send");
        return;
      }
      if (!clientId) {
        setStep("devis", { status: "error", message: "Crée d'abord un client (étape 1)." });
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
        setStep("devis", {
          status: "done",
          message: `Devis créé · ${r.number} · ${r.total_ttc}€ TTC`,
        });
        setOpenStep("send");
      } else {
        setStep("devis", { status: "error", message: r.message });
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
        setStep("send", {
          status: "done",
          message: r.emailedTo ? `Email envoyé à ${r.emailedTo}` : "Devis envoyé",
          logs: r.logs,
        });
        setOpenStep("validate");
      } else {
        setStep("send", { status: "error", message: r.message, logs: r.logs });
      }
      refreshHistory();
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
        setStep("validate", { status: "done", message: "Devis marqué validé" });
        setOpenStep("acompte");
      } else {
        setStep("validate", { status: "error", message: r.message });
      }
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
        setStep("acompte", {
          status: "done",
          message: `Acompte encaissé · dossier créé`,
          detail: `Dossier ${r.dossierId.slice(0, 8)}… · ${r.itemCount} items · ${r.bcCount} BC fournisseurs auto-générés`,
          logs: r.logs,
        });
        setOpenStep("reception");
      } else {
        setStep("acompte", { status: "error", message: r.message, logs: r.logs });
      }
      refreshHistory();
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
        setStep("reception", {
          status: "done",
          message: `${r.received} colis reçus (${r.skipped} déjà reçus)`,
          detail: `Total items du dossier : ${r.total} · QR codes scannés en cascade`,
          logs: r.logs,
        });
        setOpenStep("pose-plan");
      } else {
        setStep("reception", { status: "error", message: r.message, logs: r.logs });
      }
      refreshHistory();
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
        setStep("pose-plan", {
          status: "done",
          message: `Pose planifiée le ${new Date(payload.scheduledAt).toLocaleString("fr-FR")}`,
        });
        setOpenStep("pose-done");
      } else {
        setStep("pose-plan", { status: "error", message: r.message });
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
        setStep("pose-done", {
          status: "done",
          message: "Pose marquée effectuée · SMS satisfaction déclenché",
          logs: r.logs,
        });
        setOpenStep("solde");
      } else {
        setStep("pose-done", { status: "error", message: r.message, logs: r.logs });
      }
      refreshHistory();
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
        setStep("solde", {
          status: "done",
          message: `Solde encaissé · ${Math.round(r.amount)}€`,
          logs: r.logs,
        });
        setOpenStep("sms-libre");
      } else {
        setStep("solde", { status: "error", message: r.message, logs: r.logs });
      }
      refreshHistory();
    });
  };

  const runSmsLibre = (phone: string, body: string) => {
    setStep("sms-libre", { status: "running" });
    startTransition(async () => {
      const r = await testSendCustomSms({ phone, body });
      if (r.ok) {
        setStep("sms-libre", {
          status: "done",
          message: `SMS envoyé à ${phone}`,
          detail: r.messageId ? `Brevo ID : ${r.messageId}` : undefined,
          logs: [{ level: "success", label: `SMS envoyé à ${phone}`, detail: r.messageId ? `Brevo ID : ${r.messageId}` : undefined }],
        });
        setOpenStep("email-libre");
      } else {
        setStep("sms-libre", {
          status: "error",
          message: r.message,
          logs: [{ level: "error", label: "Échec envoi SMS", detail: r.message }],
        });
      }
      refreshHistory();
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
        setStep("email-libre", {
          status: "done",
          message: `Email envoyé à ${toEmail}`,
          detail: r.messageId ? `Brevo ID : ${r.messageId}` : undefined,
          logs: [{ level: "success", label: `Email envoyé à ${toEmail}`, detail: r.messageId ? `Brevo ID : ${r.messageId}` : undefined }],
        });
      } else {
        setStep("email-libre", {
          status: "error",
          message: r.message,
          logs: [{ level: "error", label: "Échec envoi email", detail: r.message }],
        });
      }
      refreshHistory();
    });
  };

  // ──────────────────────────────── AUTO RUN (full path) ────────────────────

  const autoRun = () => {
    setAutoRunning(true);
    reset();
    startTransition(async () => {
      // 1. Client
      setStep("client", { status: "running" });
      const c = await testCreateClient({
        display_name: `Client Test ${new Date().toLocaleTimeString("fr-FR")}`,
        email: TEST_EMAIL,
        phone: TEST_PHONE,
        channel: "magasin",
        city: "Bordeaux",
      });
      if (!c.ok) {
        setStep("client", { status: "error", message: c.message });
        setAutoRunning(false);
        return;
      }
      setClientId(c.id);
      setClientLabel("Client Test (auto)");
      setStep("client", { status: "done", message: `Client créé · ${c.id.slice(0, 8)}…` });

      // 2. Devis
      setStep("devis", { status: "running" });
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
        setStep("devis", { status: "error", message: d.message });
        setAutoRunning(false);
        return;
      }
      setDevisId(d.id);
      setDevisNumber(d.number);
      setStep("devis", { status: "done", message: `${d.number} · ${d.total_ttc}€ TTC` });

      // 3. Envoi
      setStep("send", { status: "running" });
      const s = await testSendDevis(d.id);
      setStep("send", s.ok ? { status: "done", message: "Envoi OK" } : { status: "error", message: s.message });
      if (!s.ok) {
        setAutoRunning(false);
        return;
      }

      // 4. Validation
      setStep("validate", { status: "running" });
      const v = await testValidateDevis(d.id);
      setStep("validate", v.ok ? { status: "done", message: "Validé" } : { status: "error", message: v.message });
      if (!v.ok) {
        setAutoRunning(false);
        return;
      }

      // 5. Acompte
      setStep("acompte", { status: "running" });
      const a = await testMarkAcomptePaid(d.id);
      if (!a.ok) {
        setStep("acompte", { status: "error", message: a.message });
        setAutoRunning(false);
        return;
      }
      setDossierId(a.dossierId);
      setStep("acompte", {
        status: "done",
        message: `Acompte OK · dossier ${a.dossierId.slice(0, 8)}…`,
        detail: `${a.itemCount} items · ${a.bcCount} BC`,
      });

      // 6. Réception
      setStep("reception", { status: "running" });
      const r = await testReceiveAllItems(a.dossierId);
      if (!r.ok) {
        setStep("reception", { status: "error", message: r.message });
        setAutoRunning(false);
        return;
      }
      setStep("reception", {
        status: "done",
        message: `${r.received} colis reçus`,
        detail: `Total ${r.total}`,
      });

      // 7. Pose planifiée
      setStep("pose-plan", { status: "running" });
      const inFiveDays = new Date(Date.now() + 5 * 86400000);
      inFiveDays.setHours(10, 0, 0, 0);
      const p = await testCreateAndSchedulePose(a.dossierId, inFiveDays.toISOString());
      if (!p.ok) {
        setStep("pose-plan", { status: "error", message: p.message });
        setAutoRunning(false);
        return;
      }
      setPoseId(p.poseId);
      setStep("pose-plan", {
        status: "done",
        message: `Planifiée le ${inFiveDays.toLocaleString("fr-FR")}`,
      });

      // 8. Pose effectuée
      setStep("pose-done", { status: "running" });
      const pd = await testMarkPoseDone(p.poseId);
      setStep("pose-done", pd.ok ? { status: "done", message: "Pose effectuée" } : { status: "error", message: pd.message });
      if (!pd.ok) {
        setAutoRunning(false);
        return;
      }

      // 9. Solde
      setStep("solde", { status: "running" });
      const so = await testMarkSoldePaid(d.id);
      setStep("solde", so.ok ? { status: "done", message: `Solde ${Math.round(so.amount)}€` } : { status: "error", message: so.message });

      // 10. SMS libre
      setStep("sms-libre", { status: "running" });
      const sms = await testSendCustomSms({
        phone: TEST_PHONE,
        body: "Test parcours complet — toutes les étapes ont été exécutées sur la plateforme Atmosphère.",
      });
      setStep("sms-libre", sms.ok ? { status: "done", message: `Envoyé à ${TEST_PHONE}` } : { status: "error", message: sms.message });

      // 11. Email libre
      setStep("email-libre", { status: "running" });
      const em = await testSendCustomEmail({
        toEmail: TEST_EMAIL,
        subject: "Atmosphère — test parcours complet",
        htmlBody: `<p>Bonjour,</p><p>Le parcours de test a été exécuté avec succès :</p><ul><li>Client créé</li><li>Devis ${d.number} envoyé puis validé</li><li>Acompte + solde encaissés</li><li>Colis reçus + pose effectuée</li></ul><p>— Plateforme Atmosphère</p>`,
      });
      setStep("email-libre", em.ok ? { status: "done", message: `Envoyé à ${TEST_EMAIL}` } : { status: "error", message: em.message });

      setOpenStep("email-libre");
      setAutoRunning(false);
    });
  };

  // ──────────────────────────────── RENDER ──────────────────────────────────

  return (
    <>
      <Topbar
        breadcrumb={[{ label: "Atmosphère" }, { label: "Test parcours" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={reset} disabled={pending || autoRunning}>
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.2} />
              Réinitialiser
            </Button>
            <Button variant="accent" size="sm" onClick={autoRun} disabled={pending || autoRunning}>
              <Wand2 className="h-3.5 w-3.5" strokeWidth={2.2} />
              Lancer le parcours complet
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">QA · Simulation bout-en-bout</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Test parcours complet
          </h1>
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
            <SimpleAction onRun={runAcompte} label="Encaisser l'acompte (virement)" disabled={pending || autoRunning || !devisId} />
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
            <SimpleAction onRun={runReception} label="Scanner tous les colis" disabled={pending || autoRunning || !dossierId} />
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
            <SimpleAction onRun={runPoseDone} label="Marquer la pose effectuée" disabled={pending || autoRunning || !poseId} />
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

          <HistorySection
            history={history}
            refreshing={refreshingHistory}
            onRefresh={refreshHistory}
          />

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

function HistorySection({
  history,
  refreshing,
  onRefresh,
}: {
  history: TestHistoryEntry[];
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Historique des envois (SMS + email)</CardTitle>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RotateCcw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} strokeWidth={2.2} />
          {refreshing ? "Rafraîchissement…" : "Rafraîchir"}
        </Button>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-[12.5px] text-muted text-center py-6">
            Aucun envoi enregistré pour le moment.
          </p>
        ) : (
          <div className="rounded-lg border border-line overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-canvas-2/60 border-b border-line text-left">
                  <th className="px-3 py-2 font-semibold text-muted-2 text-[10.5px] uppercase tracking-wider">Quand</th>
                  <th className="px-3 py-2 font-semibold text-muted-2 text-[10.5px] uppercase tracking-wider">Canal</th>
                  <th className="px-3 py-2 font-semibold text-muted-2 text-[10.5px] uppercase tracking-wider">Destinataire</th>
                  <th className="px-3 py-2 font-semibold text-muted-2 text-[10.5px] uppercase tracking-wider">Sujet / Corps</th>
                  <th className="px-3 py-2 font-semibold text-muted-2 text-[10.5px] uppercase tracking-wider">Source / Event</th>
                  <th className="px-3 py-2 font-semibold text-muted-2 text-[10.5px] uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-line/60 last:border-0 hover:bg-canvas-2/30">
                    <td className="px-3 py-2 text-muted tabular-nums whitespace-nowrap">
                      {new Date(h.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" })}
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill tone={h.channel === "sms" ? "violet" : "blue"} dot={false}>
                        {h.channel === "sms" ? "SMS" : "Email"}
                      </StatusPill>
                    </td>
                    <td className="px-3 py-2 font-mono text-ink-2 truncate max-w-[180px]">{h.to}</td>
                    <td className="px-3 py-2 text-muted truncate max-w-[220px]" title={h.preview}>{h.preview}</td>
                    <td className="px-3 py-2 text-muted-2 text-[11px]">
                      {h.triggerSource ? <span className="font-mono">{h.triggerSource}</span> : "—"}
                      {h.eventKey && <span className="block text-violet font-mono">{h.eventKey}</span>}
                    </td>
                    <td className="px-3 py-2">
                      <HistoryStatusBadge status={h.status} error={h.error} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryStatusBadge({ status, error }: { status: string; error: string | null }) {
  const tone: "emerald" | "amber" | "pink" | "muted" | "blue" =
    status === "sent" || status === "delivered"
      ? "emerald"
      : status === "pending"
        ? "blue"
        : status === "skipped"
          ? "amber"
          : status === "failed" || status === "bounced"
            ? "pink"
            : "muted";
  return (
    <div title={error ?? undefined} className="inline-flex">
      <StatusPill tone={tone} dot={false}>
        {status}
      </StatusPill>
    </div>
  );
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

