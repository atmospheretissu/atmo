"use client";

import { useState } from "react";
import {
  Users,
  Shield,
  MessageSquare,
  Plug,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Send,
  MoreHorizontal,
  Settings as SettingsIcon,
  ChevronRight,
  ExternalLink,
  Truck,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import { SuppliersTab } from "@/components/parametres/suppliers-tab";
import type { Supplier } from "@/lib/db/suppliers";

type TabKey = "fournisseurs" | "utilisateurs" | "roles" | "sms" | "integrations";

const users = [
  { name: "Camille Morel", email: "camille.morel@atmospheretissus.fr", role: "Admin · Commercial", lastSeen: "Il y a 2 min", status: "actif" as const },
  { name: "Théo Lambert", email: "theo.lambert@atmospheretissus.fr", role: "Commercial · Back-office", lastSeen: "Il y a 12 min", status: "actif" as const },
  { name: "Brigitte Mercier", email: "brigitte.m@atmospheretissus.fr", role: "Couturière interne", lastSeen: "Il y a 3h", status: "actif" as const },
  { name: "Sandra Leroy", email: "sandra.l@atmospheretissus.fr", role: "Couturière interne", lastSeen: "Hier", status: "actif" as const },
  { name: "Romain Tessier", email: "romain.t@atmospheretissus.fr", role: "Poseur", lastSeen: "Il y a 1h", status: "actif" as const },
  { name: "Karim Hadji", email: "karim.h@atmospheretissus.fr", role: "Poseur", lastSeen: "Il y a 4h", status: "actif" as const },
  { name: "Julie Vidal", email: "julie.vidal@atmospheretissus.fr", role: "Décoratrice", lastSeen: "Il y a 2 jours", status: "actif" as const },
  { name: "Atelier Roux", email: "contact@atelier-roux.fr", role: "Couturière sous-traitante", lastSeen: "Inactif 14j", status: "invitation" as const },
];

const roles = [
  { name: "Administrateur", count: 1, color: "ink", permissions: ["Accès complet", "Paramétrage", "Utilisateurs", "Rapports", "Clôtures de caisse"] },
  { name: "Commercial · Back-office", count: 2, color: "violet", permissions: ["Simulateur", "Devis", "Fiches clients", "Suivi commandes", "Tableau de bord"] },
  { name: "Resp. confection", count: 1, color: "orange", permissions: ["Suivi confections", "Assignation couturières", "Réception colis", "Bons de travail"] },
  { name: "Couturière", count: 2, color: "pink", permissions: ["Ses bons de travail", "Mise à jour statut confection"] },
  { name: "Poseur", count: 2, color: "emerald", permissions: ["Interventions à planifier", "Contact client", "Confirmation pose"] },
  { name: "Décoratrice", count: 1, color: "blue", permissions: ["Ses rendez-vous", "Fiches clients", "Historique"] },
];

const smsTemplates = [
  {
    key: "devis_envoye",
    label: "Devis envoyé",
    body: "Bonjour {{prenom}}, votre devis Atmosphère Tissus est disponible : {{lien_pdf}}. À très vite !",
    active: true,
    trigger: "Email · à l'envoi du devis",
  },
  {
    key: "devis_valide",
    label: "Devis validé · confirmation",
    body: "Merci {{prenom}} ! Votre commande est confirmée. Acompte reçu : {{acompte}} €. La production commence.",
    active: true,
    trigger: "À l'encaissement de l'acompte",
  },
  {
    key: "article_pret",
    label: "Article prêt au retrait",
    body: "{{prenom}}, votre commande {{produit}} est prête à être retirée en magasin (lun-sam, 9h-19h).",
    active: true,
    trigger: "Au scan QR du dernier élément (retrait)",
  },
  {
    key: "tous_recus",
    label: "Tous les éléments reçus → pose planifiable",
    body: "Bonne nouvelle {{prenom}} ! Tous les éléments de votre dossier sont reçus. Nous vous contactons pour la pose.",
    active: true,
    trigger: "Quand X/N éléments reçus = 100%",
  },
  {
    key: "pose_planifiee",
    label: "Pose planifiée (rappel J-1)",
    body: "{{prenom}}, rappel : pose prévue {{date}} à {{heure}} avec {{poseur}}. À demain !",
    active: true,
    trigger: "J-1 à 10h",
  },
  {
    key: "pose_effectuee",
    label: "Pose effectuée · satisfaction",
    body: "{{prenom}}, votre pose est terminée. Merci de votre confiance. Donnez-nous votre avis : {{lien_avis}}",
    active: true,
    trigger: "Au marquage 'pose effectuée'",
  },
];

const integrations = [
  { name: "Stripe", desc: "Paiements en ligne · acomptes & soldes", status: "connecte", env: "Production", icon: "💳", iconBg: "from-violet to-pink" },
  { name: "Brevo (SMS)", desc: "SMS automatiques · expéditeur ATMOSPHERE", status: "connecte", env: "Production", icon: "📱", iconBg: "from-blue to-emerald" },
  { name: "Pennylane", desc: "Facturation électronique + comptabilité", status: "connecte", env: "Production", icon: "🏛", iconBg: "from-yellow to-orange" },
  { name: "Casamance · portail pro", desc: "Commandes B2B & disponibilité tissus", status: "manuel", env: "Portail externe", icon: "🧵", iconBg: "from-pink to-violet" },
  { name: "Casal · portail pro", desc: "Commandes éditeur tissu", status: "manuel", env: "Portail externe", icon: "🧶", iconBg: "from-orange to-pink" },
  { name: "Linder · portail pro", desc: "Commandes éditeur tissu", status: "manuel", env: "Portail externe", icon: "🪡", iconBg: "from-emerald to-blue" },
  { name: "E-commerce Shopify", desc: "Synchro commandes en ligne", status: "a_venir", env: "Phase 2", icon: "🛒", iconBg: "from-amber to-orange" },
];

export default function ParametresClient({ suppliers }: { suppliers: Supplier[] }) {
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
            Équipe, rôles, modèles SMS, intégrations Stripe / Brevo / Pennylane et portails fournisseurs.
          </p>
        </section>

        {/* Tabs */}
        <section className="px-8 pb-6">
          <nav className="flex items-center gap-1 border-b border-line">
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
              count={users.length}
            />
            <TabBtn
              active={tab === "roles"}
              onClick={() => setTab("roles")}
              icon={Shield}
              label="Rôles & accès"
              count={roles.length}
            />
            <TabBtn
              active={tab === "sms"}
              onClick={() => setTab("sms")}
              icon={MessageSquare}
              label="Templates SMS"
              count={smsTemplates.length}
            />
            <TabBtn
              active={tab === "integrations"}
              onClick={() => setTab("integrations")}
              icon={Plug}
              label="Intégrations"
              count={integrations.length}
            />
          </nav>
        </section>

        <section className="px-8 pb-10">
          {tab === "fournisseurs" && <SuppliersTab suppliers={suppliers} />}
          {tab === "utilisateurs" && <UsersTab />}
          {tab === "roles" && <RolesTab />}
          {tab === "sms" && <SmsTab />}
          {tab === "integrations" && <IntegrationsTab />}
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

function UsersTab() {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
        <div>
          <p className="eyebrow mb-1">Équipe</p>
          <h3 className="text-[15px] font-semibold text-ink">{users.length} utilisateurs</h3>
        </div>
        <Button variant="primary" size="sm">
          <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Inviter un utilisateur
        </Button>
      </div>
      <div className="divide-y divide-line">
        {users.map((u) => (
          <div key={u.email} className="px-5 py-3.5 flex items-center gap-3 hover:bg-canvas-2/30 transition-colors group">
            <LetterAvatar initial={u.name[0]} tone={toneFor(u.name)} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold text-ink leading-tight truncate">
                {u.name}
              </p>
              <p className="text-[11.5px] text-muted truncate mt-0.5">{u.email}</p>
            </div>
            <div className="hidden md:block w-56">
              <p className="text-[12.5px] text-ink-2">{u.role}</p>
            </div>
            <div className="hidden md:block w-28 text-right">
              <p className="text-[11.5px] text-muted-2">{u.lastSeen}</p>
            </div>
            <StatusPill tone={u.status === "actif" ? "emerald" : "amber"} dot={false}>
              {u.status === "actif" ? "Actif" : "Invitation envoyée"}
            </StatusPill>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-2 hover:text-ink h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-canvas-2">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RolesTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {roles.map((r) => (
        <Card key={r.name} className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className={`h-2 w-6 rounded-full bg-${r.color}`} />
              <div>
                <p className="text-[14px] font-semibold text-ink">{r.name}</p>
                <p className="text-[11.5px] text-muted">
                  <span className="tabular-nums">{r.count}</span> utilisateur{r.count > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button className="text-[11.5px] text-muted hover:text-ink inline-flex items-center gap-1">
              <Edit3 className="h-3 w-3" /> Éditer
            </button>
          </div>
          <ul className="space-y-1.5">
            {r.permissions.map((p) => (
              <li key={p} className="flex items-start gap-1.5 text-[12px] text-ink-2">
                <CheckCircle2 className="h-3 w-3 text-emerald mt-0.5 shrink-0" strokeWidth={2.4} />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function SmsTab() {
  return (
    <div className="space-y-4">
      <Card className="p-4 bg-amber-soft border-amber/20 flex items-start gap-3">
        <ColorChip tone="amber" size="sm">
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.4} />
        </ColorChip>
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-ink leading-tight">
            6 modèles actifs · expéditeur "ATMOSPHERE"
          </p>
          <p className="text-[11.5px] text-muted mt-0.5">
            Variables : <span className="font-mono">{`{{prenom}}`}</span>, <span className="font-mono">{`{{produit}}`}</span>, <span className="font-mono">{`{{date}}`}</span>, <span className="font-mono">{`{{heure}}`}</span>, <span className="font-mono">{`{{poseur}}`}</span>, <span className="font-mono">{`{{acompte}}`}</span>, <span className="font-mono">{`{{lien_pdf}}`}</span>, <span className="font-mono">{`{{lien_avis}}`}</span>.
          </p>
        </div>
        <button className="text-[12px] text-violet hover:underline font-medium inline-flex items-center gap-1 shrink-0">
          Doc Brevo <ExternalLink className="h-3 w-3" />
        </button>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {smsTemplates.map((t) => (
          <Card key={t.key} className="p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-[13.5px] font-semibold text-ink leading-tight">{t.label}</p>
                <p className="text-[11px] text-muted mt-0.5 inline-flex items-center gap-1">
                  <Send className="h-3 w-3" /> {t.trigger}
                </p>
              </div>
              <Toggle active={t.active} />
            </div>
            <div className="mt-3 p-3 rounded-lg bg-canvas-2/40 border border-line text-[12px] text-ink-2 leading-relaxed font-mono">
              {t.body}
            </div>
            <div className="flex items-center justify-end gap-1 mt-3">
              <button className="text-[11.5px] text-muted hover:text-ink inline-flex items-center gap-1">
                <Edit3 className="h-3 w-3" /> Modifier
              </button>
              <span className="text-muted-2 mx-1">·</span>
              <button className="text-[11.5px] text-muted hover:text-ink inline-flex items-center gap-1">
                Test envoi
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function IntegrationsTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MiniIntegStat tone="emerald" value="3" label="Connectées" sub="API actives" />
        <MiniIntegStat tone="amber" value="3" label="Manuelles" sub="portails externes" />
        <MiniIntegStat tone="blue" value="1" label="À venir" sub="phase 2" />
      </div>

      <Card className="overflow-hidden">
        <div className="divide-y divide-line">
          {integrations.map((i) => (
            <div key={i.name} className="px-5 py-4 flex items-center gap-3 hover:bg-canvas-2/30 transition-colors">
              <div
                className={`h-12 w-12 rounded-xl bg-gradient-to-br ${i.iconBg} text-white inline-flex items-center justify-center text-[24px] shrink-0`}
              >
                {i.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[14px] font-semibold text-ink">{i.name}</p>
                  <span className="text-[10.5px] font-mono text-muted-2 px-1.5 py-0.5 rounded bg-canvas-2">
                    {i.env}
                  </span>
                </div>
                <p className="text-[12px] text-muted">{i.desc}</p>
              </div>
              <StatusPill
                tone={i.status === "connecte" ? "emerald" : i.status === "manuel" ? "amber" : "blue"}
              >
                {i.status === "connecte" ? "Connecté" : i.status === "manuel" ? "Manuel" : "Phase 2"}
              </StatusPill>
              <Button variant="secondary" size="sm">
                <SettingsIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
                Configurer
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Toggle({ active }: { active: boolean }) {
  return (
    <button
      className={
        "relative h-5 w-9 rounded-full transition-colors " +
        (active ? "bg-emerald" : "bg-line-strong")
      }
      aria-pressed={active}
    >
      <span
        className={
          "absolute top-0.5 h-4 w-4 bg-white rounded-full transition-all shadow-sm " +
          (active ? "left-[18px]" : "left-0.5")
        }
      />
    </button>
  );
}

function MiniIntegStat({
  tone,
  value,
  label,
  sub,
}: {
  tone: "emerald" | "amber" | "blue";
  value: string;
  label: string;
  sub: string;
}) {
  return (
    <Card className="p-4 flex items-start gap-3">
      <ColorChip tone={tone} size="md">
        <CheckCircle2 className="h-4 w-4" strokeWidth={2.2} />
      </ColorChip>
      <div className="flex-1 min-w-0">
        <p className="text-[11.5px] text-muted-2 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-[22px] font-semibold text-ink leading-tight tabular-nums mt-0.5">{value}</p>
        <p className="text-[11px] text-muted mt-0.5">{sub}</p>
      </div>
    </Card>
  );
}
