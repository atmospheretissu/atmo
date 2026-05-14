import { listAllDossiers } from "@/lib/db/dossiers";
import ConfectionsClient from "./confections-client";

export const dynamic = "force-dynamic";

export default async function ConfectionsPage() {
  const dossiers = await listAllDossiers();
  return <ConfectionsClient dossiers={dossiers} />;
}
