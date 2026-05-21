import { listSuppliers } from "@/lib/db/suppliers";
import { listProfiles } from "@/lib/db/profiles";
import { listSmsTemplates } from "@/lib/db/sms-templates";
import { listEmailTemplates } from "@/lib/db/email-templates";
import { listAutomationRules } from "@/lib/db/automation-rules";
import ParametresClient from "./parametres-client";
import type { UserRole } from "@/lib/db/profiles-shared";

export const dynamic = "force-dynamic";

export default async function ParametresPage() {
  const [suppliers, profiles, smsTemplates, emailTemplates, automationRules] =
    await Promise.all([
      listSuppliers(),
      listProfiles(),
      listSmsTemplates(),
      listEmailTemplates(),
      listAutomationRules(),
    ]);

  const roleCounts: Record<UserRole, number> = {
    admin: 0,
    commercial: 0,
    resp_confection: 0,
    couturiere: 0,
    poseur: 0,
    decoratrice: 0,
  };
  for (const p of profiles) {
    if (p.active !== false) roleCounts[p.role] += 1;
  }

  const envFlags = {
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    brevoEmail: Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL),
    brevoSms: Boolean(process.env.BREVO_API_KEY),
    pennylane: Boolean(process.env.PENNYLANE_API_KEY),
  };

  return (
    <ParametresClient
      suppliers={suppliers}
      profiles={profiles}
      smsTemplates={smsTemplates}
      emailTemplates={emailTemplates}
      automationRules={automationRules}
      roleCounts={roleCounts}
      envFlags={envFlags}
    />
  );
}
