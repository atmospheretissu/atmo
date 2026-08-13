import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Export CSV d'une grille tarifaire (une seule confection d'un tissu).
 * Format :
 *   ligne 1 : ";l1;l2;l3;…" — largeurs en cm
 *   ligne N : "hN;prix1;prix2;prix3;…" — hauteur cm + prix par largeur
 * Séparateur `;` pour compatibilité Excel FR (comma serait mal parsé).
 *
 * Query params :
 *   tissuId (uuid, requis)
 *   confection (string, requis) — "pli_simple" | "wave" | "oeillet" | "store"
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tissuId = url.searchParams.get("tissuId");
  const confection = url.searchParams.get("confection");
  if (!tissuId || !confection) {
    return new Response("tissuId et confection requis", { status: 400 });
  }

  const supabase = await createClient();
  // Cast : boutique_tarif_tissus n'est pas encore dans Database typegen.
  const { data: tissu } = await (
    supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (
            c: string,
            v: string,
          ) => {
            maybeSingle: () => Promise<{ data: { name: string } | null }>;
          };
        };
      };
    }
  )
    .from("boutique_tarif_tissus")
    .select("name")
    .eq("id", tissuId)
    .maybeSingle();

  const { data: grid } = await (
    supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (
            c: string,
            v: string,
          ) => {
            eq: (
              c: string,
              v: string,
            ) => {
              maybeSingle: () => Promise<{
                data: {
                  largeurs: number[];
                  hauteurs: number[];
                  grid: number[][];
                } | null;
              }>;
            };
          };
        };
      };
    }
  )
    .from("boutique_tarif_grids")
    .select("largeurs, hauteurs, grid")
    .eq("tissu_id", tissuId)
    .eq("confection", confection)
    .maybeSingle();

  if (!grid) return new Response("Grille introuvable", { status: 404 });

  const lines: string[] = [];
  lines.push([""].concat(grid.largeurs.map(String)).join(";"));
  grid.hauteurs.forEach((h, i) => {
    const row = grid.grid[i] ?? [];
    lines.push([String(h)].concat(row.map((n) => n.toString())).join(";"));
  });
  const csv = "﻿" + lines.join("\n"); // BOM Excel

  const safeName =
    (tissu?.name ?? "grille")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "grille";
  const filename = `${safeName}-${confection}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
