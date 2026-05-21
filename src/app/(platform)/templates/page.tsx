import { listSmsTemplates } from "@/lib/db/sms-templates";
import { listEmailTemplates } from "@/lib/db/email-templates";
import TemplatesClient from "./templates-client";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const [smsTemplates, emailTemplates] = await Promise.all([
    listSmsTemplates(),
    listEmailTemplates(),
  ]);

  const envFlags = {
    brevoEmail: Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL),
    brevoSms: Boolean(process.env.BREVO_API_KEY),
  };

  return (
    <TemplatesClient
      smsTemplates={smsTemplates}
      emailTemplates={emailTemplates}
      envFlags={envFlags}
    />
  );
}
