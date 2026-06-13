import { CheckCircle2, Clock } from "lucide-react";
import { eur } from "@/lib/formatters";

type PaymentMethodLabel = {
  acomptePaid: boolean;
  acompteMethod?: string | null;
  acompteAt?: string | null;
  soldePaid: boolean;
  soldeMethod?: string | null;
  soldeAt?: string | null;
};

const METHOD_LABELS: Record<string, string> = {
  virement: "Virement",
  cb: "CB",
  stripe: "Stripe (CB)",
  cheque: "Chèque",
  especes: "Espèces",
  acompte: "Acompte",
  solde: "Solde",
};

const methodLabel = (m: string | null | undefined): string =>
  (m && METHOD_LABELS[m]) || (m ?? "");

const dateShort = (iso: string | null | undefined) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
};

/**
 * Carte récapitulative paiements pour un devis :
 *   - barre de progression Acompte / Solde
 *   - lignes Acompte (state) / Solde (state)
 *
 * Utilisée côté Atmosphère (fiche devis) et côté portail client.
 */
export function PaymentProgress({
  totalTtc,
  acompteTtc,
  acomptePct,
  payment,
  variant = "atmo",
}: {
  totalTtc: number;
  acompteTtc: number;
  acomptePct: number;
  payment: PaymentMethodLabel;
  variant?: "atmo" | "client";
}) {
  const solde = Math.max(0, totalTtc - acompteTtc);
  const paidTtc =
    (payment.acomptePaid ? acompteTtc : 0) + (payment.soldePaid ? solde : 0);
  const paidPct = totalTtc > 0 ? Math.round((paidTtc / totalTtc) * 100) : 0;

  const isFullyPaid = payment.acomptePaid && payment.soldePaid;

  return (
    <div
      className={
        variant === "client"
          ? "rounded-2xl border border-line bg-white p-5"
          : "rounded-2xl border border-line bg-canvas-2/30 p-5"
      }
    >
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-2">
          Paiement
        </p>
        <p
          className={`text-[12.5px] tabular-nums font-semibold ${
            isFullyPaid ? "text-emerald" : "text-ink"
          }`}
        >
          {eur(paidTtc, true)} / {eur(totalTtc, true)}
        </p>
      </div>

      {/* Barre de progression */}
      <div className="h-2 rounded-full bg-line/60 overflow-hidden mb-4">
        <div
          className={`h-full ${
            isFullyPaid ? "bg-emerald" : "bg-violet"
          } transition-all`}
          style={{ width: `${paidPct}%` }}
        />
      </div>

      {/* Lignes Acompte / Solde */}
      <div className="space-y-2">
        <PaymentLine
          label={`Acompte ${acomptePct}%`}
          amount={acompteTtc}
          paid={payment.acomptePaid}
          method={payment.acompteMethod}
          paidAt={payment.acompteAt}
        />
        {acomptePct < 100 && (
          <PaymentLine
            label="Solde avant pose"
            amount={solde}
            paid={payment.soldePaid}
            method={payment.soldeMethod}
            paidAt={payment.soldeAt}
          />
        )}
      </div>
    </div>
  );
}

function PaymentLine({
  label,
  amount,
  paid,
  method,
  paidAt,
}: {
  label: string;
  amount: number;
  paid: boolean;
  method?: string | null;
  paidAt?: string | null;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
        paid
          ? "bg-emerald-soft/40 border-emerald/30"
          : "bg-white border-line"
      }`}
    >
      <div
        className={`h-7 w-7 rounded-md inline-flex items-center justify-center shrink-0 ${
          paid ? "bg-emerald text-white" : "bg-canvas-2 text-muted-2"
        }`}
      >
        {paid ? (
          <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />
        ) : (
          <Clock className="h-4 w-4" strokeWidth={2.2} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold text-ink leading-tight">
          {label}
        </p>
        <p className="text-[11px] text-muted-2 mt-0.5">
          {paid
            ? `Réglé${paidAt ? ` le ${dateShort(paidAt)}` : ""}${
                method ? ` · ${methodLabel(method)}` : ""
              }`
            : "En attente"}
        </p>
      </div>
      <p
        className={`text-[13.5px] tabular-nums font-semibold shrink-0 ${
          paid ? "text-emerald" : "text-ink"
        }`}
      >
        {eur(amount, true)}
      </p>
    </div>
  );
}
