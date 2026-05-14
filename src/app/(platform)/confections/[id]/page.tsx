import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Package,
  QrCode,
  CheckCircle2,
  Circle,
  CircleDashed,
  AlertTriangle,
  Calendar,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Scissors,
  ArrowRight,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import { PlanPoseButton } from "@/components/confections/plan-pose-button";
import { getDossierDetail } from "@/lib/db/dossiers";
import { eur, shortDate } from "@/lib/formatters";

export const dynamic = "force-dynamic";

const dossierStatusLabels: Record<string, string> = {
  en_cours: "En commande",
  tout_commande: "Tout commandé",
  reception_partielle: "Réception partielle",
  en_confection: "En confection",
  pret_pose: "Prêt pour pose",
  planifie: "Planifié",
  pose: "Posé / Livré",
};

const dossierStatusTones: Record<string, "muted" | "blue" | "amber" | "violet" | "emerald" | "pink" | "neutral"> = {
  en_cours: "muted",
  tout_commande: "blue",
  reception_partielle: "amber",
  en_confection: "violet",
  pret_pose: "emerald",
  planifie: "pink",
  pose: "neutral",
};

const itemTypeChips: Record<string, { tone: "violet" | "orange" | "blue" | "pink" | "emerald"; label: string }> = {
  tissu: { tone: "violet", label: "Tissu" },
  rail: { tone: "blue", label: "Rail / mécanisme" },
  accessoire: { tone: "pink", label: "Accessoire" },
  autre: { tone: "orange", label: "Autre" },
  confection: { tone: "emerald", label: "Confection" },
};

const itemStatusTones: Record<string, "emerald" | "blue" | "muted" | "violet" | "danger"> = {
  recu: "emerald",
  commande: "blue",
  en_attente: "muted",
  confection: "violet",
  expedie: "blue",
  probleme: "danger",
};

const itemStatusLabels: Record<string, string> = {
  recu: "Reçu",
  commande: "Commandé",
  en_attente: "En attente",
  confection: "En confection",
  expedie: "Expédié",
  probleme: "Problème",
};

