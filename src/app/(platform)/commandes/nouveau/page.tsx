import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { listSuppliers } from "@/lib/db/suppliers";
import { listAllDossiers } from "@/lib/db/dossiers";
import { NewBcForm } from "@/components/commandes/new-bc-form";

export const dynamic = "force-dynamic";

export default async function NewBcPage() {
  const [suppliers, dossiers] = await Promise.all([
    listSuppliers(),
    listAllDossiers(),
  ]);
  const activeSuppliers = suppliers.filter((s) => s.active);
  const openDossiers = dossiers.filter(
    (d) => d.status !== "cloture" && d.status !== "sav",
  );

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Commandes fournisseurs", href: "/commandes" },
          { label: "Nouveau BC" },
        ]}
      />
      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Nouvelle commande fournisseur</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Créer un bon de commande
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Lié à un dossier : les lignes sont pré-remplies depuis le devis
            (métrage tissu, accessoires…). Sans dossier : BC vide à compléter
            manuellement.
          </p>
        </section>

        <section className="px-8 pb-10">
          <Card className="p-6 max-w-[640px]">
            <NewBcForm
              suppliers={activeSuppliers.map((s) => ({
                id: s.id,
                name: s.name,
                type: s.type,
                country: s.country,
                language: s.language,
              }))}
              dossiers={openDossiers.map((d) => ({
                id: d.id,
                number: d.number,
                client_name:
                  (d as { client?: { display_name?: string } }).client
                    ?.display_name ?? null,
                status: d.status,
              }))}
            />
          </Card>
        </section>
      </div>
    </>
  );
}
