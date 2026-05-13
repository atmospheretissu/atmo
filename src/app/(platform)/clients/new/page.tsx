import { Topbar } from "@/components/shell/topbar";
import { ClientForm } from "@/components/clients/client-form";
import { createClientAction } from "@/app/(platform)/clients/actions";

export default function NewClientPage() {
  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Clients", href: "/clients" },
          { label: "Nouveau" },
        ]}
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-[1100px] mx-auto px-8 pt-8 pb-16">
          <ClientForm
            action={createClientAction}
            title="Nouveau client"
            cancelHref="/clients"
          />
        </div>
      </div>
    </>
  );
}
