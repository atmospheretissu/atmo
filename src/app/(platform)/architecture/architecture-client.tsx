"use client";

import { Topbar } from "@/components/shell/topbar";
import { ArchitectureTab } from "@/components/parametres/architecture-tab";
import type { AutomationRule } from "@/lib/db/automation-rules-shared";
import type { EventAlert } from "@/lib/db/event-alerts-shared";
import type { SmsTemplate } from "@/lib/db/sms-templates-shared";
import type { EmailTemplate } from "@/lib/db/email-templates-shared";

type Props = {
  rules: AutomationRule[];
  alerts: EventAlert[];
  smsTemplates: SmsTemplate[];
  emailTemplates: EmailTemplate[];
};

export default function ArchitectureClient({
  rules,
  alerts,
  smsTemplates,
  emailTemplates,
}: Props) {
  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Admin" },
          { label: "Architecture" },
        ]}
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Administration</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Architecture des communications
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Vue d&apos;ensemble des événements métier et configuration des SMS / emails clients +
            alertes internes pour chacun. Les modifications sont appliquées immédiatement aux
            triggers du code.
          </p>
        </section>

        <section className="px-8 pb-10">
          <ArchitectureTab
            rules={rules}
            alerts={alerts}
            smsTemplates={smsTemplates}
            emailTemplates={emailTemplates}
          />
        </section>
      </div>
    </>
  );
}
