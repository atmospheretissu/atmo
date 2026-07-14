"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, PenLine } from "lucide-react";

/**
 * Bloc « Signature électronique » affiché sur la fiche devis.
 * - Non signé  : affiche le lien de signature à copier / ouvrir dans un
 *                nouvel onglet pour l'envoyer au client.
 * - Signé      : preuve visuelle (nom, date, téléphone, IP) type Yousign.
 */
export function SignatureCard({
  signatureToken,
  signedAt,
  signedByName,
  signedByPhone,
  signedByIp,
  publicBaseUrl,
}: {
  signatureToken: string | null;
  signedAt: string | null;
  signedByName: string | null;
  signedByPhone: string | null;
  signedByIp: string | null;
  publicBaseUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = signatureToken
    ? `${publicBaseUrl}/sign/${signatureToken}`
    : null;

  const copy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (signedAt && signedByName) {
    const d = new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(signedAt));
    return (
      <div className="rounded-lg border border-emerald/30 bg-emerald-soft/40 p-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-md bg-emerald text-white inline-flex items-center justify-center shrink-0">
            <Check className="h-4 w-4" strokeWidth={2.4} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-emerald-strong">
              Ce document a été signé en ligne
            </p>
            <p className="text-[12.5px] text-ink-2 mt-0.5">
              Le <strong className="text-ink">{d}</strong>
            </p>
            <p className="text-[12.5px] text-ink-2 mt-0.5">
              par{" "}
              <strong className="text-ink">{signedByName}</strong>
              {signedByPhone ? (
                <>
                  {" "}
                  avec le téléphone{" "}
                  <span className="font-mono text-ink">{signedByPhone}</span>
                </>
              ) : null}
            </p>
            {signedByIp && (
              <p className="text-[11px] text-muted-2 mt-1 font-mono">
                IP : {signedByIp}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber/30 bg-amber-soft/30 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="h-8 w-8 rounded-md bg-amber text-white inline-flex items-center justify-center shrink-0">
          <PenLine className="h-4 w-4" strokeWidth={2.4} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-ink">
            En attente de signature du client
          </p>
          <p className="text-[12px] text-muted mt-0.5 leading-relaxed">
            Envoyez ce lien au client — il pourra signer en ligne sans compte
            et accepter les CGV. L&apos;acompte ne pourra être encaissé qu&apos;après
            signature.
          </p>
        </div>
      </div>

      {url ? (
        <div className="space-y-2">
          <div className="flex items-stretch gap-1.5">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 h-9 rounded-md border border-line-strong bg-white px-3 text-[12px] text-ink font-mono"
            />
            <button
              type="button"
              onClick={copy}
              className="h-9 px-2.5 rounded-md bg-ink text-white text-[11.5px] font-semibold inline-flex items-center gap-1 hover:bg-ink/90"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" /> Copié
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copier
                </>
              )}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="h-9 px-2.5 rounded-md border border-line bg-white text-ink-2 text-[11.5px] font-semibold inline-flex items-center gap-1 hover:border-line-strong"
            >
              <ExternalLink className="h-3 w-3" /> Ouvrir
            </a>
          </div>
        </div>
      ) : (
        <p className="text-[11.5px] text-muted italic">
          Token de signature manquant sur ce devis (ancien devis) — enregistre
          à nouveau pour générer le lien.
        </p>
      )}
    </div>
  );
}
