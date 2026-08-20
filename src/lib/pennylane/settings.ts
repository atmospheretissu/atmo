import { createServiceRoleClient } from "@/lib/supabase/server";

export type PennylaneSettings = {
  push_customer_enabled: boolean;
  push_invoice_enabled: boolean;
  pull_reconciliation_enabled: boolean;
  auto_reconcile_by_wire_label: boolean;
  last_push_at: string | null;
  last_pull_at: string | null;
  last_pull_stats: Record<string, unknown> | null;
  last_wire_scan_at: string | null;
  last_wire_scan_stats: Record<string, unknown> | null;
  last_error: string | null;
};

/**
 * Lit les toggles Pennylane. Service-role uniquement — RLS bloquerait
 * la lecture depuis les jobs cron sans user auth.
 */
export async function getPennylaneSettings(): Promise<PennylaneSettings> {
  const supabase = createServiceRoleClient();
  const { data } = await (
    supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (
            c: string,
            v: boolean,
          ) => {
            maybeSingle: () => Promise<{ data: PennylaneSettings | null }>;
          };
        };
      };
    }
  )
    .from("pennylane_settings")
    .select(
      "push_customer_enabled, push_invoice_enabled, pull_reconciliation_enabled, auto_reconcile_by_wire_label, last_push_at, last_pull_at, last_pull_stats, last_wire_scan_at, last_wire_scan_stats, last_error",
    )
    .eq("id", true)
    .maybeSingle();
  return (
    data ?? {
      push_customer_enabled: false,
      push_invoice_enabled: false,
      pull_reconciliation_enabled: false,
      auto_reconcile_by_wire_label: false,
      last_push_at: null,
      last_pull_at: null,
      last_pull_stats: null,
      last_wire_scan_at: null,
      last_wire_scan_stats: null,
      last_error: null,
    }
  );
}

export async function updatePennylaneSettings(
  patch: Partial<
    Pick<
      PennylaneSettings,
      | "push_customer_enabled"
      | "push_invoice_enabled"
      | "pull_reconciliation_enabled"
      | "auto_reconcile_by_wire_label"
    >
  >,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = createServiceRoleClient();
  const { error } = await (
    supabase as unknown as {
      from: (t: string) => {
        update: (v: unknown) => {
          eq: (
            c: string,
            v: boolean,
          ) => Promise<{ error: { message: string } | null }>;
        };
      };
    }
  )
    .from("pennylane_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function markPushed(): Promise<void> {
  const supabase = createServiceRoleClient();
  await (
    supabase as unknown as {
      from: (t: string) => {
        update: (v: unknown) => {
          eq: (c: string, v: boolean) => Promise<unknown>;
        };
      };
    }
  )
    .from("pennylane_settings")
    .update({ last_push_at: new Date().toISOString(), last_error: null })
    .eq("id", true);
}

export async function markPulled(
  stats: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceRoleClient();
  await (
    supabase as unknown as {
      from: (t: string) => {
        update: (v: unknown) => {
          eq: (c: string, v: boolean) => Promise<unknown>;
        };
      };
    }
  )
    .from("pennylane_settings")
    .update({
      last_pull_at: new Date().toISOString(),
      last_pull_stats: stats,
      last_error: null,
    })
    .eq("id", true);
}

export async function markError(msg: string): Promise<void> {
  const supabase = createServiceRoleClient();
  await (
    supabase as unknown as {
      from: (t: string) => {
        update: (v: unknown) => {
          eq: (c: string, v: boolean) => Promise<unknown>;
        };
      };
    }
  )
    .from("pennylane_settings")
    .update({ last_error: msg.slice(0, 500) })
    .eq("id", true);
}
