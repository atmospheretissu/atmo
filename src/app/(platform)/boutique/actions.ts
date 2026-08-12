"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { getNextDevisNumber } from "@/lib/db/devis";
import { getCreationStoreId } from "@/lib/db/stores";

export type BoutiquePieceArticle = {
  /** Type d'article — utilisé pour grouper, charger les BC fournisseurs, etc. */
  type:
    | "produit"
    | "rideau"
    | "store"
    | "rideau_serie"
    | "store_enrouleur"
    | "pose"
    | "autre";
  /** Désignation prête à imprimer dans le devis */
  designation: string;
  /** Référence interne (ex: SKU catalogue, type+id) */
  ref?: string;
  /** Détail technique optionnel (sens, métrage, sous-totaux) */
  detail?: string;
  qty: number;
  unitLabel: string;
  unitPriceHt: number;
  meta?: Record<string, unknown>;
};

export type BoutiquePiece = {
  name: string;
  articles: BoutiquePieceArticle[];
};

export type BoutiqueDevisInput = {
  clientId: string;
  channel:
    | "magasin"
    | "leroy_merlin"
    | "saint_maclou"
    | "ecommerce"
    | "decoratrice"
    | "visio";
  tvaRate: number;
  workshopNotes?: string;
  pieces: BoutiquePiece[];
  acomptePct?: number;
  hideMeasurementsForClient?: boolean;
};

export type BoutiqueFormState =
  | { ok: true; id?: string }
  | { ok: false; message: string }
  | undefined;

/**
 * Crée un devis (en brouillon) à partir des pièces & articles saisies dans la boutique.
 * Chaque article devient une ligne de devis_lines, avec `position` séquentielle et
 * `meta` contenant la pièce + le détail du calcul.
 */
