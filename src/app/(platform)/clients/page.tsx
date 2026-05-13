import Link from "next/link";
import { Plus, Users, TrendingUp, Filter, ChevronRight } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { listClients, getClientStats } from "@/lib/db/clients";
import { eur } from "@/lib/formatters";
import { ClientsTable } from "@/components/clients/clients-table";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const [clients, stats] = await Promise.all([
    listClients(),
    getClientStats(),
  ]);

  const channelBreakdown = stats.byChannel;
  const lmCount = channelBreakdown.leroy_merlin ?? 0;
  const lmPct = stats.total > 0 ? Math.round((lmCount / stats.total) * 100) : 0;

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Clients" },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Filter className="h-3.5 w-3.5" strokeWidth={2.2} /> Filtres
            </Button>
            <Link href="/clients/new">
              <Button variant="primary" size="sm">
                <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Nouveau client
              </Button>
            </Link>
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Fiches clients · CRM intégré</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Vos clients
            <span className="ml-3 text-[24px] text-muted-2 font-semibold tabular-nums">
              {stats.total}
            </span>
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Chaque client garde son historique complet : devis, commandes, poses, paiements.
            <strong className="text-ink font-medium"> Source du lead suivie de bout en bout.</strong>
          </p>
        </section>

        {/* KPIs */}
        <section className="px-8 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat
              label="Clients enregistrés"
              value={stats.total.toString()}
              sub={stats.total === 0 ? "aucun pour l'instant" : `${stats.total > 1 ? "actifs" : "actif"}`}
              tone="violet"
              icon={Users}
            />
            <MiniStat
              label="CA cumulé"
              value={stats.totalCA > 0 ? eur(stats.totalCA, true) : "—"}
              sub="devis validés + acompte"
              tone="emerald"
              icon={TrendingUp}
            />
            <MiniStat
              label="Leroy Merlin"
              value={lmCount.toString()}
              sub={`${lmPct}% des leads`}
              tone="orange"
              icon={Users}
            />
            <MiniStat
              label="Magasin"
              value={(channelBreakdown.magasin ?? 0).toString()}
              sub="entrées directes"
              tone="pink"
              icon={Users}
            />
          </div>
        </section>

        {/* Table or empty state */}
        {clients.length === 0 ? (
          <EmptyState />
        ) : (
          <ClientsTable initialClients={clients} />
        )}
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

function EmptyState() {
  return (
    <section className="px-8 pb-16">
      <Card className="py-16 px-6 flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet to-pink text-white inline-flex items-center justify-center mb-4">
          <Users className="h-6 w-6" strokeWidth={2} />
        </div>
        <h2 className="text-[18px] font-semibold text-ink mb-1">
          Aucun client pour l'instant
        </h2>
        <p className="text-[13.5px] text-muted max-w-md mb-6 leading-relaxed">
          Crée ta première fiche client pour démarrer un devis, planifier une visio Leroy Merlin
          ou enregistrer une vente comptoir.
        </p>
        <div className="flex items-center gap-2">
          <Link href="/clients/new">
            <Button variant="primary" size="md">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
              Créer le premier client
            </Button>
          </Link>
          <Link href="/devis/nouveau">
            <Button variant="secondary" size="md">
              Démarrer un devis
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.2} />
            </Button>
          </Link>
        </div>
      </Card>
    </section>
  );
}