export default async function DossierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getDossierDetail(id);
  if (!result) notFound();
  const { dossier, client, items } = result;

  const initial = client?.display_name?.[0] ?? "?";
  const itemsReceived = items.filter((i) => i.status === "recu").length;
  const allReceived = itemsReceived === items.length && items.length > 0;
  const alerteSolde = !dossier.solde_paid && allReceived;

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Confections", href: "/confections" },
          { label: dossier.number },
        ]}
      />

      <div className="flex-1 overflow-auto">
        {/* HERO */}
        <section className="px-8 pt-10 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <p className="eyebrow">Dossier</p>
            <span className="text-muted-2">·</span>
            <StatusPill tone={dossierStatusTones[dossier.status]} pulse={dossier.status === "pret_pose"}>
              {dossierStatusLabels[dossier.status]}
            </StatusPill>
            {alerteSolde && (
              <StatusPill tone="danger">⚠ Solde dû</StatusPill>
            )}
          </div>

          <div className="flex items-end justify-between gap-8 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              <LetterAvatar initial={initial} tone={toneFor(client?.display_name ?? "")} size="lg" />
              <div>
                <h1 className="text-[34px] font-semibold tracking-tight text-ink leading-[1.1]">
                  {client?.display_name ?? "—"}
                </h1>
                <p className="text-[13.5px] text-muted mt-1.5">
                  {client?.city ?? ""} <span className="text-muted-2 mx-1">·</span> {dossier.number}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {dossier.devis_id && (
                <Link href={`/devis/${dossier.devis_id}`}>
                  <Button variant="ghost" size="sm">
                    Voir le devis →
                  </Button>
                </Link>
              )}
              <Link href={`/confections/${dossier.id}/fiche?inline=1`} target="_blank">
                <Button variant="secondary" size="sm">
                  <Scissors className="h-3.5 w-3.5" strokeWidth={2.4} /> Fiche couturier PDF
                </Button>
              </Link>
              <Link href="/reception">
                <Button variant="ghost" size="sm">
                  <QrCode className="h-3.5 w-3.5" strokeWidth={2.4} /> Scanner réception
                </Button>
              </Link>
              {dossier.status === "pret_pose" && dossier.solde_paid && (
                <PlanPoseButton dossierId={dossier.id} />
              )}
            </div>
          </div>
        </section>

        {/* Progress hero */}
        <section className="px-8 pb-6">
          <Card className="p-6">
            <div className="flex items-end justify-between mb-5 flex-wrap gap-4">
              <div>
                <p className="eyebrow mb-2">Avancement dossier</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-[44px] font-semibold tracking-tight tabular-nums leading-none">
                    <span className="text-ink">{itemsReceived}</span>
                    <span className="text-muted-2 font-normal mx-1.5">/</span>
                    <span className="text-muted-2">{items.length}</span>
                  </p>
                  <p className="text-[13px] text-muted pb-1">éléments reçus</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <DeblocageBadge label="Acompte reçu" done={dossier.acompte_paid} />
                <DeblocageBadge label={`Tous reçus (${itemsReceived}/${items.length})`} done={allReceived} />
                <DeblocageBadge label="Solde réglé" done={dossier.solde_paid} />
                <span className="text-muted-2 mx-1 text-[13px]">→</span>
                <DeblocageBadge label="Pose débloquée" done={allReceived && dossier.solde_paid} final />
              </div>
            </div>

            <div className="flex gap-1 h-2">
              {Array.from({ length: items.length || 1 }).map((_, i) => (
                <span
                  key={i}
                  className={
                    "flex-1 rounded-full transition-colors " +
                    (i < itemsReceived ? "bg-emerald" : "bg-canvas-2 border border-line")
                  }
                />
              ))}
            </div>
          </Card>
        </section>

        {/* Items */}
        <section className="px-8 pb-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          <Card className="overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
              <div>
                <p className="eyebrow mb-1">Éléments du dossier</p>
                <h2 className="text-[15px] font-semibold text-ink">QR codes & réceptions</h2>
              </div>
              <span className="ref">{items.length} item{items.length > 1 ? "s" : ""}</span>
            </div>

            {items.length === 0 ? (
              <div className="px-5 py-10 text-center text-muted-2 text-[13px]">
                Aucun élément dans ce dossier.
              </div>
            ) : (
              <div className="divide-y divide-line">
                {items.map((item) => {
                  const chip = itemTypeChips[item.type];
                  return (
                    <div key={item.id} className="px-5 py-4 flex items-center gap-4 hover:bg-canvas-2/30 transition-colors">
                      {item.status === "recu" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald shrink-0" strokeWidth={2} />
                      ) : item.status === "confection" ? (
                        <div className="h-5 w-5 rounded-full bg-violet-soft border-2 border-violet inline-flex items-center justify-center shrink-0">
                          <Scissors className="h-2.5 w-2.5 text-violet" strokeWidth={2.5} />
                        </div>
                      ) : (
                        <Circle className="h-5 w-5 text-muted-2 shrink-0" strokeWidth={1.8} />
                      )}

                      <ColorChip tone={chip.tone} size="md">
                        <Package className="h-3.5 w-3.5" strokeWidth={2.2} />
                      </ColorChip>

                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-ink leading-tight truncate">{item.label}</p>
                        <p className="text-[11.5px] text-muted mt-0.5 truncate">
                          {item.ref && <span className="font-mono">{item.ref}</span>}
                          {item.notes && <span className="text-muted-2 ml-1">{item.notes}</span>}
                        </p>
                      </div>

                      <div className="hidden md:flex items-center gap-2 shrink-0">
                        <div className="h-9 w-9 rounded-md bg-canvas-2 border border-line inline-flex items-center justify-center">
                          <QrCode className="h-4 w-4 text-ink-3" strokeWidth={2} />
                        </div>
                        <span className="ref">{item.qr_code}</span>
                      </div>

                      <StatusPill tone={itemStatusTones[item.status]}>
                        {itemStatusLabels[item.status]}
                      </StatusPill>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <p className="eyebrow mb-3">Paiement</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {dossier.acompte_paid ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald" strokeWidth={2.2} />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-2" strokeWidth={1.8} />
                    )}
                    <span className="text-[13px] text-ink-2">Acompte 50%</span>
                  </div>
                  <span className="text-[13.5px] font-semibold tabular-nums text-ink">
                    {eur(Number(dossier.total_ttc) * 0.5)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {dossier.solde_paid ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald" strokeWidth={2.2} />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-2" strokeWidth={1.8} />
                    )}
                    <span className="text-[13px] text-ink-2">Solde</span>
                  </div>
                  <span className={`text-[13.5px] font-semibold tabular-nums ${dossier.solde_paid ? "text-ink" : "text-red"}`}>
                    {eur(Number(dossier.total_ttc) * 0.5)}
                  </span>
                </div>
                <div className="pt-3 border-t border-line flex items-center justify-between">
                  <span className="text-[12px] text-muted-2 font-medium uppercase tracking-wider">Total TTC</span>
                  <span className="text-[18px] font-semibold tabular-nums text-ink">
                    {eur(Number(dossier.total_ttc))}
                  </span>
                </div>
              </div>
            </Card>

            {client && (
              <Card className="p-5">
                <p className="eyebrow mb-3">Contact client</p>
                <div className="space-y-2.5">
                  {client.email && <ContactField icon={Mail} value={client.email} tone="blue" />}
                  {client.phone && <ContactField icon={Phone} value={client.phone} tone="emerald" />}
                  {(client.address_pose || client.city) && (
                    <ContactField
                      icon={MapPin}
                      value={[client.address_pose, client.city].filter(Boolean).join(" · ")}
                      tone="pink"
                    />
                  )}
                </div>
              </Card>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function DeblocageBadge({
  label,
  done,
  final,
}: {
  label: string;
  done: boolean;
  final?: boolean;
}) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11.5px] font-medium border " +
        (done
          ? final
            ? "bg-emerald text-white border-emerald"
            : "bg-emerald-soft text-emerald border-emerald/20"
          : "bg-canvas-2 text-muted border-line")
      }
    >
      {done ? (
        <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
      ) : (
        <Circle className="h-3 w-3" strokeWidth={2} />
      )}
      {label}
    </span>
  );
}

function ContactField({
  icon: Icon,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  value: string;
  tone: "violet" | "pink" | "orange" | "emerald" | "blue";
}) {
  return (
    <div className="flex items-center gap-2.5 text-[12.5px]">
      <ColorChip tone={tone} size="sm">
        <Icon className="h-3 w-3" strokeWidth={2.4} />
      </ColorChip>
      <span className="text-ink-2 truncate">{value}</span>
    </div>
  );
}
