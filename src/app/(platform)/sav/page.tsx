import { Topbar } from "@/components/shell/topbar";
import { listSavTickets } from "@/lib/db/sav";
import { listProfiles } from "@/lib/db/profiles";
import { SavKanbanClient } from "@/components/sav/sav-kanban-client";

export const dynamic = "force-dynamic";

export default async function SavPage() {
  const [tickets, profiles] = await Promise.all([listSavTickets(), listProfiles()]);

  const activeTeam = profiles
    .filter((p) => p.active !== false)
    .map((p) => ({
      id: p.id,
      label: p.full_name ?? p.email ?? "—",
    }));

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "SAV" },
        ]}
      />
      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Service après-vente</p>
          <div className="flex items-end justify-between gap-8 flex-wrap mb-2">
            <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1]">
              Tickets SAV
              <span className="ml-3 text-[24px] text-muted-2 font-semibold tabular-nums">
                {tickets.length}
              </span>
            </h1>
          </div>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Suivi des demandes après-pose : retours, défauts, demandes de garantie.
            Drag & drop entre colonnes pour faire avancer le statut, assignation
            à un membre de l'équipe.
          </p>
        </section>

        <section className="px-8 pb-10">
          <SavKanbanClient initialTickets={tickets} team={activeTeam} />
        </section>
      </div>
    </>
  );
}
