"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signDevisAction } from "./actions";

export function SignForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [acceptCgv, setAcceptCgv] = useState(false);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const r = await signDevisAction(token, {
        fullName,
        phone,
        acceptCgv,
      });
      if (r.ok) {
        router.refresh();
      } else {
        setError(r.message);
      }
    });
  };

  return (
    <div className="p-6">
      <p className="text-[13.5px] text-ink-2 mb-5">
        Pour valider votre commande, signez électroniquement le devis en
        confirmant votre nom et en acceptant les Conditions Générales de Vente.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-[11.5px] uppercase tracking-widest font-semibold text-muted-2 mb-1.5">
            Votre nom complet *
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={pending}
            placeholder="ex : Marie Durand"
            className="w-full h-11 rounded-md border border-line-strong bg-white px-3 text-[14px] text-ink focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-[11.5px] uppercase tracking-widest font-semibold text-muted-2 mb-1.5">
            Téléphone (facultatif)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={pending}
            placeholder="06 12 34 56 78"
            className="w-full h-11 rounded-md border border-line-strong bg-white px-3 text-[14px] text-ink focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15"
          />
          <p className="text-[11px] text-muted-2 mt-1">
            Utilisé uniquement pour la preuve de signature.
          </p>
        </div>

        <label className="flex items-start gap-2 pt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptCgv}
            onChange={(e) => setAcceptCgv(e.target.checked)}
            disabled={pending}
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <span className="text-[13px] text-ink-2 leading-relaxed">
            J&apos;accepte les{" "}
            <strong className="text-ink">
              Conditions Générales de Vente
            </strong>{" "}
            jointes au devis et je reconnais que ma signature électronique
            engage ma commande.
          </span>
        </label>

        {error && (
          <div className="text-[12.5px] text-pink bg-pink-soft/40 border border-pink/30 rounded px-3 py-2">
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={pending || !fullName.trim() || !acceptCgv}
          className="mt-2 w-full h-12 rounded-md bg-ink text-white text-[15px] font-semibold hover:bg-ink/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? "Enregistrement…" : "Signer et valider le devis"}
        </button>

        <p className="text-[11px] text-muted-2 text-center pt-1">
          Votre horodatage, votre nom et votre adresse IP sont conservés à
          titre de preuve de signature.
        </p>
      </div>
    </div>
  );
}
