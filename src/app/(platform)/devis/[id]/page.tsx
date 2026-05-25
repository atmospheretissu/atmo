import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Send,
  Edit3,
  Copy,
  Download,
  MoreHorizontal,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Zap,
  ExternalLink,
  Scissors,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { MarkAcompteButton } from "@/components/devis/mark-acompte-button";
import { StripeCheckoutButton } from "@/components/devis/stripe-button";
import { SendEmailButton } from "@/components/devis/send-email-button";
import { getDevisDetail } from "@/lib/db/devis";
import {
  devisStatusLabels,
  devisStatusTones,
  type DevisStatus,
} from "@/lib/validation/devis";
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

export default async function DevisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getDevisDetail(id);
  if (!result) notFound();
  const { devis, client, lines, dossier } = result;

  const status = devis.status as DevisStatus;
  const channel = devis.channel as Channel;
  const totalHT = Number(devis.total_ht ?? 0);
  const totalTTC = Number(devis.total_ttc ?? 0);
  const tva = totalTTC - totalHT;
  const acompte = Number(devis.acompte_ttc ?? totalTTC * 0.5);
  const solde = totalTTC - acompte;

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Devis", href: "/devis" },
          { label: devis.number },
        ]}
        actions={
          <>
            <Link href={`/devis/${devis.id}/pdf?inline=1`} target="_blank">
              <Button variant="ghost" size="sm">
                <Download className="h-3.5 w-3.5" strokeWidth={2.2} /> PDF
              </Button>
            </Link>
            <Button variant="ghost" size="sm">
              <Copy className="h-3.5 w-3.5" strokeWidth={2.2} /> Dupliquer
            </Button>
            <Button variant="secondary" size="sm">
              <Edit3 className="h-3.5 w-3.5" strokeWidth={2.2} /> Modifier
            </Button>
            {status !== "acompte_recu" && status !== "refuse" && status !== "expire" && (
              <MarkAcompteButton devisId={devis.id} />
            )}
            <SendEmailButton devisId={devis.id} />
            {dossier && (
              <Link href={`/confections/${dossier.id}`}>
                <Button variant="accent" size="sm">
                  <Scissors className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Fiche confection
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="icon-sm" aria-label="Plus">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-8">
          <div className="flex items-center gap-2 mb-3">
            <p className="eyebrow">Devis · v{devis.version}</p>
            <span className="text-muted-2">·</span>
            <StatusPill tone={devisStatusTones[status]}>{devisStatusLabels[status]}</StatusPill>
            <StatusPill tone={channelTones[channel]} dot={false}>
              {channelLabels[channel]}
            </StatusPill>
          </div>

          <div className="flex items-end justify-between gap-8 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1]">
                {client?.display_name ?? "Client inconnu"}
              </h1>
              <p className="text-[14px] text-muted mt-2">
                {devis.product_summary}
                {devis.product_detail && (
                  <>
                    <span className="text-muted-2 mx-1">·</span> {devis.product_detail}
                  </>
                )}
              </p>
              <p className="font-mono text-[12.5px] text-muted-2 mt-1">{devis.number}</p>
            </div>
          </div>
        </section>

        <div className="px-8 pb-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="space-y-6 min-w-0">
            {/* Stripe sceau (only if validated / waiting acompte) */}
            {(status === "valide" || status === "envoye") && (
              <StripeSeal acompte={acompte} totalTTC={totalTTC} solde={solde} devisId={devis.id} />
            )}

            {/* Lines */}
            <Card className="overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
                <div>
                  <p className="eyebrow mb-1">Détail du devis</p>
                  <h2 className="text-[15px] font-semibold text-ink">
                    Lignes — {lines.length} poste{lines.length > 1 ? "s" : ""}
                  </h2>
                </div>
              </div>
              {lines.length === 0 ? (
                <div className="px-5 py-10 text-center text-muted-2 text-[13px]">
                  Aucune ligne pour ce devis.
                </div>
              ) : (
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-canvas-2/40 border-y border-line">
                      <th className="px-5 py-2.5 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 text-left">Réf.</th>
                      <th className="px-2 py-2.5 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 text-left">Désignation</th>
                      <th className="px-2 py-2.5 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 text-right">Qté</th>
                      <th className="px-2 py-2.5 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 text-right">P.U. HT</th>
                      <th className="px-5 py-2.5 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 text-right">Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.id} className="border-b border-line last:border-0 hover:bg-canvas-2/30">
                        <td className="px-5 py-3 align-top">
                          <span className="ref">{l.ref ?? "—"}</span>
                        </td>
                        <td className="px-2 py-3 align-top">
                          <p className="text-ink leading-tight font-medium">{l.label}</p>
                          {l.detail && <p className="ref mt-0.5">{l.detail}</p>}
                        </td>
                        <td className="px-2 py-3 align-top text-right">
                          <span className="text-ink-2 tabular-nums">
                            {Number(l.qty)} {l.unit_label}
                          </span>
                        </td>
                        <td className="px-2 py-3 align-top text-right">
                          <span className="text-ink-2 tabular-nums">{eur(Number(l.unit_price_ht))}</span>
                        </td>
                        <td className="px-5 py-3 align-top text-right">
                          <span className="font-semibold text-ink tabular-nums">
                            {eur(Number(l.total_ht ?? 0))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="bg-canvas-2/30">
                <div className="px-5 py-2.5 flex items-center justify-between text-[12.5px]">
                  <span className="text-muted">Sous-total HT</span>
                  <span className="text-ink-2 tabular-nums">{eur(totalHT)}</span>
                </div>
                <div className="px-5 py-2.5 flex items-center justify-between text-[12.5px] border-t border-line">
                  <span className="text-muted">TVA {Number(devis.tva_rate ?? 20)} %</span>
                  <span className="text-muted tabular-nums">{eur(tva)}</span>
                </div>
                <div className="px-5 py-4 flex items-center justify-between border-t border-line bg-white">
                  <span className="text-[14px] font-semibold text-ink">Total TTC</span>
                  <span className="text-[26px] font-semibold text-ink leading-none tabular-nums">
                    {eur(totalTTC)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Client */}
            {client && (
              <Card>
                <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
                  <p className="eyebrow">Client</p>
                  <Link
                    href={`/clients/${client.id}`}
                    className="text-[12px] text-violet hover:underline font-medium"
                  >
                    Fiche complète →
                  </Link>
                </div>
                <div className="px-5 pb-5 pt-3 space-y-2">
                  <p className="text-[14px] font-semibold text-ink leading-tight">
                    {client.display_name}
                  </p>
                  {client.city && (
                    <div className="flex items-center gap-2 text-[12px] text-muted">
                      <MapPin className="h-3 w-3" />
                      {client.city}
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2 text-[12px] text-muted">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-[12px] text-muted">
                      <Phone className="h-3 w-3" />
                      <span className="font-mono tabular-nums">{client.phone}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Fiche confection liée */}
            {dossier && (
              <Card>
                <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
                  <p className="eyebrow">Fiche confection</p>
                  <Link
                    href={`/confections/${dossier.id}`}
                    className="text-[12px] text-violet hover:underline font-medium"
                  >
                    Ouvrir →
                  </Link>
                </div>
                <div className="px-5 pb-5 pt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-[12.5px] text-ink font-semibold">{dossier.number}</p>
                    {dossier.acompte_paid ? (
                      <StatusPill tone="emerald">Acompte reçu</StatusPill>
                    ) : (
                      <StatusPill tone="amber">En attente acompte</StatusPill>
                    )}
                  </div>
                  <p className="text-[11.5px] text-muted">
                    {dossier.acompte_paid
                      ? "Production en cours. Les BC fournisseurs sont en brouillon dans /commandes."
                      : "Fiche pré-créée. La production démarrera dès réception de l'acompte 50%."}
                  </p>
                </div>
              </Card>
            )}

            {/* Métadonnées */}
            <Card className="p-5">
              <p className="eyebrow mb-3">Informations</p>
              <div className="space-y-2.5 text-[12.5px]">
                <Row label="Créé le" value={shortDate(devis.created_at) + " " + time(devis.created_at)} />
                <Row label="Échéance" value={devis.valid_until ? shortDate(devis.valid_until) : "—"} />
                <Row label="Version" value={`v${devis.version}`} mono />
                <Row label="N°" value={devis.number} mono />
              </div>
            </Card>

            {/* Atelier notes */}
            {devis.workshop_notes && (
              <Card className="p-5">
                <p className="eyebrow mb-2">Notes atelier</p>
                <p className="text-[12.5px] text-ink-2 leading-relaxed whitespace-pre-line">
                  {devis.workshop_notes}
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className={mono ? "font-mono text-ink-2 tabular-nums" : "text-ink-2"}>{value}</span>
    </div>
  );
}

function StripeSeal({
  acompte,
  totalTTC,
  solde,
  devisId,
}: {
  acompte: number;
  totalTTC: number;
  solde: number;
  devisId: string;
}) {
  return (
    <div className="rounded-xl bg-ink text-white overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr]">
        <div className="p-6 md:p-7 border-b md:border-b-0 md:border-r border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex h-6 w-6 rounded-md bg-pastel-yellow text-pastel-yellow-ink items-center justify-center">
              <Zap className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            <span className="text-[11px] font-semibold tracking-wider uppercase opacity-70">
              Règle métier · 50% · Stripe
            </span>
          </div>
          <h2 className="text-[24px] font-bold tracking-tight leading-tight text-white mb-2">
            Acompte de validation
          </h2>
          <p className="text-[13px] text-white/65 leading-relaxed max-w-md mb-5">
            Aucun bon de commande, aucune fiche confection ne part avant encaissement.
            Une session Stripe est créée à la demande, le webhook met à jour automatiquement
            le statut et lance la création du dossier de confection.
          </p>
          <div className="flex flex-wrap gap-2">
            <StripeCheckoutButton devisId={devisId} />
          </div>
        </div>

        <div className="p-6 md:p-7 flex flex-col justify-between gap-6">
          <div>
            <p className="text-[10.5px] font-semibold tracking-wider uppercase opacity-70 mb-2">
              Acompte (50 %)
            </p>
            <p className="text-[40px] font-bold leading-none text-white tabular-nums tracking-tight">
              {eur(acompte, true)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <div>
              <p className="text-[10px] font-semibold tracking-wider uppercase opacity-60 mb-1">
                Solde avant pose
              </p>
              <p className="text-[14px] font-semibold tabular-nums">{eur(solde, true)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wider uppercase opacity-60 mb-1">
                Total TTC
              </p>
              <p className="text-[14px] font-semibold tabular-nums">{eur(totalTTC, true)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
