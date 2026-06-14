import { NextResponse } from "next/server";
import { listDevis } from "@/lib/db/devis";
import { devisStatusLabels, type DevisStatus } from "@/lib/validation/devis";

/**
 * Export CSV de tous les devis filtrés par le store actif (RLS + filtre cookie).
 */
export async function GET() {
  const devis = await listDevis();
  const csvEscape = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header = [
    "Numéro",
    "Statut",
    "Client",
    "Ville",
    "Canal",
    "Résumé produit",
    "Total HT",
    "Total TTC",
    "Acompte TTC",
    "Créé le",
    "Échéance",
  ].join(",");

  const rows = devis.map((d) => {
    const client = (d as { client?: { display_name?: string; city?: string | null } }).client ?? null;
    return [
      csvEscape(d.number),
      csvEscape(devisStatusLabels[d.status as DevisStatus] ?? d.status),
      csvEscape(client?.display_name ?? ""),
      csvEscape(client?.city ?? ""),
      csvEscape(d.channel ?? ""),
      csvEscape(d.product_summary ?? ""),
      csvEscape(Number(d.total_ht ?? 0).toFixed(2)),
      csvEscape(Number(d.total_ttc ?? 0).toFixed(2)),
      csvEscape(Number(d.acompte_ttc ?? 0).toFixed(2)),
      csvEscape(d.created_at?.slice(0, 10) ?? ""),
      csvEscape(d.valid_until?.slice(0, 10) ?? ""),
    ].join(",");
  });

  const csv = "﻿" + [header, ...rows].join("\n");
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="devis-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
