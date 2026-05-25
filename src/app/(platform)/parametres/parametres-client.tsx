"use client";

import { useState } from "react";
import {
  Users,
  Shield,
  Plug,
  Truck,
  FlaskConical,
  Hammer,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { SuppliersTab } from "@/components/parametres/suppliers-tab";
import { UsersTab } from "@/components/parametres/users-tab";
import { RolesTab } from "@/components/parametres/roles-tab";
import { IntegrationsTab } from "@/components/parametres/integrations-tab";
import { TestTab } from "@/components/parametres/test-tab";
import { EquipeTab } from "@/components/parametres/equipe-tab";
import type { Supplier } from "@/lib/db/suppliers";
import type { Profile, UserRole } from "@/lib/db/profiles-shared";
import type { SmsTemplate } from "@/lib/db/sms-templates-shared";
import type { EmailTemplate } from "@/lib/db/email-templates-shared";
import type { Poseur, Atelier } from "@/lib/db/equipe";
type TabKey = "fournisseurs" | "equipe" | "utilisateurs" | "roles" | "test" | "integrations";

type Props = {
  suppliers: Supplier[];
  profiles: Profile[];
  smsTemplates: SmsTemplate[];
  emailTemplates: EmailTemplate[];
  roleCounts: Record<UserRole, number>;
  envFlags: {
    stripe: boolean;
    brevoEmail: boolean;
    brevoSms: boolean;
    pennylane: boolean;
  };
  poseurs: Poseur[];
  ateliers: Atelier[];
};

export default function ParametresClient({
  suppliers,
  profiles,
  smsTemplates,
  emailTemplates,
  roleCounts,
  envFlags,
  poseurs,
  ateliers,
}: Props) {
  const [tab, setTab] = useState<TabKey>("equipe");

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
            <TabBtn active={tab === "equipe"} onClick={() => setTab("equipe")} icon={Hammer} label="Équipe" count={poseurs.length + ateliers.length} />
            <TabBtn active={tab === "fournisseurs"} onClick={() => setTab("fournisseurs")} icon={Truck} label="Fournisseurs" count={suppliers.length} />
            <TabBtn active={tab === "utilisateurs"} onClick={() => setTab("utilisateurs")} icon={Users} label="Utilisateurs" count={profiles.length} />
            <TabBtn active={tab === "roles"} onClick={() => setTab("roles")} icon={Shield} label="Rôles & accès" count={6} />
            <TabBtn active={tab === "test"} onClick={() => setTab("test")} icon={FlaskConical} label="Envoi & Test" count={0} />
            <TabBtn active={tab === "integrations"} onClick={() => setTab("integrations")} icon={Plug} label="Intégrations" count={5} />
          </nav>
        </section>

        <section className="px-8 pb-10">
          {tab === "equipe" && <EquipeTab initialPoseurs={poseurs} initialAteliers={ateliers} />}
          {tab === "fournisseurs" && <SuppliersTab suppliers={suppliers} />}
          {tab === "utilisateurs" && <UsersTab profiles={profiles} />}
          {tab === "roles" && <RolesTab counts={roleCounts} />}
          {tab === "test" && (
            <TestTab
              smsTemplates={smsTemplates}
              emailTemplates={emailTemplates}
              brevoConfigured={envFlags.brevoSms}
            />
          )}
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
