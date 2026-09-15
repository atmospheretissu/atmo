"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Reprend le scraping après une pause auto (circuit-breaker) ou manuelle.
 * Remet paused_at + paused_reason à NULL et reset le compteur d'échecs.
 * Le worker recharge la config toutes les 5 min → la reprise sera effective
 * au prochain tick de cron.
 */
export async function resumeAtmoleadAction(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const sb = createServiceRoleClient();
  const { error } = await (
    sb as unknown as {
      from: (t: string) => {
        update: (v: Record<string, unknown>) => {
          not: (
            c: string,
            op: string,
            v: unknown,
          ) => Promise<{ error: { message?: string } | null }>;
        };
      };
    }
  )
    .from("atmolead_config")
    .update({
      paused_at: null,
      paused_reason: null,
      consecutive_failures: 0,
    })
    .not("id", "is", null);
  if (error) return { ok: false, message: error.message ?? "Update échouée" };
  revalidatePath("/leads-lm");
  revalidatePath("/leads-lm/config");
  revalidatePath("/leads-lm/executions");
  return { ok: true };
}
