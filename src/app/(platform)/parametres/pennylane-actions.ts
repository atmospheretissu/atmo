"use server";

import { revalidatePath } from "next/cache";
import {
  getPennylaneSettings,
  updatePennylaneSettings,
  type PennylaneSettings,
} from "@/lib/pennylane/settings";
import { pullPennylaneInvoices } from "@/lib/pennylane/pull";
import { pullWireTransfersAndReconcile } from "@/lib/pennylane/wire-match";
import { isPennylaneConfigured } from "@/lib/pennylane/client";

export type PennylaneStatus = {
  settings: PennylaneSettings;
  tokens: { customers: boolean; invoices: boolean; transactions: boolean };
  env: {
    tokensReady: boolean;
    transactionsTokenReady: boolean;
    cronSecretReady: boolean;
  };
};

export async function getPennylaneStatusAction(): Promise<PennylaneStatus> {
  const settings = await getPennylaneSettings();
  const tokens = isPennylaneConfigured();
  return {
    settings,
    tokens,
    env: {
      tokensReady: tokens.customers && tokens.invoices,
      transactionsTokenReady: tokens.transactions,
      cronSecretReady: Boolean(process.env.PENNYLANE_CRON_SECRET?.trim()),
    },
  };
}

export async function togglePennylaneFeatureAction(
  feature:
    | "push_customer_enabled"
    | "push_invoice_enabled"
    | "pull_reconciliation_enabled"
    | "auto_reconcile_by_wire_label",
  value: boolean,
): Promise<{ ok: boolean; message?: string }> {
  const r = await updatePennylaneSettings({ [feature]: value });
  if (r.ok) revalidatePath("/parametres");
  return r;
}

/** Déclenche manuellement un pull immédiat (utile pour test). */
export async function triggerPennylanePullNowAction(): Promise<{
  ok: boolean;
  message?: string;
  scanned?: number;
  matched?: number;
}> {
  const r = await pullPennylaneInvoices({ maxPages: 3 });
  if (r.disabled) {
    return { ok: false, message: r.message ?? "Pull désactivé" };
  }
  revalidatePath("/parametres");
  return {
    ok: r.ok,
    message: r.errors.length > 0 ? r.errors.join(" · ") : undefined,
    scanned: r.scanned,
    matched: r.matched,
  };
}

/** Déclenche manuellement un scan des virements bancaires. */
export async function triggerWireScanNowAction(): Promise<{
  ok: boolean;
  message?: string;
  scanned?: number;
  acomptes?: number;
  soldes?: number;
  skipped?: number;
}> {
  const r = await pullWireTransfersAndReconcile({ maxPages: 3, source: "manual_scan" });
  if (r.disabled) {
    return { ok: false, message: r.message ?? "Auto-rapprochement désactivé" };
  }
  revalidatePath("/parametres");
  return {
    ok: r.ok,
    message: r.errors.length > 0 ? r.errors.join(" · ") : undefined,
    scanned: r.scanned,
    acomptes: r.acomptes_marked,
    soldes: r.soldes_marked,
    skipped: r.skipped_amount + r.skipped_no_devis,
  };
}
