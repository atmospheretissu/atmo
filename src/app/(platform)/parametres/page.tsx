import { listSuppliers } from "@/lib/db/suppliers";
import { listProfiles, getRoleCounts } from "@/lib/db/profiles";
import { listSmsTemplates } from "@/lib/db/sms-templates";
import { listRecentSmsLog } from "@/lib/db/sms-log";
import { getBrevoAccount } from "@/lib/brevo/account";
import ParametresClient from "./parametres-client";

export const dynamic = "force-dynamic";

export default async function ParametresPage() {
  const [suppliers, profiles, smsTemplates, roleCounts, recentSmsLog, brevoAccount] =
    await Promise.all([
      listSuppliers(),
      listProfiles(),
      listSmsTemplates(),
      getRoleCounts(),
      listRecentSmsLog(20),
      getBrevoAccount(),
    ]);

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
      recentSmsLog={recentSmsLog}
      brevoAccount={brevoAccount}
    />
  );
}
