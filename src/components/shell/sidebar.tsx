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
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ColorChip, ChipTone } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";
import { canAccess, ROLE_LABELS } from "@/lib/db/profiles-shared";
import type { UserRole } from "@/lib/db/profiles-shared";

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
  { label: "Boutique", href: "/boutique", icon: ShoppingBag, tone: "amber" },
  { label: "Devis", href: "/devis", icon: FileText, tone: "pink" },
  { label: "Confections", href: "/confections", icon: Scissors, tone: "orange" },
  { label: "Commandes fournisseurs", href: "/commandes", icon: PackageSearch, tone: "blue" },
  { label: "Réception", href: "/reception", icon: ScanLine, tone: "yellow" },
  { label: "Poses", href: "/poses", icon: Wrench, tone: "emerald" },
  { label: "Agenda", href: "/agenda", icon: Calendar, tone: "violet" },
];

const navSecondary: Item[] = [
  { label: "Caisse", href: "/caisse", icon: Receipt, tone: "lime" },
  { label: "Collection Atmosphère", href: "/collection", icon: Library, tone: "amber" },
  { label: "Clients", href: "/clients", icon: Users, tone: "ink" },
  { label: "Leads Leroy Merlin", href: "/leads-lm", icon: Inbox, tone: "orange" },
];

const navAdmin: Item[] = [
  { label: "Paramètres", href: "/parametres", icon: Settings, tone: "ink" },
  { label: "Templates", href: "/templates", icon: MessageSquare, tone: "violet" },
  { label: "Architecture", href: "/architecture", icon: Zap, tone: "amber" },
];

function filterByRole(items: Item[], role: UserRole | null): Item[] {
  if (!role) return items;
  return items.filter((i) => canAccess(role, i.href));
}

function NavLink({ item }: { item: Item }) {
  const pathname = usePathname();
  const active =
    pathname === item.href ||
    (item.href !== "/" && pathname.startsWith(item.href));
  const Icon = item.icon;
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

function NavSection({ label, items }: { label?: string; items: Item[] }) {
  if (items.length === 0) return null;
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
        <NavLink key={i.href} item={i} />
      ))}
    </div>
  );
}

export function Sidebar({
  role,
  userEmail,
}: {
  role: UserRole | null;
  userEmail: string | null;
}) {
  const main = filterByRole(navMain, role);
  const secondary = filterByRole(navSecondary, role);
  const admin = filterByRole(navAdmin, role);
  const initial = (userEmail ?? "?")[0]?.toUpperCase() ?? "?";
  const roleLabel = role ? ROLE_LABELS[role] : "";

  return (
    <aside className="w-[252px] shrink-0 border-r border-line bg-canvas flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-line">
        <Link href={role ? "/dashboard" : "/"}>
          <Logo />
        </Link>
      </div>

      {/* Workspace */}
      <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 border border-line">
        <div className="h-7 w-7 rounded-md bg-ink text-white flex items-center justify-center text-[11px] font-semibold tracking-wide">
          AT
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold text-ink truncate leading-tight">
            Atmosphère Tissus
          </p>
          <p className="text-[10.5px] text-muted mt-0.5 truncate">
            Magasin Bordeaux · Centre
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-3 space-y-1">
        <NavSection items={main} />
        <NavSection label="Magasin" items={secondary} />
        <NavSection label="Admin" items={admin} />
      </nav>

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
