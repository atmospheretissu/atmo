import Link from "next/link";
import {
  Plus,
  Filter,
  AlertTriangle,
  Scissors,
  Search,
  Truck,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import { listAllDossiers } from "@/lib/db/dossiers";
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

export default async function ConfectionsPage() {
  const dossiers = await listAllDossiers();

  const enConfection = dossiers.filter((d) => d.status === "en_confection").length;
  const pretsPose = dossiers.filter((d) => d.status === "pret_pose").length;
  const avecRetards = dossiers.filter((d) => {
    const ageDays = (Date.now() - new Date(d.created_at).getTime()) / 86400000;
    return ageDays > 14 && d.itemsReceived < d.itemsTotal;
  }).length;

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Confections" },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Filter className="h-3.5 w-3.5" strokeWidth={2.2} /> Filtres
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Module 2 · Suivi des Confections</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Dossiers d'atelier
            <span className="ml-3 text-[24px] text-muted-2 font-semibold tabular-nums">
              {dossiers.length}
            </span>
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Créés automatiquement quand l'acompte d'un devis est encaissé. Pose débloquée
            uniquement quand X/N éléments reçus + solde réglé.
          </p>
        </section>

        {/* KPIs */}
        <section className="px-8 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="Total dossiers" value={dossiers.length.toString()} tone="violet" icon={Scissors} />
            <MiniStat label="En confection" value={String(enConfection)} tone="violet" sub="couturières assignées" icon={Scissors} />
            <MiniStat label="Prêts pour pose" value={String(pretsPose)} tone="emerald" sub="à planifier" icon={Truck} />
            <MiniStat label="Avec retards" value={String(avecRetards)} tone="amber" sub="14j+" icon={AlertTriangle} />
          </div>
        </section>

        {dossiers.length === 0 ? (
          <EmptyState />
        ) : (
          <KanbanView dossiers={dossiers} />
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
        <p className="text-[11.5px] text-muted-2 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-[20px] font-semibold text-ink leading-tight tabular-nums mt-0.5">{value}</p>
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
          <Scissors className="h-6 w-6" strokeWidth={2} />
        </div>
        <h2 className="text-[18px] font-semibold text-ink mb-1">
          Aucun dossier pour l'instant
        </h2>
        <p className="text-[13.5px] text-muted max-w-md mb-6 leading-relaxed">
          Les dossiers de confection sont créés automatiquement quand un acompte de devis est
          encaissé. Crée et valide un premier devis pour démarrer la chaîne.
        </p>
        <Link href="/devis/nouveau">
          <Button variant="primary" size="md">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            Démarrer un devis
          </Button>
        </Link>
      </Card>
    </section>
  );
}

const columns: { key: string; label: string; tone: "muted" | "blue" | "amber" | "violet" | "emerald" | "pink" | "neutral"; dot: string }[] = [
  { key: "en_cours", label: "En commande", tone: "muted", dot: "bg-muted-2" },
  { key: "tout_commande", label: "Tout commandé", tone: "blue", dot: "bg-blue" },
  { key: "reception_partielle", label: "Réception partielle", tone: "amber", dot: "bg-amber" },
  { key: "en_confection", label: "En confection", tone: "violet", dot: "bg-violet" },
  { key: "pret_pose", label: "Prêt pour pose", tone: "emerald", dot: "bg-emerald" },
  { key: "pose", label: "Posé / Livré", tone: "neutral", dot: "bg-muted-2" },
];

function KanbanView({ dossiers }: { dossiers: Awaited<ReturnType<typeof listAllDossiers>> }) {
  return (
    <section className="px-8 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {columns.map((col) => {
          const items = dossiers.filter((d) => d.status === col.key);
          return (
            <div key={col.key} className="space-y-2.5 min-w-0">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${col.dot}`} />
                  <h3 className="text-[13px] font-semibold text-ink truncate">{col.label}</h3>
                  <span className="text-[11.5px] text-muted-2 tabular-nums">{items.length}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                {items.map((d) => (
                  <DossierCard key={d.id} dossier={d} />
                ))}
                {items.length === 0 && (
                  <div className="text-[11.5px] text-muted-2 text-center py-3 border border-dashed border-line rounded-xl">
                    —
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DossierCard({ dossier }: { dossier: Awaited<ReturnType<typeof listAllDossiers>>[number] }) {
  const name = dossier.client?.display_name ?? "—";
  const initial = name.includes(",") ? (name.split(",")[1].trim()[0] ?? name[0]) : name[0];
  const alerteSolde = !dossier.solde_paid && dossier.itemsReceived === dossier.itemsTotal && dossier.itemsTotal > 0;

  return (
    <Link href={`/confections/${dossier.id}`}>
      <Card className="p-3.5 cursor-pointer hover:border-line-strong transition-colors">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <LetterAvatar initial={initial} tone={toneFor(name)} size="md" />
        </div>

        <p className="text-[12.5px] font-semibold text-ink leading-tight truncate">{name}</p>
        {dossier.client?.city && (
          <p className="text-[11px] text-muted mt-0.5 truncate">{dossier.client.city}</p>
        )}
        <p className="ref mt-1.5">{dossier.number}</p>

        {dossier.itemsTotal > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted">Éléments reçus</span>
              <span className="font-semibold text-ink-2 tabular-nums">
                {dossier.itemsReceived}/{dossier.itemsTotal}
              </span>
            </div>
            <div className="flex gap-0.5 h-1.5">
              {Array.from({ length: dossier.itemsTotal }).map((_, i) => (
                <span
                  key={i}
                  className={
                    "flex-1 rounded-full " +
                    (i < dossier.itemsReceived ? "bg-emerald" : "bg-canvas-2 border border-line")
                  }
                />
              ))}
            </div>
          </div>
        )}

        {alerteSolde && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-soft text-red text-[10.5px] font-semibold">
            <AlertTriangle className="h-3 w-3" strokeWidth={2.4} />
            Solde dû
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-line">
          <span className="text-[10.5px] text-muted">{shortDate(new Date(dossier.created_at))}</span>
          <span className="text-[12px] font-semibold text-ink tabular-nums">
            {eur(Number(dossier.total_ttc), true)}
          </span>
        </div>
      </Card>
    </Link>
  );
}
