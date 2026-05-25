"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  FileText,
  CreditCard,
  Sparkles,
  Truck,
  Wrench,
  Scissors,
  Clock,
  Phone,
  Mail,
  AlertCircle,
} from "lucide-react";
import { createStripeCheckoutForToken } from "./actions";

type DevisVM = {
  id: string;
  number: string;
  status: string;
  statusLabel: string;
  total_ttc: number;
  acompte_ttc: number;
  product_summary: string;
  product_detail: string | null;
  tva_rate: number;
  valid_until: string | null;
  sent_at: string | null;
  created_at: string;
};

type ClientVM = {
  display_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
};

type LineVM = {
  ref: string | null;
  label: string;
  detail: string | null;
  qty: number;
  unit_label: string;
  unit_price_ht: number;
};

type DossierVM = {
  number: string;
  status: string;
  scheduled_pose_at: string | null;
  itemsTotal: number;
  itemsReceived: number;
};

type PoseVM = {
  scheduled_at: string | null;
  status: string;
  completed_at: string | null;
};

type PaymentVM = {
  kind: string;
  amount_ttc: number;
  method: string;
  paid_at: string;
};

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n);

const formatDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(iso))
    : "—";

const formatDateTime = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(
        new Date(iso),
      )
    : "—";

export function ClientPortal({
  token,
  paidJustNow,
  devis,
  client,
  lines,
  dossier,
  pose,
  payments,
}: {
  token: string;
  paidJustNow: boolean;
  devis: DevisVM;
  client: ClientVM | null;
  lines: LineVM[];
  dossier: DossierVM | null;
  pose: PoseVM | null;
  payments: PaymentVM[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const totalHt = lines.reduce((a, l) => a + l.qty * l.unit_price_ht, 0);
  const acomptePaye = devis.status === "acompte_recu" || payments.some((p) => p.kind === "acompte");
  const soldePaye = payments.some((p) => p.kind === "solde");
  const solde = Math.max(0, devis.total_ttc - devis.acompte_ttc);

  const handlePay = () => {
    setError(null);
    startTransition(async () => {
      const r = await createStripeCheckoutForToken(token);
      if (r.ok) {
        window.location.href = r.url;
      } else {
        setError(r.message);
      }
    });
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="bg-white border-b border-line">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-pastel-yellow text-pastel-yellow-ink flex items-center justify-center font-bold text-[15px]">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-ink leading-tight">
              Atmosphère Tissus
            </p>
            <p className="text-[11.5px] text-muted-2">
              Espace client · {client?.display_name ?? "Votre devis"}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Notif paiement vient de réussir */}
        {paidJustNow && !acomptePaye && (
          <div className="rounded-xl bg-amber-soft border border-amber/30 p-4 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-amber shrink-0 mt-0.5" strokeWidth={2.2} />
            <div>
              <p className="text-[14px] font-semibold text-amber">Traitement de votre paiement…</p>
              <p className="text-[12.5px] text-amber/90 mt-0.5">
                Le webhook Stripe va confirmer votre paiement d'ici quelques secondes. Recharge la
                page si rien ne s'affiche après 30 s.
              </p>
            </div>
          </div>
        )}

        {/* Status badge + actions principales */}
        <section className="bg-white rounded-2xl border border-line p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
                Devis n° {devis.number}
              </p>
              <h1 className="text-[22px] font-semibold tracking-tight text-ink leading-tight">
                {devis.product_summary}
              </h1>
              {devis.product_detail && (
                <p className="text-[13px] text-muted mt-1">{devis.product_detail}</p>
              )}
            </div>
            <StatusPill status={devis.status} label={devis.statusLabel} />
          </div>

          <div className="rounded-xl bg-canvas-2/50 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-2">
                Total TTC
              </p>
              <p className="text-[22px] font-bold text-ink tabular-nums leading-tight">
                {eur(devis.total_ttc)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-2">
                Acompte 50 %
              </p>
              <p
                className={
                  acomptePaye
                    ? "text-[16px] font-semibold text-emerald tabular-nums"
                    : "text-[16px] font-semibold text-ink-2 tabular-nums"
                }
              >
                {eur(devis.acompte_ttc)}
                {acomptePaye && (
                  <span className="ml-2 text-[11px] inline-flex items-center gap-1 text-emerald font-medium">
                    <CheckCircle2 className="h-3 w-3" strokeWidth={2.4} /> Payé
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Actions selon le statut */}
          {!acomptePaye ? (
            <>
              <button
                onClick={handlePay}
                disabled={pending}
                className="w-full h-12 rounded-xl bg-emerald text-white font-bold text-[15px] hover:bg-emerald/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <CreditCard className="h-4 w-4" strokeWidth={2.4} />
                {pending ? "Ouverture de Stripe…" : `Accepter et payer ${eur(devis.acompte_ttc)} d'acompte`}
              </button>
              <p className="text-[11.5px] text-muted-2 text-center">
                Paiement 100 % sécurisé via Stripe · CB acceptée · vous restez maître de votre
                commande
              </p>
              {error && (
                <div className="rounded-lg bg-pink-soft border border-pink/30 px-3 py-2 text-[12px] text-pink flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" strokeWidth={2.2} />
                  {error}
                </div>
              )}
            </>
          ) : !soldePaye && pose?.status === "pose" ? (
            <div className="rounded-xl bg-blue-soft border border-blue/30 p-4">
              <p className="text-[13px] font-semibold text-blue mb-1">Solde à régler</p>
              <p className="text-[12.5px] text-blue/90">
                Votre pose est terminée. Le solde de <strong>{eur(solde)}</strong> reste à régler.
                Atmosphère vous a contacté pour l'encaissement.
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-emerald-soft border border-emerald/30 p-4">
              <p className="text-[13px] font-semibold text-emerald flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />
                Votre acompte est bien encaissé
              </p>
              <p className="text-[12.5px] text-emerald/90 mt-1">
                Suivi de votre commande ci-dessous. Le solde de <strong>{eur(solde)}</strong>
                {" "}sera dû avant la pose.
              </p>
            </div>
          )}

          <a
            href={`/devis/${devis.id}/pdf`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 text-[12.5px] text-violet hover:underline"
          >
            <FileText className="h-3.5 w-3.5" strokeWidth={2.2} />
            Télécharger le PDF du devis
          </a>
        </section>

        {/* Timeline (si dossier existe) */}
        {dossier && <Timeline dossier={dossier} pose={pose} />}

        {/* Détail des lignes */}
        <section className="bg-white rounded-2xl border border-line overflow-hidden">
          <div className="px-5 py-3 border-b border-line">
            <h2 className="text-[14px] font-semibold text-ink">Détail du devis</h2>
          </div>
          <div className="divide-y divide-line">
            {lines.map((l, i) => (
              <div key={i} className="px-5 py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] text-ink-2 font-medium">{l.label}</p>
                  {l.detail && <p className="text-[12px] text-muted mt-0.5">{l.detail}</p>}
                  {l.ref && (
                    <p className="text-[11px] text-muted-2 font-mono mt-0.5">Réf : {l.ref}</p>
                  )}
                </div>
                <div className="text-right shrink-0 tabular-nums">
                  <p className="text-[12px] text-muted-2">
                    {l.qty} {l.unit_label}{l.qty > 1 ? "s" : ""} × {eur(l.unit_price_ht)} HT
                  </p>
                  <p className="text-[13px] font-semibold text-ink-2 mt-0.5">
                    {eur(l.qty * l.unit_price_ht)} HT
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-canvas-2/40 border-t border-line space-y-1 text-[12.5px]">
            <div className="flex justify-between">
              <span className="text-muted">Total HT</span>
              <span className="text-ink-2 font-medium tabular-nums">{eur(totalHt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">TVA {devis.tva_rate}%</span>
              <span className="text-ink-2 font-medium tabular-nums">
                {eur(totalHt * (devis.tva_rate / 100))}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-line">
              <span className="text-ink font-semibold">Total TTC</span>
              <span className="text-ink font-bold tabular-nums">{eur(devis.total_ttc)}</span>
            </div>
          </div>
        </section>

        {/* Historique paiements */}
        {payments.length > 0 && (
          <section className="bg-white rounded-2xl border border-line overflow-hidden">
            <div className="px-5 py-3 border-b border-line">
              <h2 className="text-[14px] font-semibold text-ink">Paiements enregistrés</h2>
            </div>
            <div className="divide-y divide-line">
              {payments.map((p, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between gap-3 text-[12.5px]">
                  <div>
                    <p className="text-ink-2 font-medium capitalize">{p.kind}</p>
                    <p className="text-[11px] text-muted">
                      {formatDateTime(p.paid_at)} · {p.method}
                    </p>
                  </div>
                  <p className="font-semibold text-emerald tabular-nums">{eur(p.amount_ttc)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer contact */}
        <section className="bg-white rounded-2xl border border-line p-5">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-2 mb-3">
            Une question ?
          </p>
          <div className="flex flex-col gap-2 text-[13px]">
            <a
              href="mailto:contact@atmospheretissus.fr"
              className="inline-flex items-center gap-2 text-ink-2 hover:text-violet"
            >
              <Mail className="h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
              contact@atmospheretissus.fr
            </a>
            <a
              href="tel:+33556000000"
              className="inline-flex items-center gap-2 text-ink-2 hover:text-violet"
            >
              <Phone className="h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
              05 56 00 00 00
            </a>
          </div>
        </section>

        <p className="text-center text-[11px] text-muted-2 pt-2 pb-8">
          Atmosphère Tissus · 33 cours du Maréchal Foch, 33000 Bordeaux · atmospheretissus.fr
        </p>
      </main>
    </div>
  );
}

function StatusPill({ status, label }: { status: string; label: string }) {
  const tone =
    status === "acompte_recu"
      ? "bg-emerald-soft text-emerald"
      : status === "valide"
        ? "bg-violet-soft text-violet"
        : status === "envoye"
          ? "bg-blue-soft text-blue"
          : status === "refuse" || status === "expire"
            ? "bg-pink-soft text-pink"
            : "bg-canvas-2 text-muted-2";
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold ${tone}`}>
      {label}
    </span>
  );
}

function Timeline({
  dossier,
  pose,
}: {
  dossier: DossierVM;
  pose: PoseVM | null;
}) {
  // Calcul des étapes franchies
  const steps = [
    {
      key: "acompte",
      label: "Acompte encaissé",
      sublabel: "Votre commande est lancée",
      icon: CheckCircle2,
      done: true, // si dossier existe, l'acompte est forcément reçu
    },
    {
      key: "production",
      label: "En préparation",
      sublabel: `${dossier.itemsReceived}/${dossier.itemsTotal} colis reçus chez nous`,
      icon: Truck,
      done: dossier.itemsReceived > 0,
      current: dossier.itemsReceived > 0 && dossier.itemsReceived < dossier.itemsTotal,
    },
    {
      key: "ready",
      label: "Prêt pour pose",
      sublabel: "Tous les éléments sont prêts",
      icon: Scissors,
      done: dossier.status === "pret_pose" || dossier.status === "planifie" || dossier.status === "pose",
    },
    {
      key: "scheduled",
      label: pose?.scheduled_at
        ? `Pose planifiée le ${formatDate(pose.scheduled_at)}`
        : "Pose à planifier",
      sublabel: pose?.scheduled_at
        ? "Vous serez recontacté pour confirmer"
        : "Notre équipe va vous appeler pour fixer un RDV",
      icon: Clock,
      done: Boolean(pose?.scheduled_at),
    },
    {
      key: "done",
      label: pose?.completed_at ? `Pose effectuée le ${formatDate(pose.completed_at)}` : "Pose effectuée",
      sublabel: "Commande terminée",
      icon: Wrench,
      done: pose?.status === "pose",
    },
  ];

  return (
    <section className="bg-white rounded-2xl border border-line overflow-hidden">
      <div className="px-5 py-3 border-b border-line">
        <h2 className="text-[14px] font-semibold text-ink">Suivi de votre commande</h2>
        <p className="text-[11.5px] text-muted-2 mt-0.5">
          Dossier {dossier.number}
        </p>
      </div>
      <div className="p-5">
        <ol className="space-y-4">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const tone = s.done
              ? "bg-emerald text-white"
              : "current" in s && s.current
                ? "bg-violet text-white animate-pulse"
                : "bg-canvas-2 text-muted-2";
            return (
              <li key={s.key} className="flex items-start gap-3">
                <div className={`h-8 w-8 rounded-full shrink-0 inline-flex items-center justify-center ${tone}`}>
                  <Icon className="h-4 w-4" strokeWidth={2.4} />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p
                    className={
                      s.done
                        ? "text-[13.5px] font-semibold text-ink"
                        : "current" in s && s.current
                          ? "text-[13.5px] font-semibold text-violet"
                          : "text-[13.5px] font-medium text-muted"
                    }
                  >
                    {s.label}
                  </p>
                  <p className="text-[12px] text-muted-2 mt-0.5">{s.sublabel}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="absolute" /> // placeholder pour ligne verticale (skip pour simplicité)
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
