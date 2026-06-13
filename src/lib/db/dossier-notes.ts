import { createClient } from "@/lib/supabase/server";
import type { DossierNoteVM } from "@/components/confections/dossier-notes";

export async function listDossierNotes(dossierId: string): Promise<DossierNoteVM[]> {
  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("dossier_notes")
    .select("id, body, kind, created_at, author_id")
    .eq("dossier_id", dossierId)
    .order("created_at", { ascending: false });

  if (!notes || notes.length === 0) return [];

  const authorIds = Array.from(
    new Set(notes.map((n) => n.author_id).filter((v): v is string => Boolean(v))),
  );
  const { data: profiles } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", authorIds)
    : { data: [] };
  const byId = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name ?? p.email ?? null]),
  );

  return notes.map((n) => ({
    id: n.id,
    body: n.body,
    created_at: n.created_at,
    kind: n.kind,
    author_name: n.author_id ? byId.get(n.author_id) ?? null : null,
  }));
}
