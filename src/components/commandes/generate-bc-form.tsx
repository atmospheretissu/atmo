"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle, Package, Loader2, ArrowRight, Send, Mail, SkipForward } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ColorChip, StatusPill } from "@/components/ui/status-pill";
import { eur } from "@/lib/formatters";
import { createBcsFromDevisAction, dismissBcAction, advanceDossierFromCommandeAction } from "@/app/(platform)/commandes/actions";
import { sendBcByEmailAction, type SendBcEmailResult } from "@/app/(platform)/commandes/email-actions";
import { BcEmailPreviewModal } from "@/components/commandes/bc-email-preview-modal";
import type { DevisLineForBc, SupplierStub, CreateBcsResult, ExistingBc } from "@/lib/db/bcs-from-devis";

const UNASSIGNED = "__unassigned__";

export function GenerateBcForm({
  devisId,
  devisNumber,
  dossierId = null,
  lines,
  suppliers,
  existingBcs = [],
}: {
  devisId: string;
  devisNumber: string;
  dossierId?: string | null;
  lines: DevisLineForBc[];
  suppliers: SupplierStub[];
  existingBcs?: ExistingBc[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CreateBcsResult | null>(null);

  // Si des BCs existent déjà pour ce devis (via le dossier rattaché), on
  // affiche la vue de gestion à la place du formulaire — évite de générer
  // des BCs en doublon à chaque revisite.
  if (existingBcs.length > 0 && !result) {
    return (
      <CreatedBcsView
        bcs={existingBcs.map((b) => ({
          supplierId: b.supplier_id ?? "?",
          supplierName: b.supplier_name ?? "—",
          bcId: b.id,
          bcNumber: b.number,
          lineCount: b.line_count,
          alreadySent: b.status === "envoye" || b.status === "confirme" || b.status === "expedie" || b.status === "recu",
        }))}
        skippedLineCount={0}
        devisNumber={devisNumber}
        dossierId={dossierId}
        onBackToList={() => router.push("/confections")}
        onOpenBc={(id) => router.push(`/commandes/${id}`)}
      />
    );
  }

  // Map lineId → supplierId | UNASSIGNED
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const l of lines) {
      init[l.id] = l.supplier_id ?? UNASSIGNED;
    }
    return init;
  });

  const grouped = useMemo(() => {
    const map = new Map<string, DevisLineForBc[]>();
    const unassigned: DevisLineForBc[] = [];
    for (const l of lines) {
      const sid = assignments[l.id] ?? UNASSIGNED;
      if (sid === UNASSIGNED) unassigned.push(l);
      else {
        if (!map.has(sid)) map.set(sid, []);
        map.get(sid)!.push(l);
      }
    }
    return { bySupplier: map, unassigned };
  }, [lines, assignments]);

  const supplierById = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);
  const totalLines = lines.length;
  const assignedLines = totalLines - grouped.unassigned.length;
  const supplierCount = grouped.bySupplier.size;
  const totalAmount = lines.reduce((s, l) => s + l.qty * l.unit_price_ht, 0);

  function setLineSupplier(lineId: string, supplierId: string) {
    setAssignments((prev) => ({ ...prev, [lineId]: supplierId }));
  }

  function applySupplierToAll(supplierId: string) {
    const next: Record<string, string> = {};
    for (const l of lines) next[l.id] = supplierId;
    setAssignments(next);
  }

  const handleSubmit = () => {
    if (supplierCount === 0) return;
    startTransition(async () => {
      // Convert UNASSIGNED → null for the server
      const serverAssignments: Record<string, string | null> = {};
      for (const [lineId, sid] of Object.entries(assignments)) {
        serverAssignments[lineId] = sid === UNASSIGNED ? null : sid;
      }
      const r = await createBcsFromDevisAction(devisId, serverAssignments);
      setResult(r);
    });
  };

  // ===== Résultat post-création =====
  if (result?.ok && result.bcs.length > 0) {
    return (
      <CreatedBcsView
        bcs={result.bcs}
        skippedLineCount={result.skippedLineCount}
        devisNumber={devisNumber}
        dossierId={dossierId}
        onBackToList={() => router.push("/confections")}
        onOpenBc={(id) => router.push(`/commandes/${id}`)}
      />
    );
  }

  // ===== Form principal =====
  return (
    <div className="space-y-4">
      {/* Récap top */}
      <Card className="px-5 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6 text-[13px]">
            <Stat label="Lignes" value={String(totalLines)} />
            <Stat label="Attribuées" value={String(assignedLines)} tone={assignedLines === totalLines ? "emerald" : assignedLines === 0 ? "amber" : "blue"} />
            <Stat label="Fournisseurs" value={String(supplierCount)} tone="blue" />
            <Stat label="Total HT" value={eur(totalAmount, true)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11.5px] text-muted">Attribuer tout à&nbsp;:</label>
            <select
              className="h-8 text-[12.5px] border border-line rounded-md bg-white px-2"
              defaultValue=""
              onChange={(e) => { if (e.target.value) applySupplierToAll(e.target.value); }}
            >
              <option value="" disabled>Choisir un fournisseur…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Sections par fournisseur */}
      {Array.from(grouped.bySupplier).map(([supplierId, supplierLines]) => {
        const sup = supplierById.get(supplierId);
        const subtotal = supplierLines.reduce((s, l) => s + l.qty * l.unit_price_ht, 0);
        return (
          <SupplierSection
            key={supplierId}
            title={sup?.name ?? "?"}
            subtitle={`${supplierLines.length} ligne${supplierLines.length > 1 ? "s" : ""} · ${eur(subtotal, true)} HT`}
            tone="blue"
          >
            {supplierLines.map((l) => (
              <LineRow key={l.id} line={l} suppliers={suppliers} value={assignments[l.id]} onChange={(v) => setLineSupplier(l.id, v)} />
            ))}
          </SupplierSection>
        );
      })}

      {/* Section "Sans fournisseur" toujours présente */}
      <SupplierSection
        title="Sans fournisseur"
        subtitle={grouped.unassigned.length > 0 ? `${grouped.unassigned.length} ligne(s) — ne sera PAS incluse dans un BC` : "Aucune ligne à attribuer"}
        tone="amber"
        icon={AlertTriangle}
      >
        {grouped.unassigned.length === 0 ? (
          <p className="text-[12.5px] text-muted-2 px-1 py-2">Toutes les lignes sont attribuées 🎉</p>
        ) : (
          grouped.unassigned.map((l) => (
            <LineRow key={l.id} line={l} suppliers={suppliers} value={assignments[l.id]} onChange={(v) => setLineSupplier(l.id, v)} />
          ))
        )}
      </SupplierSection>

      {/* Footer actions */}
      <Card className="px-5 py-4 sticky bottom-4 shadow-lg">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-[13px] text-ink">
            {supplierCount > 0 ? (
              <>
                <strong className="text-ink">
                  {supplierCount} bon{supplierCount > 1 ? "s" : ""} de commande
                </strong> seront créés · <span className="text-muted">{assignedLines}/{totalLines} lignes incluses</span>
              </>
            ) : (
              <span className="text-amber font-medium">Attribue au moins une ligne à un fournisseur pour générer un BC.</span>
            )}
          </div>
          <Button
            variant="accent"
            size="md"
            disabled={pending || supplierCount === 0}
            onClick={handleSubmit}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" strokeWidth={2.4} />}
            Créer {supplierCount > 0 ? `${supplierCount} ` : ""}bon{supplierCount > 1 ? "s" : ""} de commande
          </Button>
        </div>
        {result && !result.ok && (
          <p className="text-[12.5px] text-pink mt-3">✗ {result.message}</p>
        )}
      </Card>
    </div>
  );
}

