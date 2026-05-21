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
  try {
    const res = await fetch(`${BREVO_BASE}/transactionalSMS/sms`, {
      method: "POST",
      headers: {
        "api-key": getKey(),
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        recipient: payload.recipient,
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
