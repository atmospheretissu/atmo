"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { getNextDevisNumber } from "@/lib/db/devis";

export type BoutiquePieceArticle = {
  /** Type d'article : produit catalogue (Part 1), puis rideau, store, rideau_serie */
  type: "produit" | "rideau" | "store" | "rideau_serie";
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
  channel: "magasin" | "leroy_merlin" | "ecommerce" | "decoratrice" | "visio";
  tvaRate: number;
  workshopNotes?: string;
  pieces: BoutiquePiece[];
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

  const { data: devis, error: e1 } = await supabase
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
    })
    .select("id")
    .single();

  if (e1 || !devis) {
    return {
      ok: false,
      message:
        e1?.code === "23505"
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

  revalidatePath("/devis");
  revalidatePath("/dashboard");
  redirect(`/devis/${devis.id}`);
}

/**
 * Recherche dans le catalogue produits (47k SKUs) — server-side pour ne pas
 * envoyer 6 MB au client. Retourne max 30 résultats.
 */
export async function searchCatalogProductsAction(
  query: string
): Promise<Array<{
  reference: string;
  nom: string;
  designation: string;
  prix: number | null;
  fournisseur: string;
}>> {
  if (!query || query.length < 2) return [];

  // Import dynamique pour ne pas inclure les 6MB dans le bundle client
  const { CATALOG_PRODUCTS } = await import("@/lib/boutique/products-catalog");
  const q = query.toLowerCase();
  const results: typeof CATALOG_PRODUCTS = [];
  for (const p of CATALOG_PRODUCTS) {
    if (
      p.nom.toLowerCase().includes(q) ||
      p.reference.toLowerCase().includes(q) ||
      p.fournisseur.toLowerCase().includes(q)
    ) {
      results.push(p);
      if (results.length >= 30) break;
    }
  }
  return results.map((p) => ({
    reference: p.reference,
    nom: p.nom,
    designation: p.designation,
    prix: p.prix,
    fournisseur: p.fournisseur,
  }));
}
