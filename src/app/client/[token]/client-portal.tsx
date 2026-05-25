"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  CreditCard,
  Sparkles,
  Truck,
  Wrench,
  Scissors,
  Clock,
  Phone,
  Mail,
  AlertCircle,
  MapPin,
  Shield,
  Heart,
  FileText,
  Circle,
  Banknote,
  CalendarCheck,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
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
    ? new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date(iso))
    : "—";

const formatDateTime = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(iso))
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

  // Statuts paiement
  const acomptePaye =
    devis.status === "acompte_recu" || payments.some((p) => p.kind === "acompte");
  const soldePaye = payments.some((p) => p.kind === "solde");
  const solde = Math.max(0, devis.total_ttc - devis.acompte_ttc);

  // Statuts dossier
  const dossierPretOrAfter = Boolean(
    dossier &&
      (dossier.status === "pret_pose" ||
        dossier.status === "planifie" ||
        dossier.status === "pose"),
  );
  const peutPayerSolde = acomptePaye && !soldePaye && dossierPretOrAfter;
  const poseDone = pose?.status === "pose";

  const firstName =
    client?.display_name?.split(" ")?.[0] ??
    client?.display_name?.split(",")[0] ??
    "Bonjour";

  const handlePay = (kind: "acompte" | "solde") => {
    setError(null);
    startTransition(async () => {
      const r = await createStripeCheckoutForToken(token, kind);
      if (r.ok) {
        window.location.href = r.url;
      } else {
        setError(r.message);
      }
    });
  };

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-white border-b border-line">
        <div className="max-w-2xl mx-auto px-5 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Logo />
          <div className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-muted-2">
            <Shield className="h-3 w-3" strokeWidth={2.2} />
            Espace sécurisé
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5 sm:space-y-6">
        {/* Salutation */}
        <div>
          <p className="eyebrow mb-2">Devis n° {devis.number}</p>
          <h1 className="text-[26px] sm:text-[32px] font-semibold tracking-tight text-ink leading-[1.1]">
            Bonjour {firstName},
          </h1>
          <p className="text-[14px] sm:text-[15px] text-muted mt-2 leading-relaxed">
            {!acomptePaye
              ? "Voici votre devis personnalisé. Vous pouvez l'accepter et payer l'acompte en quelques clics."
              : peutPayerSolde
                ? "Votre commande est prête. Réglez le solde pour qu'on planifie ensemble la pose."
                : soldePaye && !poseDone
                  ? "Tout est réglé. Notre équipe va vous recontacter pour fixer le rendez-vous de pose."
                  : poseDone
                    ? "Votre pose est terminée. Merci d'avoir choisi Atmosphère Tissus."
                    : "Votre commande est entre les mains de notre équipe. Suivi en temps réel ci-dessous."}
          </p>
        </div>

        {/* Bannière post-Stripe */}
        {paidJustNow && (
          <div className="rounded-xl bg-emerald-soft border border-emerald/30 p-4 flex items-start gap-3 animate-fade-up">
            <CheckCircle2
              className="h-5 w-5 text-emerald shrink-0 mt-0.5"
              strokeWidth={2.4}
            />
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-emerald">
                Paiement reçu — merci !
              </p>
              <p className="text-[12.5px] text-emerald/90 mt-0.5 leading-relaxed">
                Si l'état ci-dessous n'est pas encore mis à jour, recharge la page d'ici
                quelques secondes — notre système est en train de l'enregistrer.
              </p>
            </div>
          </div>
        )}

        {/* CARTE PRINCIPALE — état + montants + CTA */}
        <section className="bg-white rounded-2xl border border-line shadow-[0_2px_12px_rgba(15,23,42,0.04)] overflow-hidden">
          <StateBanner
            acomptePaye={acomptePaye}
            soldePaye={soldePaye}
            peutPayerSolde={peutPayerSolde}
            poseDone={poseDone}
            productSummary={devis.product_summary}
            productDetail={devis.product_detail}
          />

          <div className="px-5 sm:px-6 py-5 space-y-4">
            {/* 3 montants */}
            <div className="grid grid-cols-3 gap-3">
              <AmountTile label="Total TTC" value={eur(devis.total_ttc)} muted />
              <AmountTile
                label="Acompte"
                value={eur(devis.acompte_ttc)}
                tone={acomptePaye ? "done" : "neutral"}
                check={acomptePaye}
              />
              <AmountTile
                label="Solde"
                value={eur(solde)}
                tone={soldePaye ? "done" : peutPayerSolde ? "due" : "neutral"}
                check={soldePaye}
              />
            </div>

            {/* CTA contextuel */}
            <div className="pt-1">
              {!acomptePaye ? (
                <ButtonPay
                  onClick={() => handlePay("acompte")}
                  loading={pending}
                  variant="emerald"
                  icon={<CreditCard className="h-4 w-4" strokeWidth={2.4} />}
                  label={`Accepter et payer l'acompte ${eur(devis.acompte_ttc)}`}
                  hint="Paiement 100 % sécurisé · CB · Stripe"
                />
              ) : peutPayerSolde ? (
                <ButtonPay
                  onClick={() => handlePay("solde")}
                  loading={pending}
                  variant="blue"
                  icon={<Banknote className="h-4 w-4" strokeWidth={2.4} />}
                  label={`Régler le solde ${eur(solde)} pour planifier la pose`}
                  hint="Votre commande est prête · paiement sécurisé · CB"
                />
              ) : soldePaye && !poseDone ? (
                <InfoBadge
                  tone="violet"
                  icon={<CalendarCheck className="h-4 w-4" strokeWidth={2.4} />}
                  title="Tout est réglé"
                  subtitle="Notre équipe vous recontacte pour fixer la date de pose."
                />
              ) : poseDone ? (
                <InfoBadge
                  tone="emerald"
                  icon={<Heart className="h-4 w-4 fill-current" strokeWidth={2.4} />}
                  title="Pose terminée"
                  subtitle="Merci pour votre confiance. Une question ? Contactez-nous ci-dessous."
                />
              ) : (
                <InfoBadge
                  tone="amber"
                  icon={<Sparkles className="h-4 w-4" strokeWidth={2.4} />}
                  title="Acompte reçu — production en cours"
                  subtitle={
                    dossier
                      ? `${dossier.itemsReceived}/${dossier.itemsTotal} éléments réceptionnés chez Atmosphère`
                      : "Nous lançons les commandes auprès de nos fournisseurs."
                  }
                />
              )}

              {error && (
                <div className="mt-3 rounded-lg bg-pink-soft border border-pink/30 px-3 py-2 text-[12.5px] text-pink flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" strokeWidth={2.2} />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <a
              href={`/devis/${devis.id}/pdf`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink-2 transition-colors pt-1"
            >
              <FileText className="h-3.5 w-3.5" strokeWidth={2.2} />
              Télécharger le PDF du devis
            </a>
          </div>
        </section>

        {/* TIMELINE */}
        {dossier && (
          <Timeline
            dossier={dossier}
            pose={pose}
            soldePaye={soldePaye}
            acomptePaye={acomptePaye}
          />
        )}

        {/* DÉTAIL DEVIS */}
        <section className="bg-white rounded-2xl border border-line overflow-hidden">
          <SectionHeader
            title="Détail"
            subtitle={`${lines.length} ${lines.length > 1 ? "éléments" : "élément"}`}
          />
          <ul className="divide-y divide-line">
            {lines.map((l, i) => (
              <li
                key={i}
                className="px-5 sm:px-6 py-4 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-ink-2 font-medium leading-tight">
                    {l.label}
                  </p>
                  {l.detail && (
                    <p className="text-[12.5px] text-muted mt-1 leading-snug">
                      {l.detail}
                    </p>
                  )}
                  {l.ref && (
                    <p className="text-[11px] text-muted-2 font-mono mt-1">
                      Réf : {l.ref}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0 tabular-nums">
                  <p className="text-[11.5px] text-muted-2">
                    {l.qty} {l.unit_label}
                    {l.qty > 1 && l.unit_label.length <= 3 ? "s" : ""}
                    {" × "}
                    {eur(l.unit_price_ht)}
                  </p>
                  <p className="text-[14px] font-semibold text-ink-2 mt-0.5">
                    {eur(l.qty * l.unit_price_ht)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="px-5 sm:px-6 py-4 bg-canvas-2/40 border-t border-line space-y-1.5">
            <Row label="Total HT" value={eur(totalHt)} />
            <Row
              label={`TVA ${devis.tva_rate}%`}
              value={eur(totalHt * (devis.tva_rate / 100))}
            />
            <div className="pt-2 border-t border-line">
              <Row label="Total TTC" value={eur(devis.total_ttc)} strong />
            </div>
          </div>
        </section>

        {/* PAIEMENTS */}
        {payments.length > 0 && (
          <section className="bg-white rounded-2xl border border-line overflow-hidden">
            <SectionHeader
              title="Paiements"
              subtitle={
                payments.length === 1 ? "1 paiement reçu" : `${payments.length} paiements reçus`
              }
            />
            <ul className="divide-y divide-line">
              {payments.map((p, i) => (
                <li
                  key={i}
                  className="px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-emerald-soft inline-flex items-center justify-center shrink-0">
                      <CheckCircle2
                        className="h-4 w-4 text-emerald"
                        strokeWidth={2.4}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13.5px] text-ink-2 font-semibold capitalize leading-tight">
                        {p.kind === "acompte"
                          ? "Acompte"
                          : p.kind === "solde"
                            ? "Solde"
                            : p.kind}
                      </p>
                      <p className="text-[11.5px] text-muted mt-0.5">
                        {formatDateTime(p.paid_at)} · {p.method}
                      </p>
                    </div>
                  </div>
                  <p className="text-[14px] font-semibold text-emerald tabular-nums shrink-0">
                    {eur(p.amount_ttc)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CONTACT */}
        <section className="bg-white rounded-2xl border border-line p-5 sm:p-6">
          <p className="eyebrow mb-3">Une question ?</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <a
              href="mailto:contact@atmospheretissus.fr"
              className="flex items-center gap-3 px-3.5 py-3 rounded-lg border border-line hover:border-line-strong hover:bg-canvas-2/40 transition-colors group"
            >
              <div className="h-9 w-9 rounded-lg bg-violet-soft inline-flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-violet" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted uppercase tracking-wider font-semibold leading-tight">
                  Email
                </p>
                <p className="text-[13px] text-ink-2 truncate mt-0.5 group-hover:text-violet">
                  contact@atmospheretissus.fr
                </p>
              </div>
            </a>
            <a
              href="tel:+33556000000"
              className="flex items-center gap-3 px-3.5 py-3 rounded-lg border border-line hover:border-line-strong hover:bg-canvas-2/40 transition-colors group"
            >
              <div className="h-9 w-9 rounded-lg bg-violet-soft inline-flex items-center justify-center shrink-0">
                <Phone className="h-4 w-4 text-violet" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted uppercase tracking-wider font-semibold leading-tight">
                  Téléphone
                </p>
                <p className="text-[13px] text-ink-2 truncate mt-0.5 group-hover:text-violet">
                  05 56 00 00 00
                </p>
              </div>
            </a>
          </div>
        </section>

        <div className="text-center pt-4 pb-6 space-y-2">
          <div className="inline-flex items-center justify-center">
            <Logo />
          </div>
          <p className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-2">
            <MapPin className="h-3 w-3" strokeWidth={2.2} />
            33 cours du Maréchal Foch, 33000 Bordeaux
          </p>
          <p className="text-[11px] text-muted-2">
            <a
              href="https://atmospheretissus.fr"
              className="hover:text-violet transition-colors"
            >
              atmospheretissus.fr
            </a>
            {" · "}
            <span>Espace personnel sécurisé · ne pas partager ce lien</span>
          </p>
        </div>
      </main>
    </div>
  );
}

// ════════════════════════════ COMPOSANTS ════════════════════════════

function StateBanner({
  acomptePaye,
  soldePaye,
  peutPayerSolde,
  poseDone,
  productSummary,
  productDetail,
}: {
  acomptePaye: boolean;
  soldePaye: boolean;
  peutPayerSolde: boolean;
  poseDone: boolean;
  productSummary: string;
  productDetail: string | null;
}) {
  const config = poseDone
    ? {
        gradient: "from-emerald to-emerald/85",
        label: "Pose effectuée",
        icon: Heart,
      }
    : soldePaye
      ? {
          gradient: "from-violet to-violet/85",
          label: "Tout est réglé",
          icon: CheckCircle2,
        }
      : peutPayerSolde
        ? {
            gradient: "from-blue to-blue/85",
            label: "Solde à régler",
            icon: Banknote,
          }
        : acomptePaye
          ? {
              gradient: "from-amber to-amber/85",
              label: "En préparation",
              icon: Truck,
            }
          : {
              gradient: "from-ink to-ink/90",
              label: "En attente de votre validation",
              icon: Sparkles,
            };
  const Icon = config.icon;

  return (
    <div
      className={`bg-gradient-to-br ${config.gradient} text-white px-5 sm:px-6 py-5 sm:py-6`}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur inline-flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" strokeWidth={2.4} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wider font-semibold opacity-80">
            {config.label}
          </p>
          <h2 className="text-[18px] sm:text-[20px] font-semibold tracking-tight leading-tight mt-0.5">
            {productSummary}
          </h2>
          {productDetail && (
            <p className="text-[13px] opacity-85 mt-1 leading-snug">{productDetail}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AmountTile({
  label,
  value,
  tone = "neutral",
  muted,
  check,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "done" | "due";
  muted?: boolean;
  check?: boolean;
}) {
  const valueClass =
    tone === "done"
      ? "text-emerald"
      : tone === "due"
        ? "text-blue"
        : muted
          ? "text-muted-2"
          : "text-ink-2";
  return (
    <div className="text-center">
      <p className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2">
        {label}
      </p>
      <p
        className={`text-[15px] sm:text-[17px] font-semibold tabular-nums mt-1.5 leading-tight ${valueClass}`}
      >
        {value}
      </p>
      {check && (
        <div className="inline-flex items-center gap-1 text-[10.5px] text-emerald font-semibold mt-1">
          <CheckCircle2 className="h-3 w-3" strokeWidth={2.4} />
          Payé
        </div>
      )}
    </div>
  );
}

function ButtonPay({
  onClick,
  loading,
  variant,
  icon,
  label,
  hint,
}: {
  onClick: () => void;
  loading: boolean;
  variant: "emerald" | "blue";
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  const bg =
    variant === "emerald"
      ? "bg-emerald hover:bg-emerald/90"
      : "bg-blue hover:bg-blue/90";
  return (
    <div className="space-y-2">
      <button
        onClick={onClick}
        disabled={loading}
        className={`w-full h-12 sm:h-13 rounded-xl ${bg} text-white font-semibold text-[14px] sm:text-[15px] inline-flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99] shadow-[0_1px_3px_rgba(15,23,42,0.12)]`}
      >
        {icon}
        <span>{loading ? "Ouverture du paiement sécurisé…" : label}</span>
      </button>
      <p className="text-center text-[11px] text-muted-2 inline-flex items-center justify-center gap-1.5 w-full">
        <Shield className="h-3 w-3" strokeWidth={2.2} />
        {hint}
      </p>
    </div>
  );
}

function InfoBadge({
  tone,
  icon,
  title,
  subtitle,
}: {
  tone: "emerald" | "violet" | "amber";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  const bg =
    tone === "emerald"
      ? "bg-emerald-soft border-emerald/20 text-emerald"
      : tone === "violet"
        ? "bg-violet-soft border-violet/20 text-violet"
        : "bg-amber-soft border-amber/20 text-amber";
  return (
    <div className={`rounded-xl border ${bg} px-4 py-3.5 flex items-start gap-3`}>
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold leading-tight">{title}</p>
        <p className="text-[12px] opacity-90 mt-0.5 leading-snug">{subtitle}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-5 sm:px-6 py-3.5 border-b border-line flex items-baseline justify-between gap-3">
      <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
      {subtitle && <p className="text-[11.5px] text-muted-2">{subtitle}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={
          strong ? "text-[14px] font-semibold text-ink" : "text-[12.5px] text-muted"
        }
      >
        {label}
      </span>
      <span
        className={
          strong
            ? "text-[16px] font-bold text-ink tabular-nums"
            : "text-[12.5px] text-ink-2 font-medium tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}

function Timeline({
  dossier,
  pose,
  soldePaye,
  acomptePaye,
}: {
  dossier: DossierVM;
  pose: PoseVM | null;
  soldePaye: boolean;
  acomptePaye: boolean;
}) {
  type StepState = "done" | "current" | "pending";
  type Step = {
    key: string;
    icon: typeof CheckCircle2;
    title: string;
    subtitle: string;
    state: StepState;
  };

  const allReceived =
    dossier.itemsTotal > 0 && dossier.itemsReceived === dossier.itemsTotal;
  const dossierPretOrAfter =
    dossier.status === "pret_pose" ||
    dossier.status === "planifie" ||
    dossier.status === "pose";

  const steps: Step[] = [
    {
      key: "acompte",
      icon: CreditCard,
      title: "Acompte encaissé",
      subtitle: "Votre commande est officiellement lancée",
      state: acomptePaye ? "done" : "pending",
    },
    {
      key: "production",
      icon: Truck,
      title: "En préparation",
      subtitle:
        dossier.itemsTotal === 0
          ? "Nous lançons les commandes fournisseurs"
          : `${dossier.itemsReceived} / ${dossier.itemsTotal} éléments réceptionnés chez Atmosphère`,
      state: allReceived
        ? "done"
        : acomptePaye
          ? "current"
          : "pending",
    },
    {
      key: "ready",
      icon: Scissors,
      title: "Prêt pour pose",
      subtitle: dossierPretOrAfter
        ? "Tous les éléments sont prêts à être installés"
        : "Vous serez prévenu·e dès que tout est arrivé",
      state: dossierPretOrAfter ? "done" : "pending",
    },
    {
      key: "solde",
      icon: Banknote,
      title: soldePaye ? "Solde réglé" : "Règlement du solde",
      subtitle: soldePaye
        ? "Pose à organiser ensemble"
        : "Avant la pose, le solde doit être réglé",
      state: soldePaye ? "done" : dossierPretOrAfter ? "current" : "pending",
    },
    {
      key: "scheduled",
      icon: Clock,
      title: pose?.scheduled_at
        ? `Pose le ${formatDate(pose.scheduled_at)}`
        : "Pose à planifier",
      subtitle: pose?.scheduled_at
        ? "Rendez-vous confirmé avec notre équipe"
        : "Notre équipe vous contactera pour fixer une date",
      state: pose?.scheduled_at
        ? pose?.status === "pose"
          ? "done"
          : "current"
        : "pending",
    },
    {
      key: "done",
      icon: Wrench,
      title: pose?.completed_at
        ? `Pose effectuée le ${formatDate(pose.completed_at)}`
        : "Pose effectuée",
      subtitle: "Profitez bien de votre nouvel intérieur",
      state: pose?.status === "pose" ? "done" : "pending",
    },
  ];

  return (
    <section className="bg-white rounded-2xl border border-line overflow-hidden">
      <SectionHeader
        title="Suivi de votre commande"
        subtitle={`Dossier ${dossier.number}`}
      />
      <div className="px-5 sm:px-6 py-5">
        <ol className="relative space-y-5">
          <div
            className="absolute left-[15px] top-2 bottom-2 w-px bg-line"
            aria-hidden
          />
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.key} className="relative flex items-start gap-4">
                <div
                  className={
                    "h-8 w-8 rounded-full shrink-0 inline-flex items-center justify-center relative z-10 ring-4 ring-white " +
                    (s.state === "done"
                      ? "bg-emerald text-white"
                      : s.state === "current"
                        ? "bg-violet text-white"
                        : "bg-canvas-2 text-muted-2")
                  }
                >
                  {s.state === "done" ? (
                    <CheckCircle2 className="h-4 w-4" strokeWidth={2.6} />
                  ) : s.state === "current" ? (
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
                  ) : (
                    <Circle className="h-3 w-3" strokeWidth={2.4} />
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p
                    className={
                      s.state === "done"
                        ? "text-[13.5px] font-semibold text-ink leading-tight"
                        : s.state === "current"
                          ? "text-[13.5px] font-semibold text-violet leading-tight"
                          : "text-[13.5px] font-medium text-muted leading-tight"
                    }
                  >
                    {s.title}
                  </p>
                  <p
                    className={
                      s.state === "pending"
                        ? "text-[12px] text-muted-2 mt-0.5 leading-snug"
                        : "text-[12px] text-muted mt-0.5 leading-snug"
                    }
                  >
                    {s.subtitle}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
