import Link from "next/link";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { listClients } from "@/lib/db/clients";
import { BoutiqueWizard } from "@/components/boutique/wizard";

export const dynamic = "force-dynamic";

export default async function NewBoutiqueDevisPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const sp = await searchParams;
  const clients = await listClients({ limit: 500 });
  const initialClientId = sp.client ?? null;

  if (clients.length === 0) {
    return (
      <>
        <Topbar
          breadcrumb={[
            { label: "Atmosphère" },
            { label: "Création devis", href: "/boutique" },
            { label: "Nouveau" },
          ]}
        />
        <div className="flex-1 overflow-auto">
          <div className="max-w-[700px] mx-auto px-8 pt-16">
            <Card className="py-12 px-8 text-center">
              <h2 className="text-[20px] font-semibold text-ink mb-2">
                Crée d'abord un client
              </h2>
              <p className="text-[13.5px] text-muted mb-6 max-w-md mx-auto">
                Un devis boutique est toujours rattaché à un client.
              </p>
              <Link href="/clients/new">
                <Button variant="primary" size="md">
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Créer le premier client
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Boutique", href: "/boutique" },
          { label: "Nouveau devis" },
        ]}
      />
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1300px] mx-auto px-8 pt-8 pb-16">
          <BoutiqueWizard
            clients={clients.map((c) => ({
              id: c.id,
              display_name: c.display_name,
              city: c.city,
              channel: c.channel,
              email: c.email,
            }))}
            initialClientId={initialClientId}
          />
        </div>
      </div>
    </>
  );
}
