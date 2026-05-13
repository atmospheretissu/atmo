import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Scissors,
  Package,
  QrCode,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Calendar,
  CreditCard,
  Truck,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  MoreHorizontal,
  Plus,
  Send,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import {
  dossiers,
  dossierStatusLabels,
  dossierStatusTones,
  DossierItem,
} from "@/lib/mock-data";
import { eur, shortDate } from "@/lib/formatters";

const itemTypeChips: Record<DossierItem["type"], { tone: "violet" | "orange" | "blue" | "pink" | "emerald"; icon: typeof Package; label: string }> = {
  tissu: { tone: "violet", icon: Package, label: "Tissu" },
  rail: { tone: "blue", icon: Package, label: "Rail / tringle" },
  accessoire: { tone: "pink", icon: Package, label: "Accessoire" },
  autre: { tone: "orange", icon: Package, label: "Autre" },
  confection: { tone: "emerald", icon: Scissors, label: "Confection" },
};

const itemStatusTones: Record<DossierItem["status"], "emerald" | "blue" | "muted" | "violet"> = {
  recu: "emerald",
  commande: "blue",
  en_attente: "muted",
  confection: "violet",
};

const itemStatusLabels: Record<DossierItem["status"], string> = {
  recu: "Reçu",
  commande: "Commandé",
  en_attente: "En attente",
  confection: "En confection",
};

