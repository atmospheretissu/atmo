"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createSavTicketAction,
  type CreateSavInput,
} from "@/app/(platform)/sav/actions";

type Props = {
  context: {
    clientId?: string | null;
    devisId?: string | null;
    dossierId?: string | null;
    contextLabel: string; // ex: "DEV-2026-0042" / nom du client
  };
  variant?: "ghost" | "secondary";
};

export function OpenSavTicketButton({ context, variant = "ghost" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<CreateSavInput["priority"]>("normale");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setPriority("normale");
    setError(null);
    setSuccess(null);
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const r = await createSavTicketAction({
        clientId: context.clientId ?? null,
        devisId: context.devisId ?? null,
        dossierId: context.dossierId ?? null,
        title,
        description,
        priority,
      });
      if (r.ok) {
        setSuccess(r.number);
        setTimeout(() => {
          setOpen(false);
          reset();
          router.push(`/sav`);
        }, 800);
      } else {
        setError(r.message);
      }
    });
  };

  return (
    <>
      <Button
        variant={variant}
        size="sm"
        onClick={() => {
          setOpen(true);
          reset();
        }}
      >
        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.2} />
        Ouvrir un ticket SAV
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-[520px] bg-white rounded-2xl shadow-pop border border-line overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <div className="flex items-center gap-2.5">
                <span className="h-7 w-7 rounded-md inline-flex items-center justify-center bg-amber-soft text-amber">
                  <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.4} />
                </span>
                <div>
                  <p className="eyebrow">Nouveau ticket SAV</p>
                  <p className="text-[12.5px] text-muted-2">{context.contextLabel}</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="h-8 w-8 rounded-md hover:bg-canvas-2 inline-flex items-center justify-center text-muted hover:text-ink transition-colors"
              >
                <X className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
                  Titre *
                </label>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Tringle défectueuse au salon"
                  disabled={pending || Boolean(success)}
                  className="w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13.5px] text-ink focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15"
                />
              </div>
              <div>
                <label className="block text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Symptômes, contexte, photos par email…"
                  disabled={pending || Boolean(success)}
                  className="w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] text-ink resize-none focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15"
                />
              </div>
              <div>
                <label className="block text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
                  Priorité
                </label>
                <div className="grid grid-cols-3 gap-1 rounded-md border border-line p-0.5 bg-white h-9">
                  {(["normale", "haute", "urgente"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      disabled={pending || Boolean(success)}
                      className={
                        "text-[12px] font-semibold rounded-[5px] transition-colors capitalize " +
                        (priority === p
                          ? p === "urgente"
                            ? "bg-pink text-white"
                            : p === "haute"
                              ? "bg-amber text-white"
                              : "bg-ink text-white"
                          : "text-muted hover:text-ink")
                      }
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="text-[12px] text-pink bg-pink-soft/40 border border-pink/30 rounded px-3 py-2">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-[12px] text-emerald bg-emerald-soft/40 border border-emerald/30 rounded px-3 py-2">
                  Ticket <strong className="font-semibold">{success}</strong> créé ✓
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="h-8 px-3 rounded-md text-[12px] font-medium text-muted hover:text-ink-2 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={submit}
                  disabled={pending || !title.trim() || Boolean(success)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold bg-ink text-white hover:bg-ink/90 disabled:opacity-40 transition-colors"
                >
                  {pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
                  ) : (
                    <Send className="h-3.5 w-3.5" strokeWidth={2.4} />
                  )}
                  Créer le ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
