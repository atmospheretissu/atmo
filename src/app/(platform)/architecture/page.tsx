import { listAutomationRules } from "@/lib/db/automation-rules";
import { listEventAlerts } from "@/lib/db/event-alerts";
import { listSmsTemplates } from "@/lib/db/sms-templates";
import { listEmailTemplates } from "@/lib/db/email-templates";
import ArchitectureClient from "./architecture-client";

export const dynamic = "force-dynamic";

export default async function ArchitecturePage() {
  const [rules, alerts, smsTemplates, emailTemplates] = await Promise.all([
    listAutomationRules(),
    listEventAlerts(),
    listSmsTemplates(),
    listEmailTemplates(),
  ]);

  return (
    <ArchitectureClient
      rules={rules}
      alerts={alerts}
      smsTemplates={smsTemplates}
      emailTemplates={emailTemplates}
    />
  );
}
