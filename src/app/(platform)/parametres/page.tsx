import { listSuppliers } from "@/lib/db/suppliers";
import ParametresClient from "./parametres-client";

export const dynamic = "force-dynamic";

export default async function ParametresPage() {
  const suppliers = await listSuppliers();
  return <ParametresClient suppliers={suppliers} />;
}
