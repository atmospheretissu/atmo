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
  Building2,
  CheckCircle2,
  CircleDashed,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Zap,
  FileText,
  Scissors,
  Truck,
  ScanLine,
  Wrench,
  Receipt,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { DeltaBadge } from "@/components/ui/delta";
import { devisList, channelLabels, statusLabels, statusTones } from "@/lib/mock-data";
import { eur, shortDate, time } from "@/lib/formatters";

export default async function DevisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const devis = devisList.find((d) => d.id === id);
  if (!devis) notFound();

  const lines = [
    {
      ref: "RID-001",
      label: "Rideau plis flamand · Salon baie vitrée",
      detail: "Casamance Saumon · 280×245cm · 2 panneaux · doublure occultante",
      qty: 2,
      unit: 642.0,
      total: 1284.0,
    },
    {
      ref: "RID-002",
      label: "Rideau plis vague · Chambre parentale",
      detail: "Casamance Saumon · 180×230cm · 2 panneaux · doublure occultante",
      qty: 2,
      unit: 412.0,
      total: 824.0,
    },
    {
      ref: "RAIL-001",
      label: "Rail DS électrifiable Interstil",
      detail: "320cm × 2 · embouts laiton brossé",
      qty: 2,
      unit: 144.5,
      total: 289.0,
    },
    {
      ref: "POSE-001",
      label: "Pose à domicile",
      detail: "Bordeaux 33000 · forfait 2 pièces",
      qty: 1,
      unit: 190.0,
      total: 190.0,
    },
    {
      ref: "CFC-001",
      label: "Confection & finitions",
      detail: "Couturière interne Brigitte M. · plis flamand 10cm",
      qty: 1,
      unit: 258.0,
      total: 258.0,
    },
  ];

  const totalHT = lines.reduce((acc, l) => acc + l.total, 0);
  const tva = totalHT * 0.2;
  const totalTTC = totalHT + tva;
  const acompte = totalTTC * 0.5;
  const solde = totalTTC - acompte;

  const timeline = [
    { event: "Devis créé", actor: "Camille Morel", date: devis.createdAt, type: "created" },
    { event: "Envoyé par email · v1", actor: devis.client.email, date: devis.createdAt, type: "email" },
    { event: "Révision v2 · ajout doublure occultante", actor: "Camille Morel", date: new Date(devis.createdAt.getTime() + 86400000 * 4), type: "edit" },
    { event: "Renvoyé par email · v2", actor: devis.client.email, date: new Date(devis.createdAt.getTime() + 86400000 * 4), type: "email" },
    { event: "Validation client", actor: "Mme Larochelle", date: new Date(devis.createdAt.getTime() + 86400000 * 6), type: "approved" },
    { event: "Acompte Stripe encaissé · 1 707 €", actor: "Stripe · ****4242", date: new Date(devis.createdAt.getTime() + 86400000 * 6), type: "payment" },
    { event: "Dossier confection ouvert · DOS-2026-0142", actor: "Automation", date: new Date(devis.createdAt.getTime() + 86400000 * 6), type: "auto" },
    { event: "Bon de commande Casamance envoyé", actor: "Automation", date: new Date(devis.createdAt.getTime() + 86400000 * 6), type: "auto" },
  ];

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Devis", href: "/devis" },
          { label: devis.number },
        ]}
      />
      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-8">
          <div className="flex items-center gap-2 mb-3">
            <p className="eyebrow">Devis · v{devis.version}</p>
            <span className="text-muted-2">·</span>
            <StatusPill tone={statusTones[devis.status]}>
              {statusLabels[devis.status]}
            </StatusPill>
            <StatusPill tone="orange" dot={false}>
              {channelLabels[devis.channel]}
            </StatusPill>
          </div>

          <div className="flex items-end justify-between gap-8 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1]">
                {devis.client.name}
              </h1>
              <p className="text-[14px] text-muted mt-2">
                {devis.product} <span className="text-muted-2 mx-1">·</span> {devis.productDetail}
              </p>
              <p className="font-mono text-[12.5px] text-muted-2 mt-1">{devis.number}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Download className="h-3.5 w-3.5" strokeWidth={2.2} /> PDF
              </Button>
              <Button variant="ghost" size="sm">
                <Copy className="h-3.5 w-3.5" strokeWidth={2.2} /> Dupliquer
              </Button>
              <Button variant="secondary" size="sm">
                <Edit3 className="h-3.5 w-3.5" strokeWidth={2.2} /> Modifier
              </Button>
              <Button variant="primary" size="sm">
                <Send className="h-3.5 w-3.5" strokeWidth={2.4} /> Relancer
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Plus">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        <div className="px-8 pb-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* MAIN */}
          <div className="space-y-6 min-w-0">
            <StripeSeal acompte={acompte} totalTTC={totalTTC} solde={solde} />

            {/* Lines */}
            <Card className="overflow-hidden">
              <CardHeader>
                <div>
                  <p className="eyebrow">Détail du devis</p>
                  <CardTitle className="mt-1">Lignes — {lines.length} postes</CardTitle>
                </div>
                <button className="text-[12px] text-violet hover:underline font-medium">
                  Voir versions
                </button>
              </CardHeader>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-canvas-2/60 border-y border-line">
                    <th className="px-5 py-2.5 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 text-left">Réf.</th>
                    <th className="px-2 py-2.5 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 text-left">Désignation</th>
                    <th className="px-2 py-2.5 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 text-right">Qté</th>
                    <th className="px-2 py-2.5 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 text-right">P.U. HT</th>
                    <th className="px-5 py-2.5 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 text-right">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.ref} className="border-b border-line last:border-0 hover:bg-canvas-2/30">
                      <td className="px-5 py-3 align-top">
                        <span className="ref">{l.ref}</span>
                      </td>
                      <td className="px-2 py-3 align-top">
                        <p className="text-ink leading-tight font-medium">{l.label}</p>
                        <p className="ref mt-0.5">{l.detail}</p>
                      </td>
                      <td className="px-2 py-3 align-top text-right">
                        <span className="text-ink-2 tabular-nums">{l.qty}</span>
                      </td>
                      <td className="px-2 py-3 align-top text-right">
                        <span className="text-ink-2 tabular-nums">{eur(l.unit)}</span>
                      </td>
                      <td className="px-5 py-3 align-top text-right">
                        <span className="font-semibold text-ink tabular-nums">{eur(l.total)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bg-canvas-2/30">
                <div className="px-5 py-2.5 flex items-center justify-between text-[12.5px]">
                  <span className="text-muted">Sous-total HT</span>
                  <span className="text-ink-2 tabular-nums">{eur(totalHT)}</span>
                </div>
                <div className="px-5 py-2.5 flex items-center justify-between text-[12.5px] border-t border-line">
                  <span className="text-muted">TVA 20 %</span>
                  <span className="text-muted tabular-nums">{eur(tva)}</span>
                </div>
                <div className="px-5 py-4 flex items-center justify-between border-t border-line bg-white">
                  <span className="text-[14px] font-semibold text-ink">Total TTC</span>
                  <span className="display-num text-[28px] gradient-text leading-none tabular-nums">{eur(totalTTC)}</span>
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <div>
                  <p className="eyebrow">Historique</p>
                  <CardTitle className="mt-1">Journal du devis</CardTitle>
                </div>
                <span className="ref">{timeline.length} événements</span>
              </CardHeader>

              <div className="px-5 pb-5">
                <ol className="relative pl-8 space-y-4">
                  <span className="absolute left-3 top-3 bottom-3 w-px bg-line" />
                  {timeline.map((t, i) => (
                    <li key={i} className="relative">
                      <span className={
                        "absolute -left-[26px] top-0.5 h-5 w-5 rounded-full ring-2 ring-white flex items-center justify-center " +
                        (t.type === "auto" ? "bg-violet text-white" :
                         t.type === "payment" ? "bg-emerald text-white" :
                         t.type === "approved" ? "bg-ink text-white" :
                         t.type === "email" ? "bg-blue text-white" :
                         t.type === "edit" ? "bg-amber text-white" :
                         "bg-canvas-2 text-ink-3")
                      }>
                        {t.type === "auto" && <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} />}
                        {t.type === "payment" && <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={2.5} />}
                        {t.type === "email" && <Mail className="h-2.5 w-2.5" strokeWidth={2.5} />}
                        {t.type === "approved" && <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={2.5} />}
                        {t.type === "edit" && <Edit3 className="h-2.5 w-2.5" strokeWidth={2.5} />}
                      </span>
                      <div>
                        <p className="text-[13px] text-ink leading-tight font-medium">
                          {t.event}
                        </p>
                        <p className="ref mt-0.5">
                          {t.actor} · {shortDate(t.date)} {time(t.date)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </Card>
          </div>

          {/* SIDE */}
          <div className="space-y-4">
            {/* Client */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[14px]">Client</CardTitle>
                <Link href="#" className="text-[12px] text-violet hover:underline font-medium">
                  Fiche complète →
                </Link>
              </CardHeader>
              <div className="px-5 pb-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet to-pink text-white flex items-center justify-center text-[13px] font-semibold ring-2 ring-white shadow-sm shrink-0">
                    HL
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-ink leading-tight">
                      {devis.client.name}
                    </p>
                    <p className="ref mt-0.5">Particulier · client depuis 2023</p>
                  </div>
                </div>
                <div className="space-y-1.5 pt-3 border-t border-line">
                  <ClientField icon={Mail} value={devis.client.email} tone="blue" />
                  <ClientField icon={Phone} value="06 12 34 56 78" tone="emerald" />
                  <ClientField icon={MapPin} value={"42 cours Foch · " + devis.client.city} tone="pink" />
                  <ClientField icon={Building2} value={`Source · ${channelLabels[devis.channel]}`} tone="orange" />
                </div>
              </div>
            </Card>

            {/* Versions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[14px]">Versions</CardTitle>
                <span className="ref">3</span>
              </CardHeader>
              <div className="divide-y divide-line">
                {[
                  { v: 3, label: "Version actuelle", date: new Date(devis.updatedAt), total: totalTTC, current: true },
                  { v: 2, label: "Ajout doublure occultante", date: new Date(devis.createdAt.getTime() + 86400000 * 4), total: 3284 },
                  { v: 1, label: "Version initiale", date: devis.createdAt, total: 2756 },
                ].map((v) => (
                  <div key={v.v} className={
                    "px-5 py-3 flex items-center justify-between hover:bg-canvas-2/40 transition-colors " +
                    (v.current ? "bg-violet-soft/40" : "")
                  }>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12px] font-semibold text-ink-2">v{v.v}</span>
                        {v.current && <StatusPill tone="violet">Active</StatusPill>}
                      </div>
                      <p className="text-[12px] text-muted mt-0.5 leading-tight">{v.label}</p>
                      <p className="ref mt-0.5">{shortDate(v.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[13.5px] text-ink tabular-nums">
                        {eur(v.total, true)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Chain triggered */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[14px]">Chaîne déclenchée</CardTitle>
              </CardHeader>
              <ul className="px-5 pb-5 space-y-3 text-[12.5px]">
                <FlowItem done tone="orange" icon={Scissors} label="Dossier confection" code="DOS-2026-0142" href="/confections" />
                <FlowItem done tone="violet" icon={Truck} label="BC Casamance" code="BC-2026-0089 · 12m" href="/commandes" />
                <FlowItem done tone="blue" icon={Truck} label="BC Interstil" code="BC-2026-0090 · 2 rails" href="/commandes" />
                <FlowItem pending tone="yellow" icon={ScanLine} label="Réception colis" code="4/5 éléments scannés" href="/reception" />
                <FlowItem pending tone="emerald" icon={Wrench} label="Pose" code="à planifier" />
                <FlowItem pending tone="pink" icon={Receipt} label="Facture Pennylane" code="auto · à la pose" />
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </>
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
    <div className="flex items-center gap-2.5 text-[12px] py-1">
      <ColorChip tone={tone} size="sm">
        <Icon className="h-3 w-3" strokeWidth={2.4} />
      </ColorChip>
      <span className="text-ink-2 truncate">{value}</span>
    </div>
  );
}

function FlowItem({
  done,
  pending,
  tone,
  icon: Icon,
  label,
  code,
  href,
}: {
  done?: boolean;
  pending?: boolean;
  tone: "violet" | "pink" | "orange" | "blue" | "emerald" | "yellow";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  code: string;
  href?: string;
}) {
  const inner = (
    <>
      <ColorChip tone={tone} size="sm">
        <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      </ColorChip>
      <div className="flex-1 min-w-0">
        <p className="text-ink leading-tight font-medium">{label}</p>
        <p className="ref mt-0.5">{code}</p>
      </div>
      {done ? (
        <span className="inline-flex h-4 w-4 rounded-full bg-emerald-soft items-center justify-center mt-0.5">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1.5 4 L3.5 6 L6.5 2" stroke="#10B981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      ) : (
        <CircleDashed className="h-3.5 w-3.5 text-amber mt-0.5" />
      )}
      {href && <ArrowRight className="h-3 w-3 text-muted-2 group-hover:text-ink transition-colors" />}
    </>
  );
  if (href) {
    return (
      <li>
        <Link href={href} className="flex items-start gap-2.5 group hover:bg-canvas-2 -mx-2 px-2 py-1.5 rounded-lg transition-colors">
          {inner}
        </Link>
      </li>
    );
  }
  return <li className="flex items-start gap-2.5 px-2 py-1.5">{inner}</li>;
}

function StripeSeal({
  acompte,
  totalTTC,
  solde,
}: {
  acompte: number;
  totalTTC: number;
  solde: number;
}) {
  return (
    <div className="rounded-xl bg-ink text-white overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr]">
        {/* Left side */}
        <div className="p-6 md:p-7 border-b md:border-b-0 md:border-r border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex h-6 w-6 rounded-md bg-pastel-yellow text-pastel-yellow-ink items-center justify-center">
              <Zap className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            <span className="text-[11px] font-semibold tracking-wider uppercase opacity-70">
              Règle métier · 50% · Stripe
            </span>
          </div>
          <h2 className="text-[26px] font-bold tracking-tight leading-tight text-white mb-2">
            Acompte de validation
          </h2>
          <p className="text-[13px] text-white/65 leading-relaxed max-w-md mb-5">
            Aucun bon de commande fournisseur, aucune fiche confection ne part avant encaissement.
            Le solde sera à régler avant la pose.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 bg-white text-ink px-4 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-canvas-2 transition-colors">
              Envoyer le lien Stripe
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
            <button className="inline-flex items-center gap-2 border border-white/20 text-white px-4 py-2.5 rounded-lg text-[12.5px] hover:bg-white/10 transition-colors">
              Marquer reçu manuellement
            </button>
          </div>
        </div>

        {/* Right — amounts */}
        <div className="p-6 md:p-7 flex flex-col justify-between gap-6">
          <div>
            <p className="text-[10.5px] font-semibold tracking-wider uppercase opacity-70 mb-2">
              Acompte (50 %)
            </p>
            <p className="text-[44px] font-bold leading-none text-white tabular-nums tracking-tight">
              {eur(acompte, true)}
            </p>
            <p className="text-[11.5px] text-white/60 mt-2">
              Stripe link prêt à envoyer
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
