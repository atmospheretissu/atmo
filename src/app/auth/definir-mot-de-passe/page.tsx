"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Définition du mot de passe après invitation ou réinitialisation.
 * L'utilisateur arrive ici avec une session déjà posée par
 * /auth/callback (OTP/PKCE) ou /auth/confirm (fragment).
 */
export default function DefinirMotDePassePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setChecking(false);
    });
  }, []);

  const submit = async () => {
    setError(null);
    if (pwd.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (pwd !== pwd2) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setPending(true);
    const supabase = createClient();
    const { error: e } = await supabase.auth.updateUser({ password: pwd });
    setPending(false);
    if (e) {
      setError(e.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.replace("/dashboard"), 1500);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-violet" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white border border-line shadow-sm p-7 text-center">
          <div className="h-12 w-12 rounded-full bg-pink-soft text-pink inline-flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <h1 className="text-[18px] font-semibold text-ink mb-2">
            Session expirée
          </h1>
          <p className="text-[13.5px] text-muted leading-relaxed mb-5">
            Ton lien a expiré ou a déjà été utilisé. Demande à un
            administrateur de t&apos;en générer un nouveau.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center h-10 px-5 rounded-md bg-ink text-white text-[13.5px] font-semibold hover:bg-ink/90"
          >
            Retour à la connexion
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-line shadow-sm p-7">
        <div className="text-center mb-6">
          <div
            className={
              "h-12 w-12 rounded-full inline-flex items-center justify-center mb-4 " +
              (done
                ? "bg-emerald-soft text-emerald"
                : "bg-violet-soft text-violet-strong")
            }
          >
            {done ? (
              <CheckCircle2 className="h-6 w-6" strokeWidth={2.2} />
            ) : (
              <KeyRound className="h-6 w-6" strokeWidth={2.2} />
            )}
          </div>
          <h1 className="text-[20px] font-semibold text-ink">
            {done ? "Mot de passe enregistré" : "Choisis ton mot de passe"}
          </h1>
          <p className="text-[13px] text-muted mt-1.5">
            {done ? "Redirection en cours…" : email}
          </p>
        </div>

        {!done && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11.5px] uppercase tracking-widest font-semibold text-muted-2 mb-1.5">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                disabled={pending}
                autoFocus
                className="w-full h-11 rounded-md border border-line-strong bg-white px-3 text-[14px] text-ink focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15"
                placeholder="8 caractères minimum"
              />
            </div>
            <div>
              <label className="block text-[11.5px] uppercase tracking-widest font-semibold text-muted-2 mb-1.5">
                Confirmer
              </label>
              <input
                type="password"
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                disabled={pending}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="w-full h-11 rounded-md border border-line-strong bg-white px-3 text-[14px] text-ink focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15"
                placeholder="Retape le mot de passe"
              />
            </div>

            {error && (
              <div className="text-[12.5px] text-pink bg-pink-soft/40 border border-pink/30 rounded px-3 py-2">
                {error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={pending || !pwd || !pwd2}
              className="w-full h-11 rounded-md bg-ink text-white text-[14.5px] font-semibold hover:bg-ink/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…
                </>
              ) : (
                "Enregistrer et accéder à la plateforme"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
