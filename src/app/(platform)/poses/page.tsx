import Link from "next/link";
import {
  Plus,
  Calendar,
  Filter,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Phone,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import { listPoses, getPoseStats } from "@/lib/db/poses";
import { shortDate, time } from "@/lib/formatters";

export const dynamic = "force-dynamic";

const poseStatusLabels: Record<string, string> = {
  a_planifier: "À planifier",
  planifie: "Planifié",
  confirme: "Confirmé client",
  pose: "Posé",
  annule: "Annulé",
};

const poseStatusTones: Record<string, "amber" | "blue" | "emerald" | "neutral" | "danger"> = {
  a_planifier: "amber",
  planifie: "blue",
  confirme: "emerald",
  pose: "neutral",
  annule: "danger",
};

export default async function PosesPage() {
  const [poses, stats] = await Promise.all([listPoses(), getPoseStats()]);

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Poses" },
        ]}
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Module 6 · Gestion des poseurs</p>
          <div className="flex items-end justify-between gap-8 flex-wrap mb-2">
            <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1]">
              Planning des poses
              <span className="ml-3 text-[24px] text-muted-2 font-semibold tabular-nums">
                {stats.total}
              </span>
            </h1>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Link href="/agenda">
                <Button variant="secondary" size="sm">
                  <Calendar className="h-3.5 w-3.5" strokeWidth={2.2} /> Planning
                </Button>
              </Link>
              <Button variant="secondary" size="sm">
                <Filter className="h-3.5 w-3.5" strokeWidth={2.2} /> Filtres
              </Button>
            </div>
          </div>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Créées automatiquement quand un dossier passe en{" "}
            <strong className="text-ink font-medium">Prêt pour pose</strong>. Le poseur peut être
            assigné depuis ici ou directement depuis la fiche dossier.
          </p>
        </section>

        {/* KPIs */}
        <section className="px-8 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="À planifier" value={String(stats.aPlanifier)} sub="dossiers prêts" tone="amber" icon={AlertTriangle} />
            <MiniStat label="Planifiées" value={String(stats.planifiees)} sub="à confirmer" tone="blue" icon={Calendar} />
            <MiniStat label="Confirmées" value={String(stats.confirmees)} sub="agendées client" tone="emerald" icon={CheckCircle2} />
            <MiniStat label="Posées" value={String(stats.posees)} sub="livrées" tone="neutral" icon={Wrench} />
          </div>
        </section>

        {poses.length === 0 ? <EmptyState /> : <PoseList poses={poses} />}
      </div>
    </>
  );
}

function PoseList({ poses }: { poses: Awaited<ReturnType<typeof listPoses>> }) {
  return (
    <section className="px-8 pb-10 space-y-3">
      {poses.map((p) => {
        const initial = p.client?.display_name?.[0] ?? "?";
        return (
          <Card key={p.id} className="p-4 hover:border-line-strong transition-colors">
            <Link href={`/poses/${p.id}`} className="block">
              <div className="flex items-start gap-4">
                {p.scheduled_at ? (
                  <div className="shrink-0 w-16 h-16 rounded-xl bg-canvas-2 border border-line flex flex-col items-center justify-center">
                    <p className="text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">
                      {new Date(p.scheduled_at).toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}
                    </p>
                    <p className="text-[22px] font-semibold text-ink leading-none tabular-nums">
                      {new Date(p.scheduled_at).getDate()}
                    </p>
                    <p className="text-[10px] text-muted-2 tabular-nums mt-0.5 font-mono">
                      {time(p.scheduled_at)}
                    </p>
                  </div>
                ) : (
                  <div className="shrink-0 w-16 h-16 rounded-xl bg-amber-soft border border-amber/30 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-amber" strokeWidth={2} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <LetterAvatar
                      initial={initial}
                      tone={toneFor(p.client?.display_name ?? "")}
                      size="sm"
                    />
                    <p className="text-[14px] font-semibold text-ink truncate">
                      {p.client?.display_name ?? "—"}
                    </p>
                    <StatusPill tone={poseStatusTones[p.status]}>{poseStatusLabels[p.status]}</StatusPill>
                  </div>
                  {p.address && (
                    <p className="text-[12px] text-muted flex items-center gap-1.5 mb-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{p.address}</span>
                    </p>
                  )}
                  {p.dossier && (
                    <p className="text-[11px] text-muted-2 font-mono">
                      Dossier {p.dossier.number} · {p.duration_minutes} min
                    </p>
                  )}
                  {p.notes && (
                    <p className={
                      "text-[11.5px] mt-2 px-2 py-1 rounded-md inline-block " +
                      (p.notes.includes("⚠") ? "bg-pink-soft text-pink" : "bg-canvas-2/60 text-muted")
                    }>
                      {p.notes}
                    </p>
                  )}
                </div>

                <ChevronRight className="h-4 w-4 text-muted-2 shrink-0 self-center" />
              </div>
            </Link>
          </Card>
        );
      })}
    </section>
  );
}

function EmptyState() {
  return (
    <section className="px-8 pb-16">
      <Card className="py-16 px-6 flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet to-pink text-white inline-flex items-center justify-center mb-4">
          <Wrench className="h-6 w-6" strokeWidth={2} />
        </div>
        <h2 className="text-[18px] font-semibold text-ink mb-1">Aucune pose</h2>
        <p className="text-[13.5px] text-muted max-w-md mb-6 leading-relaxed">
          Les poses sont créées automatiquement quand un dossier de confection passe en{" "}
          <strong>Prêt pour pose</strong> (tous les éléments scannés + solde réglé).
        </p>
        <Link href="/confections">
          <Button variant="primary" size="md">
            Voir les dossiers en cours
          </Button>
        </Link>
      </Card>
    </section>
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
  tone: "violet" | "emerald" | "amber" | "blue" | "neutral";
  sub?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <Card className="p-4 flex items-start gap-3">
      <ColorChip tone={tone === "neutral" ? "ink" : tone} size="md">
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
