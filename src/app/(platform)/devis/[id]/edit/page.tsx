import { notFound } from "next/navigation";
import { Topbar } from "@/components/shell/topbar";
import { getDevisDetail } from "@/lib/db/devis";
import { DevisEditForm } from "@/components/devis/devis-edit-form";

export const dynamic = "force-dynamic";

export default async function DevisEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getDevisDetail(id);
  if (!result) notFound();
  const { devis, client, lines } = result;

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Devis", href: "/devis" },
          { label: devis.number, href: `/devis/${devis.id}` },
          { label: "Modifier" },
        ]}
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Édition · ligne par ligne</p>
          <h1 className="text-[32px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Modifier {devis.number}
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Client : <strong className="text-ink-2 font-medium">{client?.display_name ?? "—"}</strong>
            {" "}· Ajoute, modifie ou supprime des lignes sans recréer le devis.
            Le total et la TVA se recalculent automatiquement.
          </p>
        </section>

        <section className="px-8 pb-10">
          <DevisEditForm
            devisId={devis.id}
            tvaRate={Number(devis.tva_rate ?? 20)}
            initialLines={lines.map((l) => ({
              label: l.label,
              detail: l.detail,
              ref: l.ref,
              qty: Number(l.qty ?? 1),
              unit_label: l.unit_label ?? "u",
              unit_price_ht: Number(l.unit_price_ht ?? 0),
            }))}
          />
        </section>
      </div>
    </>
  );
}
