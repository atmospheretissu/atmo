"use client";

import { useState } from "react";
import {
  Users,
  Shield,
  MessageSquare,
  Plug,
  Truck,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { SuppliersTab } from "@/components/parametres/suppliers-tab";
import { UsersTab } from "@/components/parametres/users-tab";
import { SmsTemplatesTab } from "@/components/parametres/sms-templates-tab";
import { RolesTab } from "@/components/parametres/roles-tab";
import { IntegrationsTab } from "@/components/parametres/integrations-tab";
import type { Supplier } from "@/lib/db/suppliers";
import type { Profile, UserRole } from "@/lib/db/profiles-shared";
import type { SmsTemplate } from "@/lib/db/sms-templates-shared";

type TabKey = "fournisseurs" | "utilisateurs" | "roles" | "sms" | "integrations";

type Props = {
  suppliers: Supplier[];
  profiles: Profile[];
  smsTemplates: SmsTemplate[];
  roleCounts: Record<UserRole, number>;
  envFlags: {
    stripe: boolean;
    brevoEmail: boolean;
    brevoSms: boolean;
    pennylane: boolean;
  };
};

export default function ParametresClient({
  suppliers,
  profiles,
  smsTemplates,
  roleCounts,
  envFlags,
}: Props) {
  const [tab, setTab] = useState<TabKey>("fournisseurs");

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Paramètres" },
        ]}
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Administration</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Paramètres
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Fournisseurs, équipe, rôles, templates SMS et intégrations Stripe / Brevo / Pennylane.
          </p>
        </section>

        <section className="px-8 pb-6">
          <nav className="flex items-center gap-1 border-b border-line">
            <TabBtn active={tab === "fournisseurs"} onClick={() => setTab("fournisseurs")} icon={Truck} label="Fournisseurs" count={suppliers.length} />
            <TabBtn active={tab === "utilisateurs"} onClick={() => setTab("utilisateurs")} icon={Users} label="Utilisateurs" count={profiles.length} />
            <TabBtn active={tab === "roles"} onClick={() => setTab("roles")} icon={Shield} label="Rôles & accès" count={6} />
            <TabBtn active={tab === "sms"} onClick={() => setTab("sms")} icon={MessageSquare} label="Templates SMS" count={smsTemplates.length} />
            <TabBtn active={tab === "integrations"} onClick={() => setTab("integrations")} icon={Plug} label="Intégrations" count={5} />
          </nav>
        </section>

        <section className="px-8 pb-10">
          {tab === "fournisseurs" && <SuppliersTab suppliers={suppliers} />}
          {tab === "utilisateurs" && <UsersTab profiles={profiles} />}
          {tab === "roles" && <RolesTab counts={roleCounts} />}
          {tab === "sms" && <SmsTemplatesTab templates={smsTemplates} brevoConfigured={envFlags.brevoSms} />}
          {tab === "integrations" && <IntegrationsTab envFlags={envFlags} />}
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
