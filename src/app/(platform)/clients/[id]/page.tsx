import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  FileText,
  Edit3,
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
import { ContactButtons, HeaderSendButton } from "@/components/clients/contact-modal";
import { getClientWithDevis } from "@/lib/db/clients";
import { channelLabels, type Channel } from "@/lib/validation/client";
import { eur, shortDate, time } from "@/lib/formatters";

export const dynamic = "force-dynamic";

const channelTones: Record<Channel, "violet" | "orange" | "blue" | "pink" | "emerald"> = {
  magasin: "violet",
  leroy_merlin: "orange",
  ecommerce: "blue",
  decoratrice: "pink",
  visio: "emerald",
};

const devisStatusLabels: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  valide: "Validé",
  acompte_recu: "Acompte reçu",
  refuse: "Refusé",
  expire: "Expiré",
};

const devisStatusTones: Record<string, "muted" | "info" | "violet" | "emerald" | "danger" | "warning"> = {
  brouillon: "muted",
  envoye: "info",
  valide: "violet",
  acompte_recu: "emerald",
  refuse: "danger",
  expire: "warning",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getClientWithDevis(id);
  if (!result) notFound();
  const { client, devis } = result;

  const initial = client.display_name.includes(",")
    ? (client.display_name.split(",")[1].trim()[0] ?? client.display_name[0])
    : client.display_name[0];

  const totalSpent = devis
    .filter((d) => d.status === "valide" || d.status === "acompte_recu")
    .reduce((acc, d) => acc + Number(d.total_ttc ?? 0), 0);
  const commandesCount = devis.filter(
    (d) => d.status === "valide" || d.status === "acompte_recu"
  ).length;

  const channel = client.channel as Channel;

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Clients", href: "/clients" },
          { label: client.display_name },
        ]}
      />

      <div className="flex-1 overflow-auto">
        {/* HERO */}
        <section className="px-8 pt-10 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <p className="eyebrow">Fiche client</p>
            <span className="text-muted-2">·</span>
            <StatusPill tone={channelTones[channel]} dot={false}>
              {channelLabels[channel]}
            </StatusPill>
            {client.created_at && (
              <StatusPill tone="muted">
                Client depuis {new Date(client.created_at).getFullYear()}
              </StatusPill>
            )}
          </div>

          <div className="flex items-end justify-between gap-8 flex-wrap">
            <div className="flex items-center gap-5 flex-wrap min-w-0">
              <LetterAvatar
                initial={initial}
                tone={toneFor(client.display_name)}
                size="lg"
                className="!h-14 !w-14 !text-[18px]"
              />
              <div>
                <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1]">
                  {client.display_name}
                </h1>
                <p className="text-[13.5px] text-muted mt-1">
                  {client.city ?? "Ville non renseignée"} · {devis.length}{" "}
                  interaction{devis.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <HeaderSendButton
                clientId={client.id}
                clientName={client.display_name}
                phone={client.phone}
                email={client.email}
              />
              <Link href={`/clients/${client.id}/edit`}>
                <Button variant="secondary" size="sm">
                  <Edit3 className="h-3.5 w-3.5" strokeWidth={2.2} /> Modifier
                </Button>
              </Link>
              <Link href={`/devis/nouveau?client=${client.id}`}>
                <Button variant="secondary" size="sm">
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Devis rapide
                </Button>
              </Link>
              <Link href={`/boutique/nouveau?client=${client.id}`}>
                <Button variant="primary" size="sm">
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Devis boutique
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Stats row */}
        <section className="px-8 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat
              label="CA cumulé"
              value={totalSpent > 0 ? eur(totalSpent, true) : "—"}
              sub={`${commandesCount} commande${commandesCount > 1 ? "s" : ""}`}
              tone="emerald"
              icon={TrendingUp}
            />
            <MiniStat
              label="Devis"
              value={String(devis.length)}
              sub={`${devis.filter((d) => d.status === "acompte_recu" || d.status === "valide").length} validés`}
              tone="violet"
              icon={FileText}
            />
            <MiniStat
              label="Source"
              value={channelLabels[channel]}
              sub="lead origine"
              tone={channelTones[channel]}
              icon={Globe}
            />
            <MiniStat
              label="Dernière activité"
              value={client.updated_at ? shortDate(new Date(client.updated_at)) : "—"}
              sub="modification fiche"
              tone="pink"
              icon={Calendar}
            />
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
                <span className="font-mono text-[11.5px] text-muted-2">{devis.length}</span>
              </div>
              {devis.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-[13px] text-muted-2 mb-3">Aucun devis pour ce client.</p>
                  <Link href="/devis/nouveau">
                    <Button variant="primary" size="sm">
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
                      Démarrer un devis
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {devis.map((d) => (
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
                          <span className="ref">v{d.version ?? 1}</span>
                        </div>
                        <p className="text-[12px] text-muted truncate">
                          {d.product_summary} <span className="text-muted-2">·</span>{" "}
                          {d.product_detail ?? ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-ink tabular-nums">
                          {eur(Number(d.total_ttc ?? 0), true)}
                        </p>
                        <p className="ref">{shortDate(new Date(d.created_at ?? Date.now()))}</p>
                      </div>
                      <StatusPill tone={devisStatusTones[d.status as string] ?? "muted"}>
                        {devisStatusLabels[d.status as string] ?? d.status}
                      </StatusPill>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-2 group-hover:text-ink transition-colors" />
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* SIDE */}
          <div className="space-y-4">
            {/* Coordonnées */}
            <Card className="p-5">
              <p className="eyebrow mb-3">Coordonnées</p>
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
                <ContactField icon={Globe} value={`Source · ${channelLabels[channel]}`} tone="orange" />
              </div>
              <div className="mt-4 pt-4 border-t border-line flex items-center gap-2">
                <ContactButtons
                  clientId={client.id}
                  clientName={client.display_name}
                  phone={client.phone}
                  email={client.email}
                />
              </div>
            </Card>

            {/* Préférences */}
            {client.preferences && (
              <Card className="p-5">
                <p className="eyebrow mb-3">Préférences notées</p>
                <p className="text-[12.5px] text-ink-2 leading-relaxed whitespace-pre-line">
                  {client.preferences}
                </p>
              </Card>
            )}

            {/* Notes internes */}
            {client.internal_notes && (
              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="eyebrow">Notes internes</p>
                  <Sparkles className="h-3.5 w-3.5 text-violet" />
                </div>
                <p className="text-[12.5px] text-ink-2 leading-relaxed whitespace-pre-line">
                  {client.internal_notes}
                </p>
              </Card>
            )}
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
        <p className="text-[20px] font-semibold text-ink leading-tight tabular-nums mt-0.5 truncate">
          {value}
        </p>
        {sub && <p className="text-[11px] text-muted mt-0.5">{sub}</p>}
      </div>
    </Card>
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
