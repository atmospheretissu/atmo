import { notFound } from "next/navigation";
import { Topbar } from "@/components/shell/topbar";
import { ClientForm } from "@/components/clients/client-form";
import { updateClientAction } from "@/app/(platform)/clients/actions";
import { getClient } from "@/lib/db/clients";

export const dynamic = "force-dynamic";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  // Bind the action with the id (Next.js Server Action binding pattern)
  const action = updateClientAction.bind(null, id);

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Clients", href: "/clients" },
          { label: client.display_name, href: `/clients/${id}` },
          { label: "Modifier" },
        ]}
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-[1100px] mx-auto px-8 pt-8 pb-16">
          <ClientForm
            client={client}
            action={action}
            title="Modifier le client"
            cancelHref={`/clients/${id}`}
          />
        </div>
      </div>
    </>
  );
}
