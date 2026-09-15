"use client";

import { useState, useTransition } from "react";
import { Camera, FileArchive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAtmoleadArtifactUrlAction } from "./artifact-actions";

/**
 * Deux boutons de téléchargement pour le screenshot d'échec et la trace
 * Playwright. Passent par une action serveur qui génère une signed URL
 * temporaire (5 min) — le bucket Storage est privé, aucun accès direct.
 *
 * La trace Playwright s'ouvre avec :
 *   npx playwright show-trace <fichier.zip>
 */
export function ArtifactButtons({
  screenshotPath,
  tracePath,
}: {
  screenshotPath: string | null;
  tracePath: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"screenshot" | "trace" | null>(null);

  const download = (path: string, kind: "screenshot" | "trace") => {
    setBusy(kind);
    startTransition(async () => {
      const r = await getAtmoleadArtifactUrlAction(path);
      setBusy(null);
      if (!r.ok) {
        alert(`Téléchargement impossible : ${r.message}`);
        return;
      }
      window.open(r.url, "_blank", "noopener");
    });
  };

  if (!screenshotPath && !tracePath) {
    return (
      <p className="text-[12px] text-muted-2 italic">
        Aucun artefact disponible pour ce run (soit ancienne exécution avant le
        capture-sur-échec, soit run réussi sans DEBUG_TRACE).
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {screenshotPath && (
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => download(screenshotPath, "screenshot")}
        >
          {pending && busy === "screenshot" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}{" "}
          Screenshot au moment de l&apos;échec
        </Button>
      )}
      {tracePath && (
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => download(tracePath, "trace")}
          title="Ouvre avec: npx playwright show-trace <fichier.zip>"
        >
          {pending && busy === "trace" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileArchive className="h-3.5 w-3.5" />
          )}{" "}
          Trace Playwright (.zip)
        </Button>
      )}
    </div>
  );
}
