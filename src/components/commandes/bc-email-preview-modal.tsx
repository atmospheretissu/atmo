"use client";

import { useEffect, useState } from "react";
import { X, Mail, Send, Loader2, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorChip } from "@/components/ui/status-pill";
import {
  getBcEmailPreviewAction,
  sendBcByEmailAction,
  type BcEmailPreview,
  type SendBcEmailResult,
} from "@/app/(platform)/commandes/email-actions";

export function BcEmailPreviewModal({
  bcId,
  onClose,
  onSent,
}: {
  bcId: string;
  onClose: () => void;
  onSent: (result: SendBcEmailResult) => void;
}) {
  const [preview, setPreview] = useState<BcEmailPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await getBcEmailPreviewAction(bcId);
      if (!cancelled) {
        setPreview(p);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bcId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !sending) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, sending]);

  const handleSend = async () => {
    setSendError(null);
    setSending(true);
    const result = await sendBcByEmailAction(bcId);
    setSending(false);
    if (result.ok) {
      onSent(result);
      onClose();
    } else {
      setSendError(result.message);
      // Pour les "skipped" (ex: Brevo non configuré), on remonte au parent quand même
      if (result.skipped) {
        onSent(result);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-ink/40 backdrop-blur-sm p-4 sm:p-6 md:p-10">
      <div className="bg-canvas w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-line">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <ColorChip tone="blue" size="md">
              <Mail className="h-4 w-4" strokeWidth={2.4} />
            </ColorChip>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-ink leading-tight">
                Vérifier puis envoyer
              </p>
              <p className="text-[12px] text-muted leading-tight mt-0.5">
                {preview && preview.ok
                  ? `${preview.bcNumber} → ${preview.supplierName}`
                  : "Chargement…"}
              </p>
            </div>
          </div>
          <button
            onClick={() => !sending && onClose()}
            disabled={sending}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-canvas-2 text-muted hover:text-ink transition-colors disabled:opacity-40"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-canvas-2/30">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 text-muted animate-spin" />
            </div>
          )}

          {!loading && preview && !preview.ok && (
            <div className="px-6 py-10 text-center">
              <ColorChip tone="pink" size="lg" className="mx-auto mb-3">
                <AlertTriangle className="h-5 w-5" strokeWidth={2.4} />
              </ColorChip>
              <p className="text-[14px] font-semibold text-ink">{preview.message}</p>
            </div>
          )}

          {!loading && preview && preview.ok && (
            <div className="p-6 space-y-5">
              {/* Email card */}
              <section className="bg-white border border-line rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-line bg-canvas-2/40">
                  <p className="eyebrow mb-2">Email</p>
                  <div className="space-y-1 text-[12.5px]">
                    <FieldRow label="À">
                      {preview.supplierEmail ? (
                        <span className="font-mono text-ink-2">
                          {preview.supplierEmail}
                          <span className="ml-2 text-muted-2 font-sans">({preview.supplierName})</span>
                        </span>
                      ) : (
                        <span className="text-pink font-semibold">
                          ⚠ Aucun email renseigné pour {preview.supplierName}
                        </span>
                      )}
                    </FieldRow>
                    <FieldRow label="Sujet">
                      <span className="text-ink-2 font-medium">{preview.subject}</span>
                    </FieldRow>
                    <FieldRow label="Pièce jointe">
                      <span className="inline-flex items-center gap-1.5 text-ink-2">
                        <FileText className="h-3.5 w-3.5 text-muted-2" />
                        <span className="font-mono">{preview.bcNumber}.pdf</span>
                      </span>
                    </FieldRow>
                  </div>
                </div>
                <div
                  className="bg-white"
                  dangerouslySetInnerHTML={{ __html: preview.html }}
                />
              </section>

              {/* PDF preview */}
              <section className="bg-white border border-line rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-line bg-canvas-2/40 flex items-center justify-between">
                  <div>
                    <p className="eyebrow mb-0.5">Pièce jointe — aperçu PDF</p>
                    <p className="text-[11.5px] text-muted">{preview.bcNumber}.pdf</p>
                  </div>
                  <a
                    href={preview.pdfUrl}
                    target="_blank"
                    rel="noopener"
                    className="text-[11.5px] text-violet-strong hover:underline"
                  >
                    Ouvrir dans un nouvel onglet ↗
                  </a>
                </div>
                <iframe
                  src={preview.pdfUrl}
                  className="w-full h-[600px] bg-canvas-2"
                  title="Aperçu PDF du bon de commande"
                />
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line bg-white shrink-0 flex items-center justify-between gap-3 flex-wrap">
          {sendError ? (
            <p className="text-[12.5px] text-pink flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> {sendError}
            </p>
          ) : isSandboxEnv() ? (
            <p className="text-[12px] text-amber font-medium flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Mode recette — aucun email réel ne sera envoyé (simulation).
            </p>
          ) : (
            <p className="text-[12px] text-muted">
              {preview && preview.ok && preview.supplierEmail
                ? "Le PDF sera envoyé en pièce jointe au fournisseur via Brevo."
                : "Vérifie le destinataire avant d'envoyer."}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="md" onClick={onClose} disabled={sending}>
              Annuler
            </Button>
            <Button
              variant="accent"
              size="md"
              onClick={handleSend}
              disabled={loading || sending || !(preview && preview.ok)}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Envoi…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" strokeWidth={2.4} /> Confirmer et envoyer
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function isSandboxEnv(): boolean {
  const env = (process.env.NEXT_PUBLIC_APP_ENV ?? "").toLowerCase();
  return env !== "" && env !== "prod" && env !== "production";
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-[10.5px] uppercase tracking-wider text-muted-2 font-semibold w-20 shrink-0">
        {label}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}
