"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Camera,
  Keyboard,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorChip } from "@/components/ui/status-pill";
import { receiveByQrAction, type ReceiveResult } from "@/app/(platform)/reception/actions";

const SCANNER_ID = "qr-reader-element";

export function QrScanner() {
  const [mode, setMode] = useState<"camera" | "manual">("manual");
  const [cameraActive, setCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [feedback, setFeedback] = useState<ReceiveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const lastScanned = useRef<string>("");
  const cooldown = useRef<number>(0);
  const scannerRef = useRef<unknown>(null);

  // Trigger scan handler — async
  const handleScan = (code: string) => {
    const now = Date.now();
    // Debounce : same code within 3s = ignored
    if (code === lastScanned.current && now - cooldown.current < 3000) return;
    lastScanned.current = code;
    cooldown.current = now;
    startTransition(async () => {
      try {
        const result = await receiveByQrAction(code);
        setFeedback(result);
        setError(null);
        // Vibrate feedback on mobile
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate(result.ok ? 100 : [50, 50, 50]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur réseau");
      }
    });
  };

  // Camera scanner — dynamic import (lib is client-only)
  useEffect(() => {
    if (mode !== "camera" || !cameraActive) return;
    let stopped = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (vw: number, vh: number) => {
              const m = Math.min(vw, vh);
              return { width: m * 0.7, height: m * 0.7 };
            },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!stopped) handleScan(decodedText);
          },
          () => {
            /* ignore scan errors */
          }
        );
      } catch (e) {
        setError(
          e instanceof Error
            ? `Caméra : ${e.message}`
            : "Impossible d'activer la caméra. Vérifie les autorisations du navigateur."
        );
        setCameraActive(false);
      }
    })();

    return () => {
      stopped = true;
      const s = scannerRef.current as { stop?: () => Promise<void> } | null;
      if (s?.stop) {
        s.stop().catch(() => {});
      }
    };
  }, [mode, cameraActive]);

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScan(manualCode.trim().toUpperCase());
    setManualCode("");
  };

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="inline-flex rounded-lg border border-line bg-white p-0.5">
        <button
          onClick={() => {
            setMode("manual");
            setCameraActive(false);
          }}
          className={
            "h-8 px-3 rounded-md text-[12.5px] font-medium inline-flex items-center gap-1.5 transition-colors " +
            (mode === "manual" ? "bg-canvas-2 text-ink" : "text-muted hover:text-ink")
          }
        >
          <Keyboard className="h-3.5 w-3.5" /> Saisie / pistolet
        </button>
        <button
          onClick={() => setMode("camera")}
          className={
            "h-8 px-3 rounded-md text-[12.5px] font-medium inline-flex items-center gap-1.5 transition-colors " +
            (mode === "camera" ? "bg-canvas-2 text-ink" : "text-muted hover:text-ink")
          }
        >
          <Camera className="h-3.5 w-3.5" /> Caméra
        </button>
      </div>

      {/* Scanner */}
      {mode === "manual" && (
        <Card className="p-4">
          <p className="eyebrow mb-3 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-violet" />
            Pistolet USB ou saisie manuelle
          </p>
          <form onSubmit={submitManual} className="flex items-center gap-2">
            <div className="relative flex-1">
              <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-2" strokeWidth={2.2} />
              <Input
                autoFocus
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Tape ou scanne (ex: QR-A1B2C3)"
                className="pl-9 font-mono h-11 text-[14px]"
              />
            </div>
            <Button type="submit" variant="primary" size="lg" disabled={pending || !manualCode.trim()}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Scan…
                </>
              ) : (
                <>Valider</>
              )}
            </Button>
          </form>
          <p className="text-[11px] text-muted-2 mt-2">
            Avec un pistolet USB, le code est saisi puis "Entrée" validé automatiquement.
          </p>
        </Card>
      )}

      {mode === "camera" && (
        <Card className="overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-line">
            <p className="eyebrow flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5 text-blue" />
              Scanner caméra
            </p>
            {!cameraActive ? (
              <Button variant="primary" size="sm" onClick={() => setCameraActive(true)}>
                <Camera className="h-3.5 w-3.5" strokeWidth={2.4} /> Activer caméra
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setCameraActive(false);
                  const s = scannerRef.current as { stop?: () => Promise<void> } | null;
                  if (s?.stop) s.stop().catch(() => {});
                }}
              >
                <X className="h-3.5 w-3.5" /> Arrêter
              </Button>
            )}
          </div>
          <div className="p-4 bg-ink relative" style={{ minHeight: cameraActive ? "320px" : "120px" }}>
            <div id={SCANNER_ID} className="w-full max-w-md mx-auto" />
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <Camera className="h-10 w-10 text-white/30 mb-2" strokeWidth={1.5} />
                <p className="text-[13px] text-white/80">
                  Caméra arrêtée. Clique "Activer caméra" pour démarrer le scan.
                </p>
                <p className="text-[11px] text-white/50 mt-1">
                  Ton navigateur demandera l'autorisation d'utiliser la caméra arrière.
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="p-3 bg-red-soft border-red/30 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-red mt-0.5 shrink-0" strokeWidth={2.2} />
          <div>
            <p className="text-[12.5px] font-semibold text-red">Erreur</p>
            <p className="text-[11.5px] text-red/80 mt-0.5">{error}</p>
          </div>
        </Card>
      )}

      {/* Feedback */}
      {feedback && (
        <Card
          className={
            "p-4 " +
            (feedback.ok && !feedback.item.wasAlreadyReceived
              ? "bg-emerald-soft border-emerald/30"
              : feedback.ok
              ? "bg-amber-soft border-amber/30"
              : "bg-red-soft border-red/30")
          }
        >
          <div className="flex items-start gap-3">
            <ColorChip tone={feedback.ok ? (feedback.item.wasAlreadyReceived ? "amber" : "emerald") : "pink"} size="md">
              {feedback.ok ? (
                <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />
              ) : (
                <AlertCircle className="h-4 w-4" strokeWidth={2.4} />
              )}
            </ColorChip>
            <div className="flex-1 min-w-0">
              {feedback.ok ? (
                <>
                  <p
                    className={
                      "text-[13.5px] font-semibold leading-tight " +
                      (feedback.item.wasAlreadyReceived ? "text-amber" : "text-emerald")
                    }
                  >
                    {feedback.item.wasAlreadyReceived ? "Déjà reçu" : "Élément reçu ✓"}
                  </p>
                  <p className="text-[12.5px] text-ink-2 mt-1">{feedback.item.label}</p>
                  <p className="text-[11px] text-muted mt-0.5 font-mono">
                    {feedback.item.qr_code} · {feedback.item.dossierNumber} ·{" "}
                    {feedback.item.clientName}
                  </p>
                  {feedback.item.dossierComplete && (
                    <p className="text-[12px] text-emerald font-semibold mt-2 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.4} />
                      Tous les éléments du dossier sont reçus !
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[13.5px] font-semibold text-red leading-tight">
                    Scan refusé
                  </p>
                  <p className="text-[12px] text-red/80 mt-1">{feedback.message}</p>
                </>
              )}
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-muted-2 hover:text-ink shrink-0"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