/* ============================================================
   Vue post-création : permet d'envoyer chaque BC par email
   ============================================================ */

type CreatedBc = {
  supplierId: string;
  supplierName: string;
  bcId: string;
  bcNumber: string;
  lineCount: number;
  alreadySent?: boolean;
};

type SendState = {
  status: "idle" | "pending" | "sent" | "failed" | "skipped" | "dismissed";
  message?: string;
  emailedTo?: string;
};

function CreatedBcsView({
  bcs,
  skippedLineCount,
  devisNumber,
  dossierId,
  onBackToList,
  onOpenBc,
}: {
  bcs: CreatedBc[];
  skippedLineCount: number;
  devisNumber: string;
  dossierId: string | null;
  onBackToList: () => void;
  onOpenBc: (id: string) => void;
}) {
  const [sendStates, setSendStates] = useState<Record<string, SendState>>(() => {
    const init: Record<string, SendState> = {};
    for (const b of bcs) {
      init[b.bcId] = b.alreadySent ? { status: "sent" } : { status: "idle" };
    }
    return init;
  });
  const [bulkPending, setBulkPending] = useState(false);
  const [previewBcId, setPreviewBcId] = useState<string | null>(null);
  const [advancePending, setAdvancePending] = useState(false);
  const [advanceDone, setAdvanceDone] = useState(false);

  const updateState = (bcId: string, s: SendState) =>
    setSendStates((prev) => ({ ...prev, [bcId]: s }));

  const applySendResult = (bcId: string, r: SendBcEmailResult) => {
    if (r.ok) {
      updateState(bcId, { status: "sent", emailedTo: r.emailedTo });
    } else {
      updateState(bcId, {
        status: r.skipped ? "skipped" : "failed",
        message: r.message,
      });
    }
  };

  const sendOne = async (bcId: string) => {
    updateState(bcId, { status: "pending" });
    const r = await sendBcByEmailAction(bcId);
    applySendResult(bcId, r);
  };

  const dismissOne = async (bcId: string, supplierName: string) => {
    if (!confirm(`Marquer la commande à ${supplierName} comme inutile et la supprimer ?`)) return;
    updateState(bcId, { status: "pending" });
    const r = await dismissBcAction(bcId);
    if (r.ok) {
      updateState(bcId, { status: "dismissed" });
    } else {
      updateState(bcId, { status: "failed", message: r.message });
    }
  };

  const sendAll = async () => {
    setBulkPending(true);
    const pending = bcs.filter(
      (b) => sendStates[b.bcId]?.status === "idle" || sendStates[b.bcId]?.status === "failed",
    );
    await Promise.all(pending.map((b) => sendOne(b.bcId)));
    setBulkPending(false);
  };

  const visibleBcs = bcs.filter((b) => sendStates[b.bcId]?.status !== "dismissed");
  const totalSent = visibleBcs.filter((b) => sendStates[b.bcId]?.status === "sent").length;
  const totalActionable = visibleBcs.filter((b) => {
    const s = sendStates[b.bcId]?.status;
    return s === "idle" || s === "failed";
  }).length;
  const totalDismissed = bcs.length - visibleBcs.length;

  return (
    <div className="space-y-4">
      <Card className="p-6 border-emerald/30 bg-emerald-soft/30">
        <div className="flex items-start gap-3">
          <ColorChip tone="emerald" size="lg">
            <CheckCircle2 className="h-5 w-5" strokeWidth={2.4} />
          </ColorChip>
          <div className="flex-1">
            <h3 className="text-[16px] font-semibold text-ink mb-1">
              {bcs.length} bon{bcs.length > 1 ? "s" : ""} de commande créé
              {bcs.length > 1 ? "s" : ""}
            </h3>
            <p className="text-[13px] text-muted">
              Issus du devis <strong className="text-ink">{devisNumber}</strong>.
              {skippedLineCount > 0 && (
                <> {skippedLineCount} ligne(s) ignorée(s) (sans fournisseur).</>
              )}
            </p>
          </div>
        </div>
      </Card>

      <Card className="px-5 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-[13px] text-ink">
            <strong>{totalSent}/{visibleBcs.length}</strong>{" "}
            <span className="text-muted">
              envoyé{totalSent > 1 ? "s" : ""}
            </span>
            {totalDismissed > 0 && (
              <span className="ml-2 text-muted-2">
                · {totalDismissed} ignoré{totalDismissed > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <Button
            variant="accent"
            size="md"
            disabled={bulkPending || totalActionable === 0}
            onClick={sendAll}
          >
            {bulkPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" strokeWidth={2.4} />
            )}
            Envoyer tous les bons de commande
          </Button>
        </div>
      </Card>

      <div className="space-y-2">
        {visibleBcs.map((bc) => {
          const state = sendStates[bc.bcId] ?? { status: "idle" };
          return (
            <Card
              key={bc.bcId}
              className="px-5 py-4 flex items-center justify-between hover:bg-canvas-2/40 transition-colors gap-3 flex-wrap"
            >
              <div className="flex items-center gap-3 min-w-0">
                <ColorChip
                  tone={state.status === "sent" ? "emerald" : "blue"}
                  size="md"
                >
                  {state.status === "sent" ? (
                    <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />
                  ) : (
                    <Package className="h-4 w-4" strokeWidth={2.4} />
                  )}
                </ColorChip>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-ink">
                    {bc.supplierName}
                  </p>
                  <p className="text-[12px] text-muted">
                    BC {bc.bcNumber} · {bc.lineCount} ligne
                    {bc.lineCount > 1 ? "s" : ""}
                  </p>
                  {state.status === "sent" && state.emailedTo && (
                    <p className="text-[11.5px] text-emerald mt-0.5">
                      ✓ Envoyé à {state.emailedTo}
                    </p>
                  )}
                  {(state.status === "failed" || state.status === "skipped") && (
                    <p
                      className={
                        "text-[11.5px] mt-0.5 " +
                        (state.status === "skipped" ? "text-amber" : "text-pink")
                      }
                    >
                      {state.status === "skipped" ? "⚠ " : "✗ "}
                      {state.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {state.status !== "sent" && state.status !== "pending" && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setPreviewBcId(bc.bcId)}
                    >
                      <Mail className="h-3.5 w-3.5" strokeWidth={2.4} />
                      Visualiser puis envoyer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissOne(bc.bcId, bc.supplierName)}
                      title="Pas de commande nécessaire — retirer cette ligne"
                    >
                      <SkipForward className="h-3.5 w-3.5" strokeWidth={2.4} />
                      Ignorer
                    </Button>
                  </>
                )}
                {(state.status === "sent" || state.status === "pending") && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled
                  >
                    {state.status === "pending" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {state.status === "sent" ? "Envoyé" : "Envoi…"}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenBc(bc.bcId)}
                >
                  Ouvrir <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Cas : toutes les commandes ignorées (rien à envoyer) → CTA pour
          basculer manuellement le dossier en attente_matiere */}
      {visibleBcs.length === 0 && bcs.length > 0 && dossierId && !advanceDone && (
        <Card className="p-5 border-amber/30 bg-amber-soft/30">
          <div className="flex items-start gap-3">
            <ColorChip tone="amber" size="lg">
              <SkipForward className="h-5 w-5" strokeWidth={2.4} />
            </ColorChip>
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-ink mb-1">
                Aucune commande à passer
              </h3>
              <p className="text-[13px] text-muted mb-3">
                Toutes les commandes ont été marquées comme inutiles. Bascule le
                dossier directement à l&apos;étape suivante pour démarrer la confection.
              </p>
              <Button
                variant="accent"
                size="md"
                disabled={advancePending}
                onClick={async () => {
                  setAdvancePending(true);
                  const r = await advanceDossierFromCommandeAction(dossierId);
                  setAdvancePending(false);
                  if (r.ok) {
                    setAdvanceDone(true);
                  } else {
                    alert(`Échec : ${r.message}`);
                  }
                }}
              >
                {advancePending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                )}
                Passer à la prochaine étape
              </Button>
            </div>
          </div>
        </Card>
      )}

      {advanceDone && (
        <Card className="p-5 border-emerald/30 bg-emerald-soft/30">
          <div className="flex items-center gap-3">
            <ColorChip tone="emerald" size="lg">
              <CheckCircle2 className="h-5 w-5" strokeWidth={2.4} />
            </ColorChip>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-ink">
                Dossier basculé en attente matière
              </p>
              <p className="text-[12.5px] text-muted">
                Tu peux maintenant le suivre dans le kanban Suivi de commande.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="pt-3">
        <Button variant="secondary" size="md" onClick={onBackToList}>
          Retour au suivi de commande
        </Button>
      </div>

      {previewBcId && (
        <BcEmailPreviewModal
          bcId={previewBcId}
          onClose={() => setPreviewBcId(null)}
          onSent={(r) => applySendResult(previewBcId, r)}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "amber" | "blue";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald"
      : tone === "amber"
        ? "text-amber"
        : tone === "blue"
          ? "text-blue"
          : "text-ink";
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wider text-muted-2 font-semibold">{label}</p>
      <p className={`text-[18px] font-semibold tabular-nums leading-tight ${color}`}>{value}</p>
    </div>
  );
}

function SupplierSection({
  title,
  subtitle,
  tone,
  icon: Icon = Package,
  children,
}: {
  title: string;
  subtitle: string;
  tone: "blue" | "amber";
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className={`px-5 py-3 flex items-center justify-between border-b border-line ${tone === "amber" ? "bg-amber-soft/30" : "bg-canvas-2/40"}`}>
        <div className="flex items-center gap-3">
          <ColorChip tone={tone} size="md"><Icon className="h-4 w-4" strokeWidth={2.4} /></ColorChip>
          <div>
            <p className="text-[14px] font-semibold text-ink leading-tight">{title}</p>
            <p className="text-[11.5px] text-muted leading-tight mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="divide-y divide-line">
        {children}
      </div>
    </Card>
  );
}

function LineRow({
  line,
  suppliers,
  value,
  onChange,
}: {
  line: DevisLineForBc;
  suppliers: SupplierStub[];
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="px-5 py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[13px] font-semibold text-ink truncate">{line.label}</p>
          {line.ref && <span className="font-mono text-[11px] text-muted-2">{line.ref}</span>}
        </div>
        <p className="text-[11.5px] text-muted truncate">
          {line.qty} {line.unit_label} × {eur(line.unit_price_ht)} = <strong className="text-ink-2">{eur(line.qty * line.unit_price_ht)}</strong>
          {line.detail && <span className="ml-2 text-muted-2">· {line.detail}</span>}
        </p>
      </div>
      <select
        className="h-8 text-[12px] border border-line rounded-md bg-white px-2 min-w-[160px]"
        value={value ?? UNASSIGNED}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value={UNASSIGNED}>— Sans fournisseur —</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  );
}
