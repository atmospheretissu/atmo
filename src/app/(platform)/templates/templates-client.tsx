"use client";

import { useState } from "react";
import { MessageSquare, Mail } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { SmsTemplatesTab } from "@/components/parametres/sms-templates-tab";
import { EmailTemplatesTab } from "@/components/parametres/email-templates-tab";
import type { SmsTemplate } from "@/lib/db/sms-templates-shared";
import type { EmailTemplate } from "@/lib/db/email-templates-shared";

type TabKey = "sms" | "email";

type Props = {
  smsTemplates: SmsTemplate[];
  emailTemplates: EmailTemplate[];
  envFlags: { brevoSms: boolean; brevoEmail: boolean };
};

export default function TemplatesClient({ smsTemplates, emailTemplates, envFlags }: Props) {
  const [tab, setTab] = useState<TabKey>("sms");

  return (
    <>
      <Topbar
        breadcrumb={[{ label: "Atmosphère" }, { label: "Admin" }, { label: "Templates" }]}
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Administration</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Templates de communication
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Édite les SMS et emails envoyés automatiquement aux clients. Variables{" "}
            <span className="font-mono">{`{{prenom}}`}</span>,{" "}
            <span className="font-mono">{`{{produit}}`}</span>, etc. interpolées à l&apos;envoi.
          </p>
        </section>

        <section className="px-8 pb-6">
          <nav className="flex items-center gap-1 border-b border-line">
            <TabBtn
              active={tab === "sms"}
              onClick={() => setTab("sms")}
              icon={MessageSquare}
              label="Templates SMS"
              count={smsTemplates.length}
            />
            <TabBtn
              active={tab === "email"}
              onClick={() => setTab("email")}
              icon={Mail}
              label="Templates Email"
              count={emailTemplates.length}
            />
          </nav>
        </section>

        <section className="px-8 pb-10">
          {tab === "sms" && (
            <SmsTemplatesTab templates={smsTemplates} brevoConfigured={envFlags.brevoSms} />
          )}
          {tab === "email" && (
            <EmailTemplatesTab templates={emailTemplates} brevoConfigured={envFlags.brevoEmail} />
          )}
        </section>
      </div>
    </>
  );
}

function TabBtn({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "h-10 px-3.5 -mb-px relative inline-flex items-center gap-2 text-[13px] font-medium transition-colors " +
        (active
          ? "text-ink border-b-2 border-ink"
          : "text-muted hover:text-ink border-b-2 border-transparent")
      }
    >
      <Icon className="h-4 w-4" strokeWidth={2.2} />
      {label}
      <span
        className={
          "text-[10.5px] font-mono font-semibold px-1.5 py-0.5 rounded-full tabular-nums " +
          (active ? "bg-canvas-2 text-ink-2" : "bg-canvas-2 text-muted")
        }
      >
        {count}
      </span>
    </button>
  );
}
