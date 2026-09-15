"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, PlayCircle } from "lucide-react";
import { resumeAtmoleadAction } from "@/app/(platform)/leads-lm/breaker-actions";

/**
 * Bannière rouge affichée en haut de /leads-lm et /leads-lm/config quand
 * le scraper est en pause (circuit-breaker déclenché ou pause manuelle).
 * Un bouton "Reprendre le scraping" reset paused_at/reason côté DB.
 */
export function AtmoleadBreakerBanner({
  pausedAt,
  pausedReason,
  consecutiveFailures,
}: {
  pausedAt: string;
  pausedReason: string | null;
  consecutiveFailures: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const resume = () => {
    if (
      !confirm(
        "Reprendre le scraping Leroy Merlin ? Assure-toi d'avoir vérifié que le login manuel fonctionne, sinon le cron va re-échouer immédiatement.",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const r = await resumeAtmoleadAction();
      if (!r.ok) setError(r.message);
    });
  };

  const pausedDate = new Date(pausedAt).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-8 mb-4 rounded-xl border-2 border-red bg-red-soft/50 p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-lg bg-red text-white inline-flex items-center justify-center">
          <AlertTriangle className="h-5 w-5" strokeWidth={2.4} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-red mb-1">
            Circuit-breaker · Scraping en pause
          </p>
          <p className="text-[15px] font-semibold text-ink mb-1">
            Le scraper Leroy Merlin est arrêté automatiquement
          </p>
          <p className="text-[12.5px] text-ink-2 leading-relaxed">
            Pause déclenchée le <strong>{pausedDate}</strong> après{" "}
            <strong>{consecutiveFailures} échecs consécutifs</strong>.
            {pausedReason && (
              <>
                {" "}
                Motif : <em>{pausedReason}</em>
              </>
            )}
          </p>
          <p className="text-[12.5px] text-muted mt-2 leading-relaxed">
            Diagnostique la cause via le journal d&apos;exécutions (bouton
            &laquo;&nbsp;Trace Playwright&nbsp;&raquo; ou &laquo;&nbsp;Screenshot&nbsp;&raquo; sur le
            dernier run). Une fois le problème corrigé, clique
            &laquo;&nbsp;Reprendre&nbsp;&raquo; ci-dessous.
          </p>
          {error && (
            <p className="mt-2 text-[12.5px] text-red">Erreur : {error}</p>
          )}
          <button
            onClick={resume}
            disabled={pending}
            className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-ink text-white text-[13px] font-semibold hover:bg-ink/90 disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Reprise en cours…
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" strokeWidth={2.4} />
                Reprendre le scraping
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