export default async function DossierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const d = dossiers.find((x) => x.id === id);
  if (!d) notFound();

  const initial = d.client.includes(",")
    ? (d.client.split(",")[1].trim()[0] ?? d.client[0])
    : d.client[0];

  const acompte = d.totalTTC * 0.5;
  const solde = d.totalTTC - acompte;
  const alerteSolde = !d.soldeRegle && d.itemsReceived === d.itemsTotal && d.itemsTotal > 0;
  const allReceived = d.itemsReceived === d.itemsTotal && d.itemsTotal > 0;

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Confections", href: "/confections" },
          { label: d.number },
        ]}
      />

      <div className="flex-1 overflow-auto">
        {/* HERO */}
        <section className="px-8 pt-10 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <p className="eyebrow">Dossier</p>
            <span className="text-muted-2">·</span>
            <StatusPill tone={dossierStatusTones[d.status]} pulse={d.status === "pret_pose"}>
              {dossierStatusLabels[d.status]}
            </StatusPill>
            {alerteSolde && (
              <StatusPill tone="danger">⚠ Solde dû</StatusPill>
            )}
          </div>

          <div className="flex items-end justify-between gap-8 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              <LetterAvatar initial={initial} tone={toneFor(d.client)} size="lg" />
              <div>
                <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1]">
                  {d.client}
                </h1>
                <p className="text-[13.5px] text-muted mt-1.5">
                  {d.city} <span className="text-muted-2 mx-1">·</span> {d.number}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Send className="h-3.5 w-3.5" strokeWidth={2.2} /> Relancer fournisseur
              </Button>
              <Button variant="secondary" size="sm">
                <Calendar className="h-3.5 w-3.5" strokeWidth={2.2} /> Planifier pose
              </Button>
              <Button variant="primary" size="sm">
                <QrCode className="h-3.5 w-3.5" strokeWidth={2.4} /> Scanner réception
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Plus">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Progress hero */}
        <section className="px-8 pb-6">
          <Card className="p-6">
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="eyebrow mb-2">Avancement dossier</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-[44px] font-semibold tracking-tight tabular-nums leading-none">
                    <span className="text-ink">{d.itemsReceived}</span>
                    <span className="text-muted-2 font-normal mx-1.5">/</span>
                    <span className="text-muted-2">{d.itemsTotal}</span>
                  </p>
                  <p className="text-[13px] text-muted pb-1">éléments reçus</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <DeblocageBadge
                  label="Acompte reçu"
                  done={true}
                />
                <DeblocageBadge
                  label={`Tous reçus (${d.itemsReceived}/${d.itemsTotal})`}
                  done={allReceived}
                />
                <DeblocageBadge
                  label="Solde réglé"
                  done={d.soldeRegle}
                />
                <span className="text-muted-2 mx-1 text-[13px]">→</span>
                <DeblocageBadge
                  label="Pose débloquée"
                  done={allReceived && d.soldeRegle}
                  final
                />
              </div>
            </div>

            {/* Segments */}
            <div className="flex gap-1 h-2">
              {Array.from({ length: d.itemsTotal }).map((_, i) => (
                <span
                  key={i}
                  className={
                    "flex-1 rounded-full transition-colors " +
                    (i < d.itemsReceived ? "bg-emerald" : "bg-canvas-2 border border-line")
                  }
                />
              ))}
            </div>
          </Card>
        </section>

        {/* Main grid */}
        <section className="px-8 pb-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* MAIN — items checklist */}
          <div className="space-y-6 min-w-0">
            <Card className="overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
                <div>
                  <p className="eyebrow mb-1">Éléments du dossier</p>
                  <h2 className="text-[15px] font-semibold text-ink">
                    QR codes & réceptions
                  </h2>
                </div>
                <button className="text-[12px] text-violet hover:underline font-medium inline-flex items-center gap-1">
                  Générer PDF des QR <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {d.items.length > 0 ? (
                <div className="divide-y divide-line">
                  {d.items.map((item) => {
                    const chip = itemTypeChips[item.type];
                    const ItemIcon = chip.icon;
                    return (
                      <div key={item.id} className="px-5 py-4 flex items-center gap-4 hover:bg-canvas-2/30 transition-colors group">
                        {/* Checkbox / status */}
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
                          <ItemIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
                        </ColorChip>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[13.5px] font-semibold text-ink leading-tight truncate">
                              {item.label}
                            </p>
                          </div>
                          <p className="text-[11.5px] text-muted mt-0.5 truncate">
                            <span className="font-mono">{item.ref}</span>
                            <span className="text-muted-2 mx-1.5">·</span>
                            {item.supplier}
                          </p>
                        </div>

                        {/* QR Code */}
                        <div className="hidden md:flex items-center gap-2 shrink-0">
                          <div className="h-9 w-9 rounded-md bg-canvas-2 border border-line inline-flex items-center justify-center">
                            <QrCode className="h-4 w-4 text-ink-3" strokeWidth={2} />
                          </div>
                          <span className="ref">{item.qrCode}</span>
                        </div>

                        <StatusPill tone={itemStatusTones[item.status]}>
                          {itemStatusLabels[item.status]}
                        </StatusPill>

                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-2 hover:text-ink-2 shrink-0"
                          aria-label="Plus"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-10 text-center text-muted-2 text-[13px]">
                  Aucun élément détaillé pour ce dossier (legacy).
                </div>
              )}

              <button className="w-full text-[12.5px] text-muted hover:text-ink py-2.5 inline-flex items-center justify-center gap-1.5 border-t border-line hover:bg-canvas-2/40 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Ajouter un élément
              </button>
            </Card>

            {/* Couturière assignment */}
            {d.items.some((i) => i.type === "confection") && (
              <Card className="overflow-hidden">
                <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                  <div>
                    <p className="eyebrow mb-1">Assignation confection</p>
                    <h2 className="text-[15px] font-semibold text-ink">Couturière</h2>
                  </div>
                  <button className="text-[12px] text-violet hover:underline font-medium">
                    Modifier
                  </button>
                </div>
                <div className="px-5 pb-5 flex items-start gap-3">
                  <LetterAvatar initial="B" tone="pink" size="lg" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-ink">Brigitte M.</p>
                      <StatusPill tone="emerald" dot={false}>Interne</StatusPill>
                    </div>
                    <p className="text-[11.5px] text-muted mt-1">
                      Spécialités · Rideaux, Voilages, Plis flamand
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-[11.5px]">
                      <span className="text-muted">
                        Charge :{" "}
                        <span className="text-ink font-medium tabular-nums">75%</span>
                      </span>
                      <span className="text-muted">
                        Pièces en cours :{" "}
                        <span className="text-ink font-medium tabular-nums">6</span>
                      </span>
                      <span className="text-muted">
                        Délais respectés :{" "}
                        <span className="text-emerald font-medium tabular-nums">96%</span>
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* SIDE — payments + scheduling */}
          <div className="space-y-4">
            {/* Paiement */}
            <Card className="p-5">
              <p className="eyebrow mb-3">Paiement</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald" strokeWidth={2.2} />
                    <span className="text-[13px] text-ink-2">Acompte 50%</span>
                  </div>
                  <span className="text-[13.5px] font-semibold tabular-nums text-ink">
                    {eur(acompte)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {d.soldeRegle ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald" strokeWidth={2.2} />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-2" strokeWidth={1.8} />
                    )}
                    <span className="text-[13px] text-ink-2">Solde</span>
                  </div>
                  <span className={`text-[13.5px] font-semibold tabular-nums ${d.soldeRegle ? "text-ink" : "text-red"}`}>
                    {eur(solde)}
                  </span>
                </div>
                <div className="pt-3 border-t border-line flex items-center justify-between">
                  <span className="text-[12px] text-muted-2 font-medium uppercase tracking-wider">Total TTC</span>
                  <span className="text-[18px] font-semibold tabular-nums text-ink">
                    {eur(d.totalTTC)}
                  </span>
                </div>
              </div>
              {!d.soldeRegle && (
                <Button variant="primary" size="md" className="w-full mt-4">
                  <CreditCard className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Envoyer lien Stripe solde
                </Button>
              )}
            </Card>

            {/* Planification pose */}
            <Card className="p-5">
              <p className="eyebrow mb-3">Pose</p>
              {d.scheduledFor ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <ColorChip tone="emerald" size="md">
                      <Calendar className="h-4 w-4" strokeWidth={2.2} />
                    </ColorChip>
                    <div>
                      <p className="text-[14px] font-semibold text-ink">
                        {shortDate(d.scheduledFor)}
                      </p>
                      <p className="text-[11.5px] text-muted">Pose confirmée</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-line">
                    <LetterAvatar initial="R" tone="green" size="sm" />
                    <span className="text-[12.5px] text-ink-2 font-medium">Romain T.</span>
                    <span className="ref">· Bordeaux</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[12.5px] text-muted">
                    {allReceived
                      ? d.soldeRegle
                        ? "Tous les éléments reçus + solde réglé. Prêt à planifier."
                        : "Tous les éléments reçus mais solde non réglé."
                      : "En attente des éléments restants avant planification."}
                  </p>
                  <Button
                    variant={allReceived && d.soldeRegle ? "primary" : "secondary"}
                    size="md"
                    className="w-full"
                    disabled={!(allReceived && d.soldeRegle)}
                  >
                    <Calendar className="h-3.5 w-3.5" strokeWidth={2.4} />
                    Planifier la pose
                  </Button>
                </div>
              )}
            </Card>

            {/* Client contact */}
            <Card className="p-5">
              <p className="eyebrow mb-3">Contact client</p>
              <div className="space-y-2">
                <ClientField icon={Phone} value="06 12 34 56 78" tone="emerald" />
                <ClientField icon={Mail} value="h.larochelle@orange.fr" tone="blue" />
                <ClientField icon={MapPin} value="42 cours Foch · Bordeaux 33000" tone="pink" />
              </div>
              <Button variant="secondary" size="sm" className="w-full mt-4">
                Envoyer SMS
              </Button>
            </Card>
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

function ClientField({
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
