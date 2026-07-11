"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  listChainettePrices,
  type ChainettePrice,
} from "@/lib/db/boutique-chainette";

type SupabaseFrom = (t: string) => {
  update: (v: Record<string, unknown>) => {
    eq: (
      k: string,
      v: string,
    ) => Promise<{ error: { message: string } | null }>;
  };
  insert: (
    v: Record<string, unknown>,
  ) => Promise<{ error: { message: string } | null }>;
  delete: () => {
    eq: (
      k: string,
      v: string,
    ) => Promise<{ error: { message: string } | null }>;
  };
};

export async function listChainettePricesAction(): Promise<ChainettePrice[]> {
  return listChainettePrices();
}

export async function updateChainettePriceAction(
  id: string,
  patch: { label?: string; price?: number; active?: boolean; position?: number },
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const update: Record<string, unknown> = {};
  if (patch.label !== undefined) update.label = patch.label;
  if (patch.price !== undefined) update.price = patch.price;
  if (patch.active !== undefined) update.active = patch.active;
  if (patch.position !== undefined) update.position = patch.position;
  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await (supabase as unknown as { from: SupabaseFrom })
    .from("boutique_chainette_prices")
    .update(update)
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}

export async function createChainetteColorAction(input: {
  code: string;
  label: string;
  price: number;
}): Promise<{ ok: boolean; message?: string }> {
  const code = input.code.trim().toLowerCase();
  const label = input.label.trim();
  if (!code) return { ok: false, message: "Code requis." };
  if (!label) return { ok: false, message: "Libellé requis." };
  if (input.price < 0) return { ok: false, message: "Prix négatif interdit." };

  const supabase = await createClient();
  const { error } = await (supabase as unknown as { from: SupabaseFrom })
    .from("boutique_chainette_prices")
    .insert({
      code,
      label,
      price: input.price,
      position: 99,
      active: true,
    });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}

export async function deleteChainetteColorAction(
  id: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const { error } = await (supabase as unknown as { from: SupabaseFrom })
    .from("boutique_chainette_prices")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/parametres");
  return { ok: true };
}
