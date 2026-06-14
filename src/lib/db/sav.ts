import { createClient } from "@/lib/supabase/server";
import { getEffectiveStoreFilter } from "@/lib/db/stores";
import type { SavTicket, SavTicketWithRefs, SavTicketNoteVM } from "@/lib/db/sav-shared";

export type {
  SavStatus,
  SavPriority,
  SavTicket,
  SavTicketWithRefs,
  SavTicketNoteVM,
} from "@/lib/db/sav-shared";
export {
  SAV_STATUS_LABELS,
  SAV_STATUS_TONES,
  SAV_PRIORITY_LABELS,
  KANBAN_ORDER,
} from "@/lib/db/sav-shared";

// (les types ci-dessus sont marqués "import type" uniquement pour qu'ils
// soient utilisables dans les signatures des fonctions ci-dessous.)
void undefined as unknown as SavTicket | SavTicketWithRefs | SavTicketNoteVM;

export async function getNextSavNumber(): Promise<string> {
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const prefix = `SAV-${year}-`;
  const { count } = await supabase
    .from("sav_tickets")
    .select("*", { count: "exact", head: true })
    .like("number", `${prefix}%`);
  return `${prefix}${String((count ?? 0) + 1).padStart(4, "0")}`;
}

export async function listSavTickets(): Promise<SavTicketWithRefs[]> {
  const supabase = await createClient();
  const storeFilter = await getEffectiveStoreFilter();

  let q = supabase.from("sav_tickets").select("*").order("created_at", { ascending: false });
  if (storeFilter) q = q.eq("store_id", storeFilter);
  const { data: tickets } = await q;
  if (!tickets || tickets.length === 0) return [];

  const clientIds = Array.from(
    new Set(tickets.map((t) => t.client_id).filter((id): id is string => Boolean(id))),
  );
  const devisIds = Array.from(
    new Set(tickets.map((t) => t.devis_id).filter((id): id is string => Boolean(id))),
  );
  const dossierIds = Array.from(
    new Set(tickets.map((t) => t.dossier_id).filter((id): id is string => Boolean(id))),
  );
  const profileIds = Array.from(
    new Set(tickets.map((t) => t.assigned_to).filter((id): id is string => Boolean(id))),
  );

  const [clientsRes, devisRes, dossiersRes, profilesRes] = await Promise.all([
    clientIds.length
      ? supabase.from("clients").select("id, display_name").in("id", clientIds)
      : Promise.resolve({ data: [] as Array<{ id: string; display_name: string }> }),
    devisIds.length
      ? supabase.from("devis").select("id, number").in("id", devisIds)
      : Promise.resolve({ data: [] as Array<{ id: string; number: string }> }),
    dossierIds.length
      ? supabase.from("dossiers").select("id, number").in("id", dossierIds)
      : Promise.resolve({ data: [] as Array<{ id: string; number: string }> }),
    profileIds.length
      ? supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", profileIds)
      : Promise.resolve({
          data: [] as Array<{ id: string; full_name: string | null; email: string | null }>,
        }),
  ]);

  const byClient = new Map((clientsRes.data ?? []).map((c) => [c.id, c.display_name]));
  const byDevis = new Map((devisRes.data ?? []).map((d) => [d.id, d.number]));
  const byDossier = new Map((dossiersRes.data ?? []).map((d) => [d.id, d.number]));
  const byProfile = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p.full_name ?? p.email ?? null]),
  );

  return (tickets as SavTicket[]).map((t) => ({
    ...t,
    client_name: t.client_id ? byClient.get(t.client_id) ?? null : null,
    devis_number: t.devis_id ? byDevis.get(t.devis_id) ?? null : null,
    dossier_number: t.dossier_id ? byDossier.get(t.dossier_id) ?? null : null,
    assigned_name: t.assigned_to ? byProfile.get(t.assigned_to) ?? null : null,
  }));
}

export async function getSavTicketDetail(
  ticketId: string,
): Promise<{ ticket: SavTicketWithRefs; notes: SavTicketNoteVM[] } | null> {
  const supabase = await createClient();
  const { data: ticket } = await supabase
    .from("sav_tickets")
    .select("*")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket) return null;

  const t = ticket as SavTicket;

  const [client, devis, dossier, assigned, notesRes] = await Promise.all([
    t.client_id
      ? supabase.from("clients").select("id, display_name").eq("id", t.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
    t.devis_id
      ? supabase.from("devis").select("id, number").eq("id", t.devis_id).maybeSingle()
      : Promise.resolve({ data: null }),
    t.dossier_id
      ? supabase.from("dossiers").select("id, number").eq("id", t.dossier_id).maybeSingle()
      : Promise.resolve({ data: null }),
    t.assigned_to
      ? supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("id", t.assigned_to)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("sav_ticket_notes")
      .select("id, body, created_at, author_id")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false }),
  ]);

  const authorIds = Array.from(
    new Set(
      (notesRes.data ?? [])
        .map((n) => (n as { author_id: string | null }).author_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", authorIds)
    : { data: [] };
  const byAuthor = new Map(
    (authors ?? []).map((a) => [a.id, a.full_name ?? a.email ?? null]),
  );

  return {
    ticket: {
      ...t,
      client_name: (client.data as { display_name?: string } | null)?.display_name ?? null,
      devis_number: (devis.data as { number?: string } | null)?.number ?? null,
      dossier_number: (dossier.data as { number?: string } | null)?.number ?? null,
      assigned_name:
        (assigned.data as { full_name?: string | null; email?: string | null } | null)
          ?.full_name ??
        (assigned.data as { full_name?: string | null; email?: string | null } | null)?.email ??
        null,
    },
    notes: (notesRes.data ?? []).map((n) => {
      const note = n as { id: string; body: string; created_at: string; author_id: string | null };
      return {
        id: note.id,
        body: note.body,
        created_at: note.created_at,
        author_name: note.author_id ? byAuthor.get(note.author_id) ?? null : null,
      };
    }),
  };
}
