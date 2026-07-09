"use client";

import { useState } from "react";
import {
  Users,
  Shield,
  Plug,
  Truck,
  FlaskConical,
  Hammer,
  Building2,
  Database,
  MessageSquare,
  Settings as SettingsIcon,
  Workflow,
  Send,
  Mail,
  Inbox,
  Activity,
  Sparkles,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { SuppliersTab } from "@/components/parametres/suppliers-tab";
import { UsersTab } from "@/components/parametres/users-tab";
import { RolesTab } from "@/components/parametres/roles-tab";
import { IntegrationsTab } from "@/components/parametres/integrations-tab";
import { TestTab } from "@/components/parametres/test-tab";
import { EquipeTab } from "@/components/parametres/equipe-tab";
import { SourcesSection } from "@/components/parametres/sources-section";
import { StoresSection } from "@/components/parametres/stores-section";
import { CatalogTab, type CatalogProduct } from "@/components/parametres/catalog-tab";
import { BoutiqueTarifsTab } from "@/components/parametres/boutique-tarifs-tab";
import { SmsTemplatesTab } from "@/components/parametres/sms-templates-tab";
import { EmailTemplatesTab } from "@/components/parametres/email-templates-tab";
import { ArchitectureTab } from "@/components/parametres/architecture-tab";
import type { Supplier } from "@/lib/db/suppliers";
import type { Profile, UserRole } from "@/lib/db/profiles-shared";
import type { SmsTemplate } from "@/lib/db/sms-templates-shared";
import type { EmailTemplate } from "@/lib/db/email-templates-shared";
import type { Poseur, Atelier } from "@/lib/db/equipe";
import type { Source } from "@/lib/db/sources-shared";
import type { Store } from "@/lib/db/stores-shared";
import type { AutomationRule } from "@/lib/db/automation-rules";
import type { EventAlert } from "@/lib/db/event-alerts";

type SectionKey = "parametres" | "donnees" | "configurations" | "tests";
type TabKey =
  // Paramètres
  | "magasins"
  | "equipe"
  | "fournisseurs"
  | "utilisateurs"
  | "roles"
  // Données
  | "catalogue"
  | "boutique-tarifs"
  | "sources"
  | "templates-sms"
  | "templates-email"
  // Configurations
  | "integrations"
  | "architecture"
  // Tests
  | "envoi-test"
  | "test-parcours";

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
  sources: Source[];
  stores: Store[];
  catalogProducts: CatalogProduct[];
  catalogTotal: number;
  catalogCategories: string[];
  automationRules: AutomationRule[];
  eventAlerts: EventAlert[];
};

const SECTIONS: {
  key: SectionKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: "violet" | "blue" | "amber" | "pink";
}[] = [
  {
    key: "parametres",
    label: "Paramètres",
    description: "Organisation : magasins, équipe, fournisseurs, utilisateurs et rôles.",
    icon: SettingsIcon,
    tone: "violet",
  },
  {
    key: "donnees",
    label: "Données",
    description: "Catalogue produits, sources de leads, templates SMS et emails.",
    icon: Database,
    tone: "blue",
  },
  {
    key: "configurations",
    label: "Configurations",
    description: "Intégrations (Stripe, Brevo, Pennylane) et architecture des automatisations.",
    icon: Workflow,
    tone: "amber",
  },
  {
    key: "tests",
    label: "Tests",
    description: "Envoi de SMS/email de test et parcours bout-en-bout (QA).",
    icon: FlaskConical,
    tone: "pink",
  },
];

