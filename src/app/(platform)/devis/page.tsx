import Link from "next/link";
import { Plus, Download, Calendar, FileText, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { listDevis, getDevisStats } from "@/lib/db/devis";
import { eur } from "@/lib/formatters";
import { DevisTable } from "@/components/devis/devis-table";

export const dynamic = "force-dynamic";

export default async function DevisListPage() {
  const [devis, stats] = await Promise.all([listDevis(), getDevisStats()]);

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Devis" },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Calendar className="h-3.5 w-3.5" strokeWidth={2.2} /> 30 derniers jours
            </Button>
            <Button variant="secondary" size="sm">
              <Download className="h-3.5 w-3.5" strokeWidth={2.2} /> Exporter
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
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Module 1 · Simulateur & Devis</p>
          <div className="flex items-end justify-between gap-8 flex-wrap mb-2">
            <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1]">
              Tous vos devis
              <span className="ml-3 text-[24px] text-muted-2 font-semibold tabular-nums">
                {stats.counts.all}
              </span>
            </h1>
          </div>
          <p className="text-[13.5px] text-muted max-w-2xl">
            La validation d'un devis déclenche automatiquement la fiche confection et les bons de
            commande fournisseurs.{" "}
            <strong className="text-ink font-medium">Zéro ressaisie.</strong>
          </p>
        </section>

        {/* KPIs */}
        <section className="px-8 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat
              label="Brouillons"
              value={stats.counts.brouillon.toString()}
              sub="à finaliser"
              tone="amber"
              icon={Clock}
            />
            <MiniStat
              label="Envoyés"
              value={stats.counts.envoye.toString()}
              sub="en attente"
              tone="blue"
              icon={FileText}
            />
            <MiniStat
              label="CA commandé"
              value={stats.totalCA > 0 ? eur(stats.totalCA, true) : "—"}
              sub={`${stats.counts.valide + stats.counts.acompte_recu} validés`}
              tone="emerald"
              icon={TrendingUp}
            />
            <MiniStat
              label="Acomptes en attente"
              value={
                stats.totalAcompteEnAttente > 0 ? eur(stats.totalAcompteEnAttente, true) : "—"
              }
              sub="50% à encaisser"
              tone="pink"
              icon={AlertTriangle}
            />
          </div>
        </section>

        {devis.length === 0 ? <EmptyState /> : <DevisTable initialDevis={devis} />}
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
  tone: "violet" | "emerald" | "amber" | "blue" | "pink";
  sub?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <Card className="p-4 flex items-start gap-3">
      <ColorChip tone={tone} size="md">
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </ColorChip>
      <div className="flex-1 min-w-0">
        <p className="text-[11.5px] text-muted-2 font-medium uppercase tracking-wider">
          {label}
        </p>
        <p className="text-[20px] font-semibold text-ink leading-tight tabular-nums mt-0.5">
          {value}
        </p>
        {sub && <p className="text-[11px] text-muted mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <section className="px-8 pb-16">
      <Card className="py-16 px-6 flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet to-pink text-white inline-flex items-center justify-center mb-4">
          <FileText className="h-6 w-6" strokeWidth={2} />
        </div>
        <h2 className="text-[18px] font-semibold text-ink mb-1">
          Aucun devis pour l'instant
        </h2>
        <p className="text-[13.5px] text-muted max-w-md mb-6 leading-relaxed">
          Crée ton premier devis depuis le simulateur. À la validation, l'acompte 50% sera
          encaissable via Stripe et la chaîne fournisseur démarrera automatiquement.
        </p>
        <Link href="/devis/nouveau">
          <Button variant="primary" size="md">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            Démarrer le premier devis
          </Button>
        </Link>
      </Card>
    </section>
  );
}
