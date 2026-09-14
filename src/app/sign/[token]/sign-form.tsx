"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getStripeCheckoutForSignAction, signDevisAction } from "./actions";

/**
 * F7 v2 (PE 14/09) : après la signature, on demande au client SON mode de
 * paiement de préférence. Stripe s'ouvre UNIQUEMENT s'il choisit CB. Pour les
 * autres modes (virement / chèque / espèces / magasin), on affiche les infos
 * et l'app attend l'encaissement manuel côté back-office.
 */
type PaymentChoice = "cb" | "virement" | "cheque" | "especes";

const CHOICE_LABEL: Record<Exclude<PaymentChoice, "cb">, string> = {
  virement: "virement bancaire",
  cheque: "chèque",
  especes: "espèces au magasin",
};

export function SignForm({
  token,
  initialSignedAt = null,
  initialSignedByName = null,
  devisPaid = false,
}: {
  token: string;
  initialSignedAt?: string | null;
  initialSignedByName?: string | null;
  devisPaid?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState(initialSignedByName ?? "");
  const [phone, setPhone] = useState("");
  const [acceptCgv, setAcceptCgv] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  // Si la page charge sur un devis déjà signé mais pas encore payé, on
  // démarre directement sur l'étape "choose" (proposition des 4 modes de
  // paiement). Si le paiement est déjà fait → "confirmed".
  const [step, setStep] = useState<"sign" | "choose" | "confirmed">(
    devisPaid ? "confirmed" : initialSignedAt ? "choose" : "sign",
  );
  const [stripeUrl, setStripeUrl] = useState<string | null>(null);
  const [chosenMethod, setChosenMethod] = useState<
    Exclude<PaymentChoice, "cb"> | null
  >(null);

  // Si on démarre sur "choose" (devis déjà signé), il faut aller chercher
  // le lien Stripe une bonne fois pour que le bouton CB soit actif.
  useEffect(() => {
    if (initialSignedAt && !devisPaid && !stripeUrl) {
      getStripeCheckoutForSignAction(token)
        .then((r) => {
          if (r.ok) setStripeUrl(r.url);
        })
        .catch(() => {
          /* silencieux : le bouton CB sera juste désactivé */
        });
    }
  }, [initialSignedAt, devisPaid, stripeUrl, token]);

  const submitSignature = () => {
    setError(null);
    startTransition(async () => {
      const r = await signDevisAction(token, {
        fullName,
        phone,
        acceptCgv,
      });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setStripeUrl(r.stripeUrl);
      setStep("choose");
    });
  };

  const choose = (choice: PaymentChoice) => {
    if (choice === "cb") {
      if (!stripeUrl) {
        setError(
          "Paiement en ligne indisponible. Choisissez un autre mode de règlement.",
        );
        return;
      }
      setRedirecting(true);
      window.location.href = stripeUrl;
      return;
    }
    setChosenMethod(choice);
    setStep("confirmed");
    router.refresh();
  };

  if (step === "confirmed") {
    const method = chosenMethod;
    return (
      <div className="p-6">
        <div className="rounded-lg border border-emerald/30 bg-emerald-soft/40 p-4 mb-4">
          <p className="text-[15px] font-semibold text-emerald-strong mb-1">
            ✓ Devis signé
          </p>
          <p className="text-[13px] text-emerald-strong/90 leading-relaxed">
            Merci ! Votre signature est enregistrée
            {method ? ` — règlement prévu par ${CHOICE_LABEL[method]}` : ""}.
            Notre équipe validera votre commande dès réception de l&apos;acompte.
          </p>
        </div>
        {method === "virement" && (
          <p className="text-[12.5px] text-muted leading-relaxed">
            <strong>RIB à utiliser :</strong> Code B.I.C CCBPFRPPLIL — Code
            I.B.A.N FR76 1350 7000 1431 4825 3216 404. Merci d&apos;indiquer le
            numéro de devis dans le libellé du virement.
          </p>
        )}
        {method === "cheque" && (
          <p className="text-[12.5px] text-muted leading-relaxed">
            <strong>Chèque à l&apos;ordre de :</strong> Atmosphère Tissus — à
            remettre au magasin ou à envoyer au 1 rue de l&apos;Union, Village
            des Voiles, 59520 Marquette-lez-Lille. Indiquez le numéro de devis
            au dos.
          </p>
        )}
        {method === "especes" && (
          <p className="text-[12.5px] text-muted leading-relaxed">
            <strong>Paiement en espèces :</strong> présentez-vous au magasin (1
            rue de l&apos;Union, Marquette-lez-Lille) muni du numéro de devis.
            Horaires : mardi-samedi 10h-19h.
          </p>
        )}
      </div>
    );
  }

  if (step === "choose") {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-emerald/30 bg-emerald-soft/30 p-3 mb-5">
          <p className="text-[13px] font-semibold text-emerald-strong">
            ✓ Signature enregistrée pour {fullName}
          </p>
        </div>

        <p className="text-[13.5px] text-ink-2 mb-4">
          Comment souhaitez-vous régler l&apos;acompte ?
        </p>

        <div className="space-y-2">
          <button
            onClick={() => choose("cb")}
            disabled={redirecting || !stripeUrl}
            className="w-full text-left p-4 rounded-lg border-2 border-violet bg-violet-soft/30 hover:bg-violet-soft/60 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-semibold text-ink">
                  Payer par carte bancaire
                </p>
                <p className="text-[12px] text-muted mt-0.5">
                  Paiement sécurisé en ligne via Stripe. Confirmation immédiate.
                </p>
              </div>
              <span className="text-[20px]">→</span>
            </div>
          </button>

          <button
            onClick={() => choose("virement")}
            disabled={redirecting}
            className="w-full text-left p-4 rounded-lg border border-line hover:border-line-strong hover:bg-canvas-2/40 transition-colors"
          >
            <p className="text-[14px] font-semibold text-ink">
              Payer par virement bancaire
            </p>
            <p className="text-[12px] text-muted mt-0.5">
              RIB communiqué à l&apos;étape suivante. Commande validée à
              réception du virement.
            </p>
          </button>

          <button
            onClick={() => choose("cheque")}
            disabled={redirecting}
            className="w-full text-left p-4 rounded-lg border border-line hover:border-line-strong hover:bg-canvas-2/40 transition-colors"
          >
            <p className="text-[14px] font-semibold text-ink">
              Payer par chèque
            </p>
            <p className="text-[12px] text-muted mt-0.5">
              À l&apos;ordre d&apos;Atmosphère Tissus, à remettre au magasin ou
              par courrier.
            </p>
          </button>

          <button
            onClick={() => choose("especes")}
            disabled={redirecting}
            className="w-full text-left p-4 rounded-lg border border-line hover:border-line-strong hover:bg-canvas-2/40 transition-colors"
          >
            <p className="text-[14px] font-semibold text-ink">
              Payer en espèces au magasin
            </p>
            <p className="text-[12px] text-muted mt-0.5">
              Sur place, aux horaires d&apos;ouverture du magasin.
            </p>
          </button>
        </div>

        {error && (
          <div className="mt-4 text-[12.5px] text-pink bg-pink-soft/40 border border-pink/30 rounded px-3 py-2">
            {error}
          </div>
        )}

        {redirecting && (
          <p className="mt-4 text-[13px] text-muted text-center">
            Redirection vers le paiement sécurisé…
          </p>
        )}
      </div>
    );
  }

  // step === "sign"
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
          onClick={submitSignature}
          disabled={pending || !fullName.trim() || !acceptCgv}
          className="mt-2 w-full h-12 rounded-md bg-ink text-white text-[15px] font-semibold hover:bg-ink/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? "Enregistrement…" : "Signer le devis"}
        </button>

        <p className="text-[11px] text-muted-2 text-center pt-1">
          Après signature, vous choisirez votre mode de paiement de
          l&apos;acompte (CB en ligne, virement, chèque ou espèces).
        </p>
        <p className="text-[11px] text-muted-2 text-center">
          Votre horodatage, votre nom et votre adresse IP sont conservés à
          titre de preuve de signature.
        </p>
      </div>
    </div>
  );
}
