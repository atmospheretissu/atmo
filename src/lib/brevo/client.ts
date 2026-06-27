/**
 * Helpers Brevo (ex-Sendinblue) — API transactionnelle email + SMS.
 * Pas de SDK officiel léger, on tape fetch directement.
 */

const BREVO_BASE = "https://api.brevo.com/v3";

function getKey(): string {
  const k = process.env.BREVO_API_KEY;
  if (!k) {
    throw new Error("BREVO_API_KEY non configurée.");
  }
  return k;
}

export function isBrevoConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY);
}

/**
 * Mode sandbox : intercepte tous les envois et les loggue au lieu de les
 * faire partir vers Brevo. Activé automatiquement dès que l'env n'est pas
 * "prod" (recette / dev / preview / local). Peut être forcé via la variable
 * MAIL_SANDBOX=1 (ou désactivé via MAIL_SANDBOX=0 si on veut vraiment
 * tester un vrai envoi depuis dev).
 */
export function isMailSandbox(): boolean {
  const explicit = process.env.MAIL_SANDBOX;
  if (explicit === "1" || explicit?.toLowerCase() === "true") return true;
  if (explicit === "0" || explicit?.toLowerCase() === "false") return false;
  const env = (process.env.NEXT_PUBLIC_APP_ENV ?? "").toLowerCase();
  return env !== "" && env !== "prod" && env !== "production";
}

function fakeMessageId(prefix: string): string {
  return `${prefix}-sandbox-${Math.random().toString(36).slice(2, 10)}`;
}

export type BrevoEmailPayload = {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  sender?: { email: string; name: string };
  replyTo?: { email: string; name?: string };
  attachment?: { content: string; name: string }[]; // content = base64
};

export async function sendBrevoEmail(payload: BrevoEmailPayload): Promise<
  { ok: true; messageId: string } | { ok: false; message: string }
> {
  if (isMailSandbox()) {
    const recipients = payload.to.map((t) => t.email).join(", ");
    console.log(
      `[MAIL SANDBOX] Email NON envoyé · ${recipients} · sujet="${payload.subject}" · ${
        payload.attachment?.length ?? 0
      } pj`,
    );
    return { ok: true, messageId: fakeMessageId("email") };
  }
  try {
    const res = await fetch(`${BREVO_BASE}/smtp/email`, {
      method: "POST",
      headers: {
        "api-key": getKey(),
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        ...payload,
        sender: payload.sender ?? {
          email: process.env.BREVO_SENDER_EMAIL ?? "contact@atmospheretissus.fr",
          name: process.env.BREVO_SENDER_NAME ?? "Atmosphère Tissus",
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: `Brevo ${res.status} — ${text.slice(0, 200)}` };
    }

    const data = (await res.json()) as { messageId?: string };
    return { ok: true, messageId: data.messageId ?? "" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Erreur réseau" };
  }
}

export type BrevoSmsPayload = {
  recipient: string; // +33612345678
  content: string; // max 160 chars (SMS standard)
  sender?: string; // 11 chars max
  tag?: string;
};

export async function sendBrevoSms(
  payload: BrevoSmsPayload
): Promise<{ ok: true; messageId: string } | { ok: false; message: string }> {
  // Normalisation E.164 — Brevo refuse les numéros nationaux FR (0XXX)
  const { normalizePhone } = await import("./normalize-phone");
  const normalized = normalizePhone(payload.recipient);
  if (!normalized) {
    return {
      ok: false,
      message: `Numéro de téléphone invalide : "${payload.recipient}" (attendu format international, ex: +33667699490)`,
    };
  }
  if (isMailSandbox()) {
    console.log(
      `[MAIL SANDBOX] SMS NON envoyé · ${normalized} · "${payload.content.slice(0, 80)}${
        payload.content.length > 80 ? "…" : ""
      }"`,
    );
    return { ok: true, messageId: fakeMessageId("sms") };
  }
  try {
    const res = await fetch(`${BREVO_BASE}/transactionalSMS/sms`, {
      method: "POST",
      headers: {
        "api-key": getKey(),
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        recipient: normalized,
        content: payload.content,
        sender: payload.sender ?? process.env.BREVO_SMS_SENDER ?? "ATMOSPHERE",
        type: "transactional",
        tag: payload.tag,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: `Brevo SMS ${res.status} — ${text.slice(0, 200)}` };
    }

    const data = (await res.json()) as { messageId?: number; reference?: string };
    return { ok: true, messageId: String(data.messageId ?? data.reference ?? "") };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Erreur réseau" };
  }
}
