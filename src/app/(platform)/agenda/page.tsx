import { listPoses } from "@/lib/db/poses";
import { listPoseurs } from "@/lib/db/equipe";
import {
  listPoseurAvailabilities,
  listDossiersAwaitingPose,
} from "@/lib/db/poseur-availability";
import AgendaClient from "./agenda-client";
import { PosePlanner } from "@/components/agenda/pose-planner";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 30);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  const [poses, poseurs, availabilities, awaitingDossiers] = await Promise.all([
    listPoses(),
    listPoseurs(),
    listPoseurAvailabilities({ fromDate: fromStr, toDate: toStr }),
    listDossiersAwaitingPose(),
  ]);

  return (
    <div className="flex-1 overflow-auto">
      <PosePlanner
        availabilities={availabilities}
        awaitingDossiers={awaitingDossiers}
        poseurs={poseurs.filter((p) => p.active).map((p) => ({ id: p.id, name: p.name }))}
      />
      <AgendaClient
        poses={poses.map((p) => ({
          id: p.id,
          scheduled_at: p.scheduled_at,
          duration_minutes: p.duration_minutes,
          status: p.status,
          poseur_id: p.poseur_id,
          client_name: p.client?.display_name ?? "—",
          client_city: p.client?.city ?? null,
          client_phone: p.client?.phone ?? null,
          dossier_number: p.dossier?.number ?? "",
          notes: p.notes,
        }))}
        poseurs={poseurs.map((p) => ({
          id: p.id,
          name: p.name,
          zone: p.zone,
          active: p.active,
          internal: p.internal,
        }))}
      />
    </div>
  );
}
