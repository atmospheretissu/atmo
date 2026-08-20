import { CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { PennylaneCard } from "@/components/parametres/pennylane-card";

type IntegrationStatus = "connecte" | "a_configurer" | "manuel" | "a_venir";

type Integration = {
  name: string;
  desc: string;
  status: IntegrationStatus;
  env: string;
  icon: string;
  iconBg: string;
  envVarHint?: string;
  docUrl?: string;
};

const statusLabel: Record<IntegrationStatus, string> = {
  connecte: "Connecté",
  a_configurer: "À configurer",
  manuel: "Manuel",
  a_venir: "Phase 2",
};

const statusTone: Record<IntegrationStatus, "emerald" | "amber" | "blue" | "muted"> = {
  connecte: "emerald",
  a_configurer: "amber",
  manuel: "blue",
  a_venir: "muted",
};

export function IntegrationsTab({
  envFlags,
}: {
  envFlags: {
    stripe: boolean;
    brevoEmail: boolean;
    brevoSms: boolean;
    pennylane: boolean;
  };
}) {
  const integrations: Integration[] = [
    {
      name: "Stripe",
      desc: "Paiements en ligne · acomptes & soldes devis · CB caisse",
      status: envFlags.stripe ? "connecte" : "a_configurer",
      env: envFlags.stripe ? "Production" : "Non configuré",
      icon: "💳",
      iconBg: "from-violet to-pink",
      envVarHint: "STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET",
      docUrl: "https://dashboard.stripe.com/apikeys",
    },
    {
      name: "Brevo · Email transactionnel",
      desc: "Envoi auto des devis PDF, BC fournisseurs, reçus caisse",
      status: envFlags.brevoEmail ? "connecte" : "a_configurer",
      env: envFlags.brevoEmail ? "Production" : "Non configuré",
      icon: "✉️",
      iconBg: "from-blue to-violet",
      envVarHint: "BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME",
      docUrl: "https://app.brevo.com/settings/keys/api",
    },
    {
      name: "Brevo · SMS",
      desc: "Notifications client (devis, acompte, retrait, pose, satisfaction)",
      status: envFlags.brevoSms ? "connecte" : "a_configurer",
      env: envFlags.brevoSms ? "Production" : "Non configuré",
      icon: "📱",
      iconBg: "from-emerald to-blue",
      envVarHint: "BREVO_API_KEY, BREVO_SMS_SENDER",
      docUrl: "https://app.brevo.com/settings/keys/api",
    },
    {
      name: "Pennylane",
      desc: "Facturation électronique + export comptable des clôtures de caisse",
      status: envFlags.pennylane ? "connecte" : "a_configurer",
      env: envFlags.pennylane ? "Production" : "Non configuré",
      icon: "🏛",
      iconBg: "from-yellow to-orange",
      envVarHint: "PENNYLANE_API_KEY",
      docUrl: "https://pennylane.com",
    },
    {
      name: "Leroy Merlin · API leads",
      desc: "Synchronisation des leads de la collection LM",
      status: "a_venir",
      env: "Phase 2 — table leroy_merlin_leads à créer",
      icon: "🟢",
      iconBg: "from-emerald to-amber",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Bloc riche Pennylane (toggles, pull manuel, statut) */}
      <PennylaneCard />

      {/* Liste des autres intégrations en cartes simples */}
      {integrations.map((i) => (
        <Card key={i.name} className="p-4 flex items-start gap-4">
          <div
            className={`h-12 w-12 rounded-xl bg-gradient-to-br ${i.iconBg} inline-flex items-center justify-center text-[22px] shrink-0`}
          >
            {i.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[14px] font-semibold text-ink">{i.name}</p>
              <StatusPill tone={statusTone[i.status]}>{statusLabel[i.status]}</StatusPill>
              <span className="text-[11.5px] text-muted-2">· {i.env}</span>
            </div>
            <p className="text-[12.5px] text-muted mt-1">{i.desc}</p>
            {i.envVarHint && i.status === "a_configurer" && (
              <p className="text-[10.5px] text-muted-2 font-mono mt-1.5">
                Variables Railway requises : {i.envVarHint}
              </p>
            )}
          </div>
          {i.docUrl && (
            <a href={i.docUrl} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-3.5 w-3.5" /> Dashboard
              </Button>
            </a>
          )}
        </Card>
      ))}

      <Card className="p-4 bg-canvas-2/40 border-dashed">
        <div className="flex items-start gap-3">
          <ColorChip tone="emerald" size="sm">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.4} />
          </ColorChip>
          <div className="text-[12.5px] text-ink-2">
            Ajoute les variables d&apos;environnement dans Railway → Settings → Variables, puis redémarre le service. Les intégrations passent automatiquement à <strong>Connecté</strong>.
          </div>
        </div>
      </Card>
    </div>
  );
}
