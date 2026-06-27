import { listAllDossiers } from "@/lib/db/dossiers";
import { listDevisWithoutDossier } from "@/lib/db/devis";
import ConfectionsClient from "./confections-client";

export const dynamic = "force-dynamic";

export default async function ConfectionsPage() {
  const [dossiers, pendingDevis] = await Promise.all([
    listAllDossiers(),
    listDevisWithoutDossier(),
  ]);
  return <ConfectionsClient dossiers={dossiers} pendingDevis={pendingDevis} />;
}
