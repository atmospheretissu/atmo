import { listClients } from "@/lib/db/clients";
import { listDevis } from "@/lib/db/devis";
import { listAllDossiers } from "@/lib/db/dossiers";
import TestClient from "./test-client";
import { listTestRuns } from "./actions";

export const dynamic = "force-dynamic";

export default async function TestPage() {
  const [clients, devis, dossiers, runs] = await Promise.all([
    listClients({ limit: 100 }),
    listDevis({ limit: 50 }),
    listAllDossiers(),
    listTestRuns(50),
  ]);

  return (
    <TestClient
      clients={clients.map((c) => ({
        id: c.id,
        display_name: c.display_name,
        email: c.email,
        phone: c.phone,
        channel: c.channel,
        city: c.city,
      }))}
      devis={devis.slice(0, 30).map((d) => ({
        id: d.id,
        number: d.number,
        status: d.status,
        total_ttc: Number(d.total_ttc ?? 0),
        client_name: d.client?.display_name ?? "—",
      }))}
      dossiers={dossiers.slice(0, 30).map((d) => ({
        id: d.id,
        number: d.number,
        status: d.status,
        client_name: d.client?.display_name ?? "—",
        items_received: d.itemsReceived,
        items_total: d.itemsTotal,
      }))}
      initialRuns={runs}
    />
  );
}