export async function createBoutiqueDevisAction(
  input: BoutiqueDevisInput
): Promise<BoutiqueFormState> {
  if (!input.clientId) return { ok: false, message: "Client requis." };
  if (!input.pieces.length) return { ok: false, message: "Ajoute au moins une pièce." };
  const totalArticles = input.pieces.reduce((acc, p) => acc + p.articles.length, 0);
  if (totalArticles === 0) return { ok: false, message: "Au moins une ligne requise." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée." };

  // Aplatissement pièces → lignes
  const lines: Array<{
    position: number;
    ref: string | null;
    label: string;
    detail: string | null;
    qty: number;
    unit_label: string;
    unit_price_ht: number;
    meta: Database["public"]["Tables"]["devis_lines"]["Row"]["meta"];
  }> = [];
  let pos = 0;
  for (const piece of input.pieces) {
    for (const a of piece.articles) {
      lines.push({
        position: pos++,
        ref: a.ref ?? null,
        label: `${piece.name} · ${a.designation}`,
        detail: a.detail ?? null,
        qty: a.qty,
        unit_label: a.unitLabel,
        unit_price_ht: a.unitPriceHt,
        meta: {
          piece: piece.name,
          type: a.type,
          ...(a.meta ?? {}),
        } as Database["public"]["Tables"]["devis_lines"]["Row"]["meta"],
      });
    }
  }

  const totalHt = lines.reduce(
    (acc, l) => acc + Math.round(l.qty * l.unit_price_ht * 100) / 100,
    0
  );
  const tva = Math.round(totalHt * (input.tvaRate / 100) * 100) / 100;
  const totalTtc = Math.round((totalHt + tva) * 100) / 100;

  // Récupère le canal du client comme défaut + le résumé produit
  const productSummary = "Devis boutique";
  const productDetail = input.pieces.map((p) => p.name).join(" · ");
  const number = await getNextDevisNumber();
  const validUntil = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
  const storeId = await getCreationStoreId();

  const { data: devis, error: e1 } = await (
    supabase as unknown as {
      from: (t: string) => {
        insert: (v: unknown) => {
          select: (s: string) => {
            single: () => Promise<{
              data: { id: string; number: string } | null;
              error: { message?: string } | null;
            }>;
          };
        };
      };
    }
  )
    .from("devis")
    .insert({
      number,
      version: 1,
      client_id: input.clientId,
      channel: input.channel,
      status: "brouillon",
      product_summary: productSummary,
      product_detail: productDetail,
      qty: lines.reduce((acc, l) => acc + Math.ceil(l.qty), 0),
      total_ht: totalHt,
      total_ttc: totalTtc,
      tva_rate: input.tvaRate,
      workshop_notes: input.workshopNotes || null,
      valid_until: validUntil,
      commercial_id: user.id,
      acompte_pct: input.acomptePct ?? 50,
      hide_measurements_for_client: input.hideMeasurementsForClient ?? false,
      store_id: storeId,
    })
    .select("id")
    .single();

  if (e1 || !devis) {
    return {
      ok: false,
      message:
        (e1 as { code?: string } | undefined)?.code === "23505"
          ? `Le numéro ${number} existe déjà (réessaye).`
          : e1?.message ?? "Échec de création",
    };
  }

  const linesPayload = lines.map((l) => ({
    devis_id: devis.id,
    ...l,
  }));
  const { error: e2 } = await supabase.from("devis_lines").insert(linesPayload);
  if (e2) {
    await supabase.from("devis").delete().eq("id", devis.id);
    return { ok: false, message: `Échec ajout des lignes : ${e2.message}` };
  }

  // NOTE : la fiche confection (dossier) n'est PAS créée ici. Elle est
  // créée uniquement à la réception de l'acompte via markAcompteRecuAction
  // (ou via le webhook Stripe). Sinon le dossier remonterait à tort dans
  // l'étape "attente matière" du flux dashboard alors que le devis est
  // toujours en brouillon.

  revalidatePath("/devis");
  revalidatePath("/confections");
  revalidatePath("/commandes");
  revalidatePath("/dashboard");
  redirect(`/devis/${devis.id}`);
}

/**
 * Recherche dans le catalogue produits (~45k SKUs) — sur la table
 * public.catalog_products, éditable dans Paramètres > Data. Retourne
 * max 30 résultats actifs.
 */
export async function searchCatalogProductsAction(
  opts:
    | string
    | { q?: string; category?: string | null; supplier?: string | null },
): Promise<Array<{
  reference: string;
  nom: string;
  designation: string;
  prix: number | null;
  fournisseur: string;
}>> {
  const params = typeof opts === "string" ? { q: opts } : opts ?? {};
  const q = (params.q ?? "").trim();
  const category = params.category ?? null;
  const supplier = params.supplier ?? null;
  const hasFilter = Boolean(category || supplier);
  const hasQuery = q.length >= 2;
  if (!hasFilter && !hasQuery) return [];

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  type Row = {
    ref: string;
    name: string;
    description: string | null;
    unit_price_ht: number | string | null;
    supplier_name: string | null;
  };
  type QueryChain = {
    eq: (c: string, v: unknown) => QueryChain;
    or: (f: string) => QueryChain;
    order: (c: string, o: { ascending: boolean }) => QueryChain;
    limit: (n: number) => Promise<{ data: Row[] | null }>;
  };
  let qb = (
    supabase as unknown as {
      from: (t: string) => { select: (s: string) => QueryChain };
    }
  )
    .from("catalog_products")
    .select("ref, name, description, unit_price_ht, supplier_name")
    .eq("active", true) as QueryChain;
  if (category) qb = qb.eq("category", category);
  if (supplier) qb = qb.eq("supplier_name", supplier);
  if (hasQuery) {
    qb = qb.or(
      `ref.ilike.%${q}%,name.ilike.%${q}%,supplier_name.ilike.%${q}%`,
    );
  }
  const { data } = await qb.order("name", { ascending: true }).limit(30);
  return (data ?? []).map((p) => ({
    reference: p.ref,
    nom: p.name,
    designation: p.description ?? p.name,
    prix: p.unit_price_ht == null ? null : Number(p.unit_price_ht),
    fournisseur: p.supplier_name ?? "",
  }));
}

/** Liste distincte catégories + fournisseurs pour peupler les filtres UI. */
export async function listBoutiqueCatalogFacetsAction(): Promise<{
  categories: string[];
  suppliers: string[];
}> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const rpc = supabase as unknown as {
    rpc: (
      name: string,
    ) => Promise<{ data: { supplier_name: string }[] | null }>;
  };
  const { data: sups } = await rpc.rpc("distinct_catalog_suppliers");
  const suppliers = ((sups ?? []) as { supplier_name: string }[])
    .map((r) => r.supplier_name)
    .filter(Boolean);
  const { data: cats } = await supabase
    .from("catalog_products")
    .select("category")
    .eq("active", true)
    .limit(5000);
  const categories = Array.from(
    new Set(
      (cats ?? [])
        .map((c) => c.category)
        .filter((c): c is string => Boolean(c && c !== "Autre")),
    ),
  ).sort((a, b) => a.localeCompare(b, "fr"));
  if ((cats ?? []).some((c) => c.category === "Autre")) categories.push("Autre");
  return { categories, suppliers };
}
