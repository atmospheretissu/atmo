import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  FileText,
  Scissors,
  Wrench,
  Receipt,
  MoreHorizontal,
  Edit3,
  Send,
  Plus,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Globe,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import {
  devisList,
  channelLabels,
  statusLabels,
  statusTones,
  dossiers,
  poses,
} from "@/lib/mock-data";
import { eur, shortDate, time } from "@/lib/formatters";

const channelTones = {
  magasin: "violet" as const,
  leroy_merlin: "orange" as const,
  ecommerce: "blue" as const,
  decoratrice: "pink" as const,
  visio: "emerald" as const,
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Map id to a client name from devisList (used as slug). Fallback: id is the name encoded.
  const devis = devisList.find((d) => d.id === id);
  if (!devis) notFound();

  const clientName = devis.client.name;
  const initial = clientName.includes(",")
    ? (clientName.split(",")[1].trim()[0] ?? clientName[0])
    : clientName[0];

  // Build client data from devisList
  const clientDevis = devisList.filter((d) => d.client.name === clientName);
  const clientDossiers = dossiers.filter((d) => d.client === clientName);
  const clientPoses = poses.filter((p) => p.client === clientName);

  const totalSpent = clientDevis
    .filter((d) => d.status === "valide" || d.status === "acompte_recu")
    .reduce((acc, d) => acc + d.totalTTC, 0);
  const commandesCount = clientDevis.filter(
    (d) => d.status === "valide" || d.status === "acompte_recu"
  ).length;

  // Build aggregated timeline
  const timeline = [
    ...clientDevis.map((d) => ({
      type: "devis" as const,
      title: `Devis ${d.number} créé`,
      detail: `${d.product} · ${eur(d.totalTTC, true)}`,
      date: d.createdAt,
      tone: "violet" as const,
      icon: FileText,
    })),
    ...clientDevis
      .filter((d) => d.status === "acompte_recu")
      .map((d) => ({
        type: "payment" as const,
        title: `Acompte Stripe encaissé`,
        detail: `${eur(d.acompte)} · ${d.number}`,
        date: new Date(d.updatedAt.getTime()),
        tone: "emerald" as const,
        icon: Receipt,
      })),
    ...clientDossiers.map((d) => ({
      type: "dossier" as const,
      title: `Dossier ${d.number} ouvert`,
      detail: `${d.itemsTotal} éléments · ${d.status}`,
      date: new Date(d.scheduledFor ? d.scheduledFor.getTime() - 7 * 86400000 : Date.now() - 5 * 86400000),
      tone: "orange" as const,
      icon: Scissors,
    })),
    ...clientPoses.map((p) => ({
      type: "pose" as const,
      title: p.status === "pose" ? "Pose effectuée" : "Pose planifiée",
      detail: `${p.poseur} · ${p.duration}min`,
      date: p.date,
      tone: p.status === "pose" ? ("emerald" as const) : ("blue" as const),
      icon: Wrench,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Clients", href: "/clients" },
          { label: clientName },
        ]}
        actions={
          <>
            <Button variant="ghost" size="sm">
              <Send className="h-3.5 w-3.5" strokeWidth={2.2} /> Envoyer SMS
            </Button>
            <Button variant="secondary" size="sm">
              <Edit3 className="h-3.5 w-3.5" strokeWidth={2.2} /> Modifier
            </Button>
            <Link href="/devis/nouveau">
              <Button variant="primary" size="sm">
                <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Nouveau devis
              </Button>
            </Link>
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        {/* HERO */}
        <section className="px-8 pt-10 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <p className="eyebrow">Fiche client</p>
            <span className="text-muted-2">·</span>
            <StatusPill tone={channelTones[devis.channel]} dot={false}>
              {channelLabels[devis.channel]}
            </StatusPill>
            <StatusPill tone="muted">Client depuis 2023</StatusPill>
          </div>

          <div className="flex items-center gap-5 flex-wrap">
            <LetterAvatar initial={initial} tone={toneFor(clientName)} size="lg" className="!h-14 !w-14 !text-[18px]" />
            <div>
              <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1]">
                {clientName}
              </h1>
              <p className="text-[13.5px] text-muted mt-1">
                {devis.client.city} <span className="text-muted-2 mx-1">·</span> {clientDevis.length} interactions
              </p>
            </div>
          </div>
        </section>

        {/* Stats row */}
        <section className="px-8 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="CA cumulé" value={eur(totalSpent, true)} sub={`${commandesCount} commandes`} tone="emerald" icon={TrendingUp} />
            <MiniStat label="Devis envoyés" value={String(clientDevis.length)} sub={`${clientDevis.filter((d) => d.status === "acompte_recu" || d.status === "valide").length} validés`} tone="violet" icon={FileText} />
            <MiniStat label="Dossiers" value={String(clientDossiers.length)} sub={clientDossiers.length > 0 ? `${clientDossiers.filter((d) => d.status === "pose").length} posés` : "aucun"} tone="orange" icon={Scissors} />
            <MiniStat label="Poses" value={String(clientPoses.length)} sub={clientPoses.length > 0 ? `dernière ${shortDate(clientPoses[0].date)}` : "aucune"} tone="pink" icon={Wrench} />
          </div>
        </section>

        <section className="px-8 pb-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* MAIN */}
          <div className="space-y-6 min-w-0">
            {/* Devis history */}
            <Card className="overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
                <div>
                  <p className="eyebrow mb-1">Historique commercial</p>
                  <h3 className="text-[15px] font-semibold text-ink">Devis & commandes</h3>
                </div>
                <span className="font-mono text-[11.5px] text-muted-2">{clientDevis.length}</span>
              </div>
              <div className="divide-y divide-line">
                {clientDevis.map((d) => (
                  <Link
                    key={d.id}
                    href={`/devis/${d.id}`}
                    className="px-5 py-3.5 flex items-center gap-3 hover:bg-canvas-2/30 transition-colors group"
                  >
                    <ColorChip tone="violet" size="md">
                      <FileText className="h-4 w-4" strokeWidth={2.2} />
                    </ColorChip>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[13.5px] font-semibold text-ink">{d.number}</p>
                        <span className="ref">v{d.version}</span>
                      </div>
                      <p className="text-[12px] text-muted truncate">
                        {d.product} <span className="text-muted-2">·</span> {d.productDetail}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-ink tabular-nums">{eur(d.totalTTC, true)}</p>
                      <p className="ref">{shortDate(d.createdAt)}</p>
                    </div>
                    <StatusPill tone={statusTones[d.status]}>{statusLabels[d.status]}</StatusPill>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-2 group-hover:text-ink transition-colors" />
                  </Link>
                ))}
              </div>
            </Card>

            {/* Dossiers */}
            {clientDossiers.length > 0 && (
              <Card className="overflow-hidden">
                <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
                  <div>
                    <p className="eyebrow mb-1">Atelier</p>
                    <h3 className="text-[15px] font-semibold text-ink">Dossiers en cours</h3>
                  </div>
                  <span className="font-mono text-[11.5px] text-muted-2">{clientDossiers.length}</span>
                </div>
                <div className="divide-y divide-line">
                  {clientDossiers.map((d) => (
                    <Link
                      key={d.id}
                      href={`/confections/${d.id}`}
                      className="px-5 py-3.5 flex items-center gap-3 hover:bg-canvas-2/30 transition-colors group"
                    >
                      <ColorChip tone="orange" size="md">
                        <Scissors className="h-4 w-4" strokeWidth={2.2} />
                      </ColorChip>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-ink">{d.number}</p>
                        {d.itemsTotal > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-muted tabular-nums">
                              {d.itemsReceived}/{d.itemsTotal} éléments
                            </span>
                            <div className="flex gap-0.5 h-1 flex-1 max-w-[120px]">
                              {Array.from({ length: d.itemsTotal }).map((_, i) => (
                                <span
                                  key={i}
                                  className={
                                    "flex-1 rounded-full " +
                                    (i < d.itemsReceived ? "bg-emerald" : "bg-canvas-2 border border-line")
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-ink tabular-nums text-[13px]">{eur(d.totalTTC, true)}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-2 group-hover:text-ink transition-colors" />
                    </Link>
                  ))}
                </div>
              </Card>
            )}

            {/* Activity timeline */}
            <Card>
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
                <div>
                  <p className="eyebrow mb-1">Chronologie</p>
                  <h3 className="text-[15px] font-semibold text-ink">Activité récente</h3>
                </div>
              </div>
              <div className="px-5 pt-4 pb-5">
                <ol className="relative pl-7 space-y-4">
                  <span className="absolute left-2.5 top-2 bottom-2 w-px bg-line" />
                  {timeline.slice(0, 8).map((t, i) => (
                    <li key={i} className="relative">
                      <span
                        className={
                          "absolute -left-[26px] top-0.5 h-5 w-5 rounded-full ring-2 ring-white flex items-center justify-center " +
                          (t.tone === "emerald"
                            ? "bg-emerald text-white"
                            : t.tone === "violet"
                            ? "bg-violet text-white"
                            : t.tone === "orange"
                            ? "bg-orange text-white"
                            : "bg-blue text-white")
                        }
                      >
                        <t.icon className="h-2.5 w-2.5" strokeWidth={2.5} />
                      </span>
                      <div>
                        <p className="text-[13px] text-ink font-medium leading-tight">{t.title}</p>
                        <p className="ref mt-0.5">{t.detail} · {shortDate(t.date)} {time(t.date)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </Card>
          </div>

          {/* SIDE */}
          <div className="space-y-4">
            <Card className="p-5">
              <p className="eyebrow mb-3">Coordonnées</p>
              <div className="space-y-2.5">
                <ClientField icon={Mail} value={devis.client.email} tone="blue" />
                <ClientField icon={Phone} value="06 12 34 56 78" tone="emerald" />
                <ClientField icon={MapPin} value={`42 cours Foch · ${devis.client.city}`} tone="pink" />
                <ClientField icon={Globe} value={`Source · ${channelLabels[devis.channel]}`} tone="orange" />
              </div>
              <div className="mt-4 pt-4 border-t border-line flex items-center gap-2">
                <Button variant="secondary" size="sm" className="flex-1">
                  <Phone className="h-3.5 w-3.5" strokeWidth={2.2} /> Appeler
                </Button>
                <Button variant="secondary" size="sm" className="flex-1">
                  <Send className="h-3.5 w-3.5" strokeWidth={2.2} /> SMS
                </Button>
              </div>
            </Card>

            {/* Préférences */}
            <Card className="p-5">
              <p className="eyebrow mb-3">Préférences notées</p>
              <ul className="space-y-2 text-[12.5px] text-ink-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald mt-1 shrink-0" strokeWidth={2.4} />
                  <span>Couleurs chaudes · ocre, saumon, terracotta</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald mt-1 shrink-0" strokeWidth={2.4} />
                  <span>Plis flamand 10cm uniquement</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald mt-1 shrink-0" strokeWidth={2.4} />
                  <span>Préfère rendez-vous en matinée</span>
                </li>
              </ul>
            </Card>

            {/* Notes internes */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="eyebrow">Notes internes</p>
                <Sparkles className="h-3.5 w-3.5 text-violet" />
              </div>
              <p className="text-[12.5px] text-ink-2 leading-relaxed">
                Cliente fidèle introduite par sa voisine. Sensible au délai. Toujours rappeler à H-30 pour confirmer pose. Mari sourd — privilégier SMS.
              </p>
            </Card>
          </div>
        </section>
      </div>
    </>
  );
}

function MiniStat({
  label,
  value,
  tone,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: "violet" | "emerald" | "amber" | "blue" | "pink" | "orange";
  sub?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <Card className="p-4 flex items-start gap-3">
      <ColorChip tone={tone} size="md">
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </ColorChip>
      <div className="flex-1 min-w-0">
        <p className="text-[11.5px] text-muted-2 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-[22px] font-semibold text-ink leading-tight tabular-nums mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-muted mt-0.5">{sub}</p>}
      </div>
    </Card>
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
