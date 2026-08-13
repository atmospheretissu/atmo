"use client";

import { useTransition } from "react";
import { X, Loader2 } from "lucide-react";
import { clearImpersonationCookieAction } from "@/app/(platform)/impersonation-actions";

/**
 * Bouton "sortir du mode simulation" — utilisable partout (banner du
 * layout platform, page 403, etc.).
 *
 * Utilise une action qui NE fait PAS de redirect() serveur (les
 * redirects Next lancés depuis un server action ne clearent pas toujours
 * le cache client → on faisait un tour de 403 → 403 en boucle). À la
 * place : on efface le cookie côté serveur puis on force un
 * window.location.href côté client pour recharger avec la nouvelle
 * cookie.
 */
export function StopImpersonationButton({
  target = "/dashboard",
  variant = "onBanner",
}: {
  target?: string;
  variant?: "onBanner" | "primary";
}) {
  const [pending, startTransition] = useTransition();
  const stop = () => {
    startTransition(async () => {
      await clearImpersonationCookieAction();
      // Full reload pour que le middleware voie la cookie effacée
      window.location.href = target;
    });
  };
  const base =
    variant === "primary"
      ? "inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-ink text-white text-[13px] font-semibold hover:bg-ink/90 transition-colors disabled:opacity-50"
      : "inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-white/20 hover:bg-white/30 font-semibold transition-colors disabled:opacity-50 text-[12.5px]";
  return (
    <button onClick={stop} disabled={pending} className={base}>
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <X className="h-3.5 w-3.5" />
      )}
      Sortir du mode simulation
    </button>
  );
}
