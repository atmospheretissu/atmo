import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // RFC 4180 : entourer de " si contient , " ou saut de ligne, doubler les "
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const q = url.searchParams.get("q");

  const supabase = await createClient();
  let qb = supabase
    .from("catalog_products")
    .select(
      "ref, name, category, description, unit_price_ht, unit_label, width_cm, raccord_cm, is_collection, stock_poland, stock_ukraine, active",
    )
    .order("category", { ascending: true })
    .order("name", { ascending: true })
    .limit(50000);
  if (category && category !== "all") qb = qb.eq("category", category);
  if (q && q.trim().length > 0) {
    const term = q.trim();
    qb = qb.or(
      `ref.ilike.%${term}%,name.ilike.%${term}%,description.ilike.%${term}%`,
    );
  }

  const { data, error } = await qb;
  if (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }

  const rows = data ?? [];

  const headers = [
    "ref",
    "name",
    "category",
    "description",
    "unit_price_ht",
    "unit_label",
    "width_cm",
    "raccord_cm",
    "is_collection",
    "stock_poland",
    "stock_ukraine",
    "active",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape((r as Record<string, unknown>)[h])).join(","));
  }
  const csv = "﻿" + lines.join("\n"); // BOM pour Excel FR

  const filename = `catalogue-${new Date().toISOString().slice(0, 10)}${
    category && category !== "all" ? `-${category}` : ""
  }.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
