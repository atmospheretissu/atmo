/**
 * Client HTTP minimaliste pour l'API Pennylane v2.
 * https://app.pennylane.com/api/external/v2
 *
 * Deux tokens séparés (choix du client) :
 *   - PENNYLANE_TOKEN_CUSTOMERS : lecture/écriture sur /customers
 *   - PENNYLANE_TOKEN_INVOICES  : lecture/écriture sur /customer_invoices
 *
 * En dev les tokens sont absents → toutes les fonctions renvoient
 * `{ ok: false, disabled: true }`, ce qui permet à l'appelant de logguer
 * un skip propre sans casser le flow métier.
 */

const BASE = "https://app.pennylane.com/api/external/v2";

export type PennylaneResult<T> =
  | { ok: true; data: T }
  | { ok: false; disabled: true; reason: string }
  | { ok: false; disabled: false; status: number; message: string };

type Scope = "customers" | "invoices";

function tokenFor(scope: Scope): string | null {
  const t =
    scope === "customers"
      ? process.env.PENNYLANE_TOKEN_CUSTOMERS
      : process.env.PENNYLANE_TOKEN_INVOICES;
  return t?.trim() || null;
}

export function isPennylaneConfigured(): {
  customers: boolean;
  invoices: boolean;
} {
  return {
    customers: Boolean(tokenFor("customers")),
    invoices: Boolean(tokenFor("invoices")),
  };
}

export async function pennylaneRequest<T = unknown>(
  scope: Scope,
  path: string,
  init: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    query?: Record<string, string | number | undefined>;
  } = {},
): Promise<PennylaneResult<T>> {
  const token = tokenFor(scope);
  if (!token) {
    return {
      ok: false,
      disabled: true,
      reason: `Token Pennylane ${scope} absent (env PENNYLANE_TOKEN_${scope.toUpperCase()}).`,
    };
  }

  let url = `${BASE}${path}`;
  if (init.query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(init.query)) {
      if (v == null) continue;
      params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    // Ne pas cacher, jamais.
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message =
      (data as { message?: string; error?: string } | null)?.message ??
      (data as { error?: string } | null)?.error ??
      `HTTP ${res.status}`;
    return { ok: false, disabled: false, status: res.status, message };
  }

  return { ok: true, data: data as T };
}
