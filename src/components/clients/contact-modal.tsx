"use client";

import { useEffect, useState, useTransition } from "react";
import { Send, Loader2, X, MessageSquare, Mail } from "lucide-react";
import {
  sendClientSmsAction,
  sendClientEmailAction,
} from "@/app/(platform)/clients/contact-actions";

type Mode = "sms" | "email";

export function ContactModal({
  clientId,
  clientName,
  initialMode,
  to,
  onClose,
}: {
  clientId: string;
  clientName: string;
  initialMode: Mode;
  to: string;
  onClose: () => void;
}) {
  const [mode] = useState<Mode>(initialMode);
  const [subject, setSubject] = useState(
    initialMode === "email" ? `Atmosphère Tissus — ${clientName}` : "",
  );
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const send = () => {
    setError(null);
    startTransition(async () => {
      const res =
        mode === "sms"
          ? await sendClientSmsAction(clientId, body)
          : await sendClientEmailAction(clientId, subject, body);
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => onClose(), 1000);
      } else {
        setError(res.message);
      }
    });
  };

  const isSms = mode === "sms";
  const Icon = isSms ? MessageSquare : Mail;
  const limit = isSms ? 480 : 5000;
  const remaining = limit - body.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-[520px] bg-white rounded-2xl shadow-pop border border-line overflow-hidden animate-fade-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-7 w-7 rounded-md inline-flex items-center justify-center ${
                isSms ? "bg-violet-soft text-violet" : "bg-blue-soft text-blue"
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            <div>
              <p className="eyebrow">{isSms ? "SMS" : "Email"} libre</p>
              <p className="text-[13px] font-semibold text-ink leading-tight">
                À {clientName}
              </p>
              <p className="text-[11.5px] text-muted-2 mt-0.5">{to}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md hover:bg-canvas-2 inline-flex items-center justify-center text-muted hover:text-ink transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {!isSms && (
            <div>
              <label className="block text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
                Objet
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Objet de l'email"
                disabled={pending || success}
                className="w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] text-ink focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15"
              />
            </div>
          )}

          <div>
            <label className="block text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
              Message
            </label>
            <textarea
              autoFocus
              rows={isSms ? 5 : 8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={limit}
              disabled={pending || success}
              placeholder={
                isSms
                  ? "Bonjour, votre devis est prêt…"
                  : "Bonjour,\n\nVotre devis est prêt…"
              }
              className="w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] text-ink resize-none focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10.5px] text-muted-2">
                {isSms ? "Envoyé via Brevo · transactionnel" : "Envoyé via Brevo"}
              </p>
              <p
                className={`text-[10.5px] tabular-nums ${
                  remaining < 50 ? "text-amber" : "text-muted-2"
                }`}
              >
                {body.length} / {limit}
              </p>
            </div>
          </div>

          {error && (
            <div className="text-[12px] text-pink bg-pink-soft/40 border border-pink/30 rounded px-3 py-2">
              {error}
            </div>
          )}
          {success && (
            <div className="text-[12px] text-emerald bg-emerald-soft/40 border border-emerald/30 rounded px-3 py-2">
              {isSms ? "SMS envoyé ✓" : "Email envoyé ✓"}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={pending}
              className="h-8 px-3 rounded-md text-[12px] font-medium text-muted hover:text-ink-2 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={send}
              disabled={pending || success || !body.trim() || (!isSms && !subject.trim())}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold bg-ink text-white hover:bg-ink/90 disabled:opacity-40 transition-colors"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
              ) : (
                <Send className="h-3.5 w-3.5" strokeWidth={2.4} />
              )}
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContactButtons({
  clientId,
  clientName,
  phone,
  email,
}: {
  clientId: string;
  clientName: string;
  phone: string | null;
  email: string | null;
}) {
  const [open, setOpen] = useState<Mode | null>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen("email")}
        disabled={!email}
        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium border border-line bg-canvas-2/40 text-ink-2 hover:border-line-strong disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title={email ?? "Pas d'email enregistré"}
      >
        <Mail className="h-3.5 w-3.5" strokeWidth={2.2} /> Email
      </button>
      <button
        type="button"
        onClick={() => setOpen("sms")}
        disabled={!phone}
        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium border border-line bg-canvas-2/40 text-ink-2 hover:border-line-strong disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title={phone ?? "Pas de téléphone enregistré"}
      >
        <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.2} /> SMS
      </button>

      {open && (
        <ContactModal
          clientId={clientId}
          clientName={clientName}
          initialMode={open}
          to={(open === "sms" ? phone : email) ?? ""}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

export function HeaderSendButton({
  clientId,
  clientName,
  phone,
  email,
}: {
  clientId: string;
  clientName: string;
  phone: string | null;
  email: string | null;
}) {
  const [open, setOpen] = useState<Mode | null>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(email ? "email" : "sms")}
        disabled={!email && !phone}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium text-muted-2 hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title={
          email
            ? `Email à ${email}`
            : phone
              ? `SMS à ${phone}`
              : "Pas de contact"
        }
      >
        {email ? (
          <Mail className="h-3.5 w-3.5" strokeWidth={2.2} />
        ) : (
          <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.2} />
        )}
        Envoyer {email ? "un email" : "un SMS"}
      </button>

      {open && (
        <ContactModal
          clientId={clientId}
          clientName={clientName}
          initialMode={open}
          to={(open === "sms" ? phone : email) ?? ""}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
