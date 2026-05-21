import { isBrevoConfigured } from "./client";

const BREVO_BASE = "https://api.brevo.com/v3";

export type BrevoAccountInfo = {
  ok: true;
  email: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  plan: Array<{
    type: string;
    creditsType: string;
    credits: number;
  }>;
  smsCreditsLeft: number | null;
  emailCreditsLeft: number | null;
} | { ok: false; message: string };

/**
 * Fetch GET /account from Brevo. Returns the account email + plan/credits.
 * Used by the Test tab in Paramètres to confirm the key is valid and credits available.
 */
export async function getBrevoAccount(): Promise<BrevoAccountInfo> {
  if (!isBrevoConfigured()) {
    return { ok: false, message: "BREVO_API_KEY non configurée" };
  }
  try {
    const res = await fetch(`${BREVO_BASE}/account`, {
      method: "GET",
      headers: {
        "api-key": process.env.BREVO_API_KEY!,
        accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: `Brevo ${res.status} — ${text.slice(0, 300)}` };
    }
    const data = (await res.json()) as {
      email: string;
      firstName?: string;
      lastName?: string;
      companyName?: string;
      plan?: Array<{ type: string; creditsType: string; credits: number }>;
    };
    const plan = data.plan ?? [];
    const sms = plan.find((p) => p.creditsType === "sendLimit" && p.type === "sms");
    const email = plan.find((p) => p.creditsType === "sendLimit" && p.type !== "sms");
    return {
      ok: true,
      email: data.email,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      companyName: data.companyName ?? null,
      plan,
      smsCreditsLeft: sms?.credits ?? null,
      emailCreditsLeft: email?.credits ?? null,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Erreur réseau" };
  }
}