export default function ParametresClient({
  suppliers,
  profiles,
  smsTemplates,
  emailTemplates,
  roleCounts,
  envFlags,
  poseurs,
  ateliers,
  sources,
  stores,
  catalogProducts,
  catalogTotal,
  catalogCategories,
  automationRules,
  eventAlerts,
}: Props) {
  const [section, setSection] = useState<SectionKey>("parametres");
  const [tab, setTab] = useState<TabKey>("magasins");

  // Switch section : on (re)choisit le 1er onglet de cette section
  const switchSection = (s: SectionKey) => {
    setSection(s);
    const first: Record<SectionKey, TabKey> = {
      parametres: "magasins",
      donnees: "catalogue",
      configurations: "integrations",
      tests: "envoi-test",
    };
    setTab(first[s]);
  };

  const currentSection = SECTIONS.find((s) => s.key === section)!;

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
            {currentSection.description}
          </p>
        </section>

        {/* Sections principales (4 grosses cartes) */}
        <section className="px-8 pb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {SECTIONS.map((s) => {
              const active = section === s.key;
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  onClick={() => switchSection(s.key)}
                  className={
                    "text-left p-4 rounded-xl border transition-all " +
                    (active
                      ? "bg-ink text-white border-ink shadow-md"
                      : "bg-white border-line hover:border-line-strong text-ink")
                  }
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span
                      className={
                        "h-8 w-8 rounded-md inline-flex items-center justify-center " +
                        (active
                          ? "bg-white/15 text-white"
                          : s.tone === "violet"
                            ? "bg-violet-soft text-violet-strong"
                            : s.tone === "blue"
                              ? "bg-blue-soft text-blue"
                              : s.tone === "amber"
                                ? "bg-amber-soft text-amber"
                                : "bg-pink-soft text-pink")
                      }
                    >
                      <Icon className="h-4 w-4" strokeWidth={2.4} />
                    </span>
                    <p className="text-[14px] font-semibold leading-tight">
                      {s.label}
                    </p>
                  </div>
                  <p
                    className={
                      "text-[11.5px] leading-snug " +
                      (active ? "text-white/80" : "text-muted")
                    }
                  >
                    {s.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Sous-onglets contextuels */}
        <section className="px-8 pb-6">
          <nav className="flex items-center gap-1 border-b border-line flex-wrap">
            {section === "parametres" && (
              <>
                <TabBtn
                  active={tab === "magasins"}
                  onClick={() => setTab("magasins")}
                  icon={Building2}
                  label="Magasins"
                  count={stores.length}
                />
                <TabBtn
                  active={tab === "equipe"}
                  onClick={() => setTab("equipe")}
                  icon={Hammer}
                  label="Équipe"
                  count={poseurs.length + ateliers.length}
                />
                <TabBtn
                  active={tab === "fournisseurs"}
                  onClick={() => setTab("fournisseurs")}
                  icon={Truck}
                  label="Fournisseurs"
                  count={suppliers.length}
                />
                <TabBtn
                  active={tab === "utilisateurs"}
                  onClick={() => setTab("utilisateurs")}
                  icon={Users}
                  label="Utilisateurs"
                  count={profiles.length}
                />
                <TabBtn
                  active={tab === "roles"}
                  onClick={() => setTab("roles")}
                  icon={Shield}
                  label="Rôles & accès"
                  count={Object.values(roleCounts).reduce((a, b) => a + b, 0)}
                />
              </>
            )}
            {section === "donnees" && (
              <>
                <TabBtn
                  active={tab === "catalogue"}
                  onClick={() => setTab("catalogue")}
                  icon={Database}
                  label="Catalogue produits"
                  count={catalogTotal}
                />
                <TabBtn
                  active={tab === "boutique-tarifs"}
                  onClick={() => setTab("boutique-tarifs")}
                  icon={Sparkles}
                  label="Boutique tarifs"
                  count={51}
                />
                <TabBtn
                  active={tab === "sources"}
                  onClick={() => setTab("sources")}
                  icon={Inbox}
                  label="Sources de leads"
                  count={sources.length}
                />
                <TabBtn
                  active={tab === "templates-sms"}
                  onClick={() => setTab("templates-sms")}
                  icon={MessageSquare}
                  label="Templates SMS"
                  count={smsTemplates.length}
                />
                <TabBtn
                  active={tab === "templates-email"}
                  onClick={() => setTab("templates-email")}
                  icon={Mail}
                  label="Templates email"
                  count={emailTemplates.length}
                />
              </>
            )}
            {section === "configurations" && (
              <>
                <TabBtn
                  active={tab === "integrations"}
                  onClick={() => setTab("integrations")}
                  icon={Plug}
                  label="Intégrations"
                  count={
                    Number(envFlags.stripe) +
                    Number(envFlags.brevoEmail) +
                    Number(envFlags.brevoSms) +
                    Number(envFlags.pennylane)
                  }
                />
                <TabBtn
                  active={tab === "architecture"}
                  onClick={() => setTab("architecture")}
                  icon={Activity}
                  label="Architecture des communications"
                  count={automationRules.length}
                />
              </>
            )}
            {section === "tests" && (
              <>
                <TabBtn
                  active={tab === "envoi-test"}
                  onClick={() => setTab("envoi-test")}
                  icon={Send}
                  label="Envoi de SMS/email"
                  count={smsTemplates.length + emailTemplates.length}
                />
                <TabBtn
                  active={tab === "test-parcours"}
                  onClick={() => setTab("test-parcours")}
                  icon={FlaskConical}
                  label="Parcours bout-en-bout"
                  count={0}
                />
              </>
            )}
          </nav>
        </section>

        <section className="px-8 pb-10">
          {/* Paramètres */}
          {tab === "magasins" && <StoresSection initialStores={stores} />}
          {tab === "equipe" && (
            <EquipeTab initialPoseurs={poseurs} initialAteliers={ateliers} />
          )}
          {tab === "fournisseurs" && <SuppliersTab suppliers={suppliers} />}
          {tab === "utilisateurs" && <UsersTab profiles={profiles} />}
          {tab === "roles" && <RolesTab counts={roleCounts} />}

          {/* Données */}
          {tab === "catalogue" && (
            <CatalogTab
              initialProducts={catalogProducts}
              initialTotal={catalogTotal}
              initialCategories={catalogCategories}
            />
          )}
          {tab === "boutique-tarifs" && <BoutiqueTarifsTab />}
          {tab === "sources" && <SourcesSection initialSources={sources} />}
          {tab === "templates-sms" && (
            <SmsTemplatesTab
              templates={smsTemplates}
              brevoConfigured={envFlags.brevoSms}
            />
          )}
          {tab === "templates-email" && (
            <EmailTemplatesTab
              templates={emailTemplates}
              brevoConfigured={envFlags.brevoEmail}
            />
          )}

          {/* Configurations */}
          {tab === "integrations" && <IntegrationsTab envFlags={envFlags} />}
          {tab === "architecture" && (
            <ArchitectureTab
              rules={automationRules}
              smsTemplates={smsTemplates}
              emailTemplates={emailTemplates}
              alerts={eventAlerts}
            />
          )}

          {/* Tests */}
          {tab === "envoi-test" && (
            <TestTab
              smsTemplates={smsTemplates}
              emailTemplates={emailTemplates}
              brevoConfigured={envFlags.brevoSms}
            />
          )}
          {tab === "test-parcours" && (
            <TestParcoursLink />
          )}
        </section>
      </div>
    </>
  );
}

function TestParcoursLink() {
  return (
    <div className="bg-white border border-line rounded-2xl p-8 max-w-2xl">
      <p className="eyebrow mb-2">QA · Simulation</p>
      <h2 className="text-[20px] font-semibold text-ink mb-2">
        Parcours bout-en-bout
      </h2>
      <p className="text-[13px] text-muted leading-relaxed mb-5">
        Simule l'intégralité du cycle de vente — création client, devis, envoi,
        validation, acompte, dossier de confection, réception QR, pose, solde.
        L'outil reste sur sa page dédiée pour ne pas mélanger les contextes.
      </p>
      <a
        href="/test"
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[13px] font-semibold bg-ink text-white hover:bg-ink/90 transition-colors"
      >
        <FlaskConical className="h-3.5 w-3.5" strokeWidth={2.4} />
        Ouvrir le test parcours →
      </a>
    </div>
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
