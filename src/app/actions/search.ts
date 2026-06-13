"use server";

import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
  id: string;
  kind: "client" | "devis" | "dossier";
  label: string;
  sub: string | null;
  href: string;
};

/**
 * Recherche globale multi-critères : clients (nom/email/téléphone/ville),
 * devis (numéro/résumé), dossiers (numéro).
 *
 * Utilisée par la command palette (Cmd+K) et la barre de recherche topbar.
 */
export async function searchGlobalAction(
  query: string,
): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = await createClient();
  const safe = q.replace(/[%,]/g, "");

  const [clientsRes, devisRes, dossiersRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, display_name, email, phone, city")
      .or(
        `display_name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%,city.ilike.%${safe}%`,
      )
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("devis")
      .select("id, number, product_summary, total_ttc, status, client_id")
      .or(`number.ilike.%${safe}%,product_summary.ilike.%${safe}%`)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("dossiers")
      .select("id, number, status, client_id")
      .ilike("number", `%${safe}%`)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const results: SearchResult[] = [];

  for (const c of clientsRes.data ?? []) {
    const subParts = [c.email, c.phone, c.city].filter(Boolean);
    results.push({
      id: `c:${c.id}`,
      kind: "client",
      label: c.display_name,
      sub: subParts.length > 0 ? subParts.join(" · ") : null,
      href: `/clients/${c.id}`,
    });
  }

  for (const d of devisRes.data ?? []) {
    results.push({
      id: `d:${d.id}`,
      kind: "devis",
      label: d.number,
      sub: `${d.product_summary ?? ""} · ${Math.round(Number(d.total_ttc ?? 0))} € · ${d.status}`,
      href: `/devis/${d.id}`,
    });
  }

  for (const dos of dossiersRes.data ?? []) {
    results.push({
      id: `dos:${dos.id}`,
      kind: "dossier",
      label: dos.number,
      sub: `Dossier · ${dos.status}`,
      href: `/confections/${dos.id}`,
    });
  }

  return results;
}
