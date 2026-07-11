import { createClient } from "@/lib/supabase/server";

export type ChainettePrice = {
  id: string;
  code: string;
  label: string;
  price: number;
  position: number;
  active: boolean;
};

export async function listChainettePrices(opts?: {
  activeOnly?: boolean;
}): Promise<ChainettePrice[]> {
  const supabase = await createClient();
  let qb = (
    supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          order: (
            c: string,
            o: { ascending: boolean },
          ) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
        };
      };
    }
  )
    .from("boutique_chainette_prices")
    .select("id, code, label, price, position, active")
    .order("position", { ascending: true });
  if (opts?.activeOnly) {
    qb = (
      supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (
              c: string,
              v: boolean,
            ) => {
              order: (
                c: string,
                o: { ascending: boolean },
              ) => Promise<{
                data: unknown[] | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      }
    )
      .from("boutique_chainette_prices")
      .select("id, code, label, price, position, active")
      .eq("active", true)
      .order("position", { ascending: true });
  }
  const { data, error } = await qb;
  if (error) throw new Error(error.message);
  return ((data ?? []) as ChainettePrice[]).map((r) => ({
    ...r,
    price: Number(r.price),
  }));
}
