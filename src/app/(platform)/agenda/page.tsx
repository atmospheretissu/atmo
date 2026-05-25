import { listPoses } from "@/lib/db/poses";
import { listPoseurs } from "@/lib/db/equipe";
import AgendaClient from "./agenda-client";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const [poses, poseurs] = await Promise.all([listPoses(), listPoseurs()]);

  return (
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
  );
}
