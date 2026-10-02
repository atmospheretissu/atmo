"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Page de rattrapage pour les liens Supabase en flow « implicit » : le
 * jeton arrive dans le fragment d'URL (`#access_token=...`), que le
 * serveur ne reçoit jamais. On le lit côté navigateur et on pose la
 * session, puis on redirige.
 */
function ConfirmInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = params.get("next") ?? "/dashboard";
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const frag = new URLSearchParams(hash);

    const accessToken = frag.get("access_token");
    const refreshToken = frag.get("refresh_token");
    const errDesc = frag.get("error_description") ?? frag.get("error");

    if (errDesc) {
      setError(decodeURIComponent(errDesc.replace(/\+/g, " ")));
      return;
    }
    if (!accessToken || !refreshToken) {
      setError(
        "Ce lien est invalide ou a expiré. Demande à un administrateur de t'en renvoyer un nouveau.",
      );
      return;
    }

    const supabase = createClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: e }) => {
        if (e) {
          setError(e.message);
          return;
        }
        // Nettoie le fragment pour que le jeton ne reste pas dans l'historique
        window.history.replaceState(null, "", window.location.pathname);
        router.replace(next);
      });
  }, [params, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white border border-line shadow-sm p-7 text-center">
          <div className="h-12 w-12 rounded-full bg-pink-soft text-pink inline-flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <h1 className="text-[18px] font-semibold text-ink mb-2">
            Lien invalide ou expiré
          </h1>
          <p className="text-[13.5px] text-muted leading-relaxed mb-5">{error}</p>
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
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-6 w-6 animate-spin text-violet mx-auto mb-3" />
        <p className="text-[13.5px] text-muted">Connexion en cours…</p>
      </div>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-violet" />
        </div>
      }
    >
      <ConfirmInner />
    </Suspense>
  );
}
