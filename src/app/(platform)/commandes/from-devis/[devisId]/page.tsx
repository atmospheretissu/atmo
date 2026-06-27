import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Package } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ColorChip } from "@/components/ui/status-pill";
import { getDevisBcPreview } from "@/lib/db/bcs-from-devis";
import { GenerateBcForm } from "@/components/commandes/generate-bc-form";

export const dynamic = "force-dynamic";

export default async function FromDevisPage({
  params,
}: {
  params: Promise<{ devisId: string }>;
}) {
  const { devisId } = await params;
  const preview = await getDevisBcPreview(devisId);
  if (!preview) notFound();

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Commandes" },
          { label: "Générer depuis devis" },
          { label: preview.devis.number },
        ]}
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <Link
            href={`/devis/${preview.devis.id}`}
            className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retour au devis
          </Link>
          <p className="eyebrow mb-3">Préparation des bons de commande</p>
          <div className="flex items-end justify-between gap-8 flex-wrap mb-2">
            <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1]">
              Générer les bons de commande
              <span className="ml-3 text-[24px] text-muted-2 font-semibold tabular-nums">
                {preview.devis.number}
              </span>
            </h1>
          </div>
          <p className="text-[13.5px] text-muted max-w-2xl">
            {preview.devis.client_name && (
              <>Client&nbsp;: <strong className="text-ink">{preview.devis.client_name}</strong> · </>
            )}
            Vérifie le fournisseur attribué à chaque ligne puis crée les BCs en un clic.
          </p>
        </section>

        <section className="px-8 pb-10">
          {preview.lines.length === 0 ? (
            <Card className="px-10 py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-canvas-2">
                <FileText className="h-5 w-5 text-muted" />
              </div>
              <p className="text-[14px] font-semibold text-ink mb-1">
                Aucune ligne dans ce devis
              </p>
              <p className="text-[13px] text-muted">
                Ajoute des articles dans le devis avant de générer les bons de commande.
              </p>
              <div className="mt-5">
                <Link href={`/devis/${preview.devis.id}`}>
                  <Button variant="secondary" size="md">Ouvrir le devis</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <GenerateBcForm
              devisId={preview.devis.id}
              devisNumber={preview.devis.number}
              dossierId={preview.dossierId}
              lines={preview.lines}
              suppliers={preview.suppliers}
              existingBcs={preview.existingBcs}
            />
          )}
        </section>
      </div>
    </>
  );
}
