import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Package,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import { PoseScheduleForm } from "@/components/poses/pose-schedule-form";
import { MarkPoseDoneButton } from "@/components/poses/mark-pose-done-button";
import { getPoseDetail } from "@/lib/db/poses";
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

export default async function PoseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPoseDetail(id);
  if (!result) notFound();
  const { pose, dossier, client, items } = result;

  const initial = client?.display_name?.[0] ?? "?";

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Poses", href: "/poses" },
          { label: client?.display_name ?? "Intervention" },
        ]}
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <Link
            href="/poses"
            className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-ink-2 mb-3"
          >
            <ArrowLeft className="h-3 w-3" strokeWidth={2.2} /> Toutes les poses
          </Link>
          <div className="flex items-center gap-2 mb-3">
            <p className="eyebrow">Intervention pose</p>
            <span className="text-muted-2">·</span>
            <StatusPill tone={poseStatusTones[pose.status]} pulse={pose.status === "confirme"}>
              {poseStatusLabels[pose.status]}
            </StatusPill>
          </div>

          <div className="flex items-end justify-between gap-8 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              {pose.scheduled_at ? (
                <div className="shrink-0 w-20 h-20 rounded-2xl bg-canvas-2 border border-line flex flex-col items-center justify-center">
                  <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-2 capitalize">
                    {new Date(pose.scheduled_at).toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}
                  </p>
                  <p className="text-[28px] font-semibold text-ink leading-none tabular-nums">
                    {new Date(pose.scheduled_at).getDate()}
                  </p>
                  <p className="text-[10.5px] text-muted-2 tabular-nums mt-0.5 font-mono">
                    {time(pose.scheduled_at)}
                  </p>
                </div>
              ) : (
                <div className="shrink-0 w-20 h-20 rounded-2xl bg-amber-soft border border-amber/30 flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-amber" strokeWidth={2} />
                </div>
              )}

              <div>
                <h1 className="text-[32px] font-semibold tracking-tight text-ink leading-[1.1]">
                  {client?.display_name ?? "—"}
                </h1>
                {pose.address && (
                  <p className="text-[13.5px] text-muted mt-1.5 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {pose.address}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {dossier && (
                <Link href={`/confections/${dossier.id}`}>
                  <Button variant="ghost" size="sm">
                    Dossier {dossier.number} →
                  </Button>
                </Link>
              )}
              {pose.status !== "pose" && pose.status !== "annule" && (
                <MarkPoseDoneButton poseId={pose.id} />
              )}
            </div>
          </div>
        </section>

        <section className="px-8 pb-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* MAIN */}
          <div className="space-y-6 min-w-0">
            {/* Planification form si à planifier */}
            <Card className="overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-line">
                <p className="eyebrow mb-1">Planification</p>
                <h2 className="text-[15px] font-semibold text-ink">
                  {pose.status === "a_planifier" ? "Définir la date et le poseur" : "Détails du rendez-vous"}
                </h2>
              </div>
              <div className="px-5 pb-5 pt-3">
                <PoseScheduleForm
                  poseId={pose.id}
                  initialScheduledAt={pose.scheduled_at}
                  initialDuration={pose.duration_minutes}
                  initialNotes={pose.notes ?? ""}
                />
              </div>
            </Card>

            {/* Produits à poser */}
            {items.length > 0 && (
              <Card className="overflow-hidden">
                <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
                  <div>
                    <p className="eyebrow mb-1">À poser sur place</p>
                    <h3 className="text-[15px] font-semibold text-ink">
                      {items.length} élément{items.length > 1 ? "s" : ""} du dossier
                    </h3>
                  </div>
                </div>
                <div className="divide-y divide-line">
                  {items.map((item) => (
                    <div key={item.id} className="px-5 py-3 flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald shrink-0" strokeWidth={2.4} />
                      <ColorChip tone="violet" size="sm">
                        <Package className="h-3 w-3" strokeWidth={2.4} />
                      </ColorChip>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-ink leading-tight truncate">
                          {item.label}
                        </p>
                        {item.ref && (
                          <p className="text-[11px] text-muted-2 font-mono mt-0.5">{item.ref}</p>
                        )}
                      </div>
                      <span className="ref shrink-0">{item.qr_code}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* SIDE */}
          <div className="space-y-4">
            {/* Client contact */}
            {client && (
              <Card className="p-5">
                <p className="eyebrow mb-3">Contact client</p>
                <div className="flex items-center gap-3 mb-4">
                  <LetterAvatar
                    initial={initial}
                    tone={toneFor(client.display_name)}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-ink truncate">{client.display_name}</p>
                    <p className="text-[11.5px] text-muted truncate">{client.city ?? "—"}</p>
                  </div>
                </div>
                <div className="space-y-2 text-[12.5px]">
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-2" />
                      <span className="text-ink-2 font-mono tabular-nums">{client.phone}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-muted-2" />
                      <span className="text-ink-2 truncate">{client.email}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Infos générales */}
            <Card className="p-5">
              <p className="eyebrow mb-3">Informations</p>
              <div className="space-y-2 text-[12.5px]">
                {pose.scheduled_at ? (
                  <Row label="Date / heure" value={`${shortDate(pose.scheduled_at)} ${time(pose.scheduled_at)}`} />
                ) : (
                  <Row label="Statut" value="À planifier" />
                )}
                <Row label="Durée" value={`${pose.duration_minutes} min`} />
                {pose.completed_at && (
                  <Row label="Effectuée le" value={shortDate(pose.completed_at)} />
                )}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="text-ink-2 font-mono tabular-nums">{value}</span>
    </div>
  );
}
