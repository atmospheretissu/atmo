"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Scissors,
  PackageSearch,
  ScanLine,
  Wrench,
  Receipt,
  Library,
  Users,
  Settings,
  ChevronDown,
  Calendar,
  ShoppingBag,
  Inbox,
  MessageSquare,
  Zap,
  Rss,
  LogOut,
  Lock,
  FlaskConical,
  AlertTriangle,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { EnvBadge } from "@/components/shell/env-indicator";
import { ImpersonationSwitcher } from "@/components/shell/impersonation-switcher";
import { ColorChip, ChipTone } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";
import { canAccess, ROLE_LABELS } from "@/lib/db/profiles-shared";
import type { UserRole } from "@/lib/db/profiles-shared";
import { WorkspaceSwitcher } from "@/components/shell/workspace-switcher";
import type { Store } from "@/lib/db/stores-shared";

type Item = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: ChipTone;
  badge?: string | number;
};

const navMain: Item[] = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, tone: "violet" },
  { label: "Activité", href: "/feed", icon: Rss, tone: "blue" },
  { label: "Création devis", href: "/boutique", icon: ShoppingBag, tone: "amber" },
  { label: "Devis", href: "/devis", icon: FileText, tone: "pink" },
  { label: "Suivi de commande", href: "/confections", icon: Scissors, tone: "orange" },
  { label: "Commandes fournisseurs", href: "/commandes", icon: PackageSearch, tone: "blue" },
  { label: "Réception", href: "/reception", icon: ScanLine, tone: "yellow" },
  { label: "Poses", href: "/poses", icon: Wrench, tone: "emerald" },
  { label: "Agenda", href: "/agenda", icon: Calendar, tone: "violet" },
];

const navSecondary: Item[] = [
  { label: "Caisse", href: "/caisse", icon: Receipt, tone: "lime" },
  { label: "Collection Atmosphère", href: "/collection", icon: Library, tone: "amber" },
  { label: "Clients", href: "/clients", icon: Users, tone: "ink" },
  { label: "SAV", href: "/sav", icon: AlertTriangle, tone: "pink" },
  { label: "Atmoleads", href: "/leads-lm", icon: Inbox, tone: "orange" },
];

const navAdmin: Item[] = [
  { label: "Paramètres", href: "/parametres", icon: Settings, tone: "ink" },
];

function NavLink({ item, allowed }: { item: Item; allowed: boolean }) {
  const pathname = usePathname();
  const active =
    allowed &&
    (pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(item.href)));
  const Icon = item.icon;

  // Pas d'accès : item grisé, non cliquable, avec icône verrou.
  if (!allowed) {
    return (
      <div
        title="Pas d'accès avec votre rôle"
        className="group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13.5px] text-muted-2 opacity-50 cursor-not-allowed select-none border border-transparent"
      >
        <ColorChip tone={item.tone} size="sm">
          <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
        </ColorChip>
        <span className="flex-1 truncate">{item.label}</span>
        <Lock className="h-3 w-3 text-muted-2 shrink-0" strokeWidth={2.4} />
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13.5px] transition-colors",
        active
          ? "bg-white text-ink font-medium border border-line"
          : "text-ink-3 hover:bg-white/60 hover:text-ink border border-transparent",
      )}
    >
      <ColorChip tone={item.tone} size="sm">
        <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      </ColorChip>
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge !== undefined && (
        <span
          className={cn(
            "shrink-0 rounded-full text-[10.5px] font-semibold px-1.5 py-0.5 leading-none tabular-nums",
            active
              ? "bg-canvas-2 text-ink-2"
              : "bg-white text-muted border border-line",
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function NavSection({
  label,
  items,
  role,
}: {
  label?: string;
  items: Item[];
  role: UserRole | null;
}) {
  return (
    <div className="space-y-0.5">
      {label && (
        <div className="px-2.5 pb-1.5 pt-4">
          <p className="text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">
            {label}
          </p>
        </div>
      )}
      {items.map((i) => (
        <NavLink key={i.href} item={i} allowed={role ? canAccess(role, i.href) : true} />
      ))}
    </div>
  );
}

export function Sidebar({
  role,
  userEmail,
  stores,
  currentStoreId,
  adminActualRole = null,
}: {
  role: UserRole | null;
  userEmail: string | null;
  stores: Store[];
  currentStoreId: string | null;
  adminActualRole?: UserRole | null;
}) {
  const initial = (userEmail ?? "?")[0]?.toUpperCase() ?? "?";
  const roleLabel = role ? ROLE_LABELS[role] : "";

  return (
    <aside className="w-[252px] shrink-0 border-r border-line bg-canvas flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-line">
        <Link href={role ? "/dashboard" : "/"} className="flex items-center gap-2">
          <Logo />
        </Link>
        <EnvBadge />
      </div>

      {/* Workspace — vrai switcher multi-magasin */}
      <WorkspaceSwitcher
        stores={stores}
        currentStoreId={currentStoreId}
        isAdmin={role === "admin"}
      />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-3 space-y-1">
        <NavSection items={navMain} role={role} />
        <NavSection label="Magasin" items={navSecondary} role={role} />
        <NavSection label="Admin" items={navAdmin} role={role} />
      </nav>

      {/* Impersonation switcher — admin réel uniquement */}
      {adminActualRole === "admin" && <ImpersonationSwitcher />}

      {/* User */}
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-lg p-1.5">
          <div className="h-8 w-8 rounded-full bg-pastel-yellow text-pastel-yellow-ink flex items-center justify-center text-[12px] font-semibold">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-semibold text-ink truncate leading-tight">
              {userEmail ?? "—"}
            </p>
            <p className="text-[10.5px] text-muted truncate mt-0.5">
              {roleLabel || "Sans rôle"}
            </p>
          </div>
          <a
            href="/auth/sign-out"
            className="h-7 w-7 rounded-md text-muted-2 hover:text-ink hover:bg-canvas-2 inline-flex items-center justify-center"
            title="Se déconnecter"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={2.2} />
          </a>
        </div>
      </div>
    </aside>
  );
}
