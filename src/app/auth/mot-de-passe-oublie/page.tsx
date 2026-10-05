"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck, KeyRound, ArrowLeft } from "lucide-react";
import { requestPasswordResetAction } from "@/app/auth/actions";

/**
 * Récupération de mot de passe depuis la page de connexion.
 * Le lien reçu mène vers /auth/callback puis /auth/definir-mot-de-passe.
 */
export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setPending(true);
    const r = await requestPasswordResetAction(email);
    setPending(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen canvas-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-line shadow-sm p-7">
        <div className="text-center mb-6">
          <div
            className={
              "h-12 w-12 rounded-full inline-flex items-center justify-center mb-4 " +
              (sent
                ? "bg-emerald-soft text-emerald"
                : "bg-violet-soft text-violet-strong")
            }
          >
            {sent ? (
              <MailCheck className="h-6 w-6" strokeWidth={2.2} />
            ) : (
              <KeyRound className="h-6 w-6" strokeWidth={2.2} />
            )}
          </div>
          <h1 className="text-[20px] font-semibold text-ink">
            {sent ? "Vérifie ta boîte mail" : "Mot de passe oublié"}
          </h1>
          <p className="text-[13px] text-muted mt-1.5 leading-relaxed">
            {sent
              ? `Si un compte existe pour ${email}, un lien de réinitialisation vient d'être envoyé. Il est valable une heure.`
              : "Saisis ton adresse professionnelle : tu recevras un lien pour choisir un nouveau mot de passe."}
          </p>
        </div>

        {!sent && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11.5px] uppercase tracking-widest font-semibold text-muted-2 mb-1.5">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                disabled={pending}
                autoFocus
                placeholder="prenom.nom@atmospheretissus.com"
                className="w-full h-11 rounded-md border border-line-strong bg-white px-3 text-[14px] text-ink focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15"
              />
            </div>

            {error && (
              <div className="text-[12.5px] text-pink bg-pink-soft/40 border border-pink/30 rounded px-3 py-2">
                {error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={pending || !email.trim()}
              className="w-full h-11 rounded-md bg-ink text-white text-[14.5px] font-semibold hover:bg-ink/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Envoi…
                </>
              ) : (
                "Envoyer le lien"
              )}
            </button>
          </div>
        )}

        {sent && (
          <p className="text-[12px] text-muted leading-relaxed text-center">
            Rien reçu après quelques minutes ? Vérifie tes indésirables, ou
            demande à un administrateur de te générer un lien directement
            depuis Paramètres → Utilisateurs.
          </p>
        )}

        <div className="mt-6 pt-4 border-t border-line text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
