import { listSuppliers } from "@/lib/db/suppliers";
import { listProfiles } from "@/lib/db/profiles";
import { listSmsTemplates } from "@/lib/db/sms-templates";
import ParametresClient from "./parametres-client";
import type { UserRole } from "@/lib/db/profiles-shared";

export const dynamic = "force-dynamic";

export default async function ParametresPage() {
  // SSR : on ne fetch que ce qui est nécessaire à la 1ère vue (suppliers, profiles,
  // templates). Brevo (HTTP externe ~500ms) + sms_log sont lazy-loadés côté client
  // quand on ouvre le Test tab.
  const [suppliers, profiles, smsTemplates] = await Promise.all([
    listSuppliers(),
    listProfiles(),
    listSmsTemplates(),
  ]);

  // Counts dérivés des profiles déjà fetchés (au lieu d'une 2e query DB)
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
      roleCounts={roleCounts}
      envFlags={envFlags}
    />
  );
}
