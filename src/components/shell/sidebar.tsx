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
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ColorChip, ChipTone } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";

type Item = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: ChipTone;
  badge?: string | number;
};

const navMain: Item[] = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, tone: "violet" },
  { label: "Devis", href: "/devis", icon: FileText, tone: "pink", badge: 12 },
  { label: "Confections", href: "/confections", icon: Scissors, tone: "orange", badge: 7 },
  { label: "Commandes fournisseurs", href: "/commandes", icon: PackageSearch, tone: "blue" },
  { label: "Réception", href: "/reception", icon: ScanLine, tone: "yellow" },
  { label: "Poses", href: "/poses", icon: Wrench, tone: "emerald", badge: 3 },
  { label: "Agenda", href: "/agenda", icon: Calendar, tone: "violet" },
];

const navSecondary: Item[] = [
  { label: "Caisse", href: "/caisse", icon: Receipt, tone: "lime" },
  { label: "Collection Atmosphère", href: "/collection", icon: Library, tone: "amber" },
  { label: "Clients", href: "/clients", icon: Users, tone: "ink" },
];

const navAdmin: Item[] = [
  { label: "Paramètres", href: "/parametres", icon: Settings, tone: "ink" },
];

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
          : "text-ink-3 hover:bg-white/60 hover:text-ink border border-transparent"
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
              : "bg-white text-muted border border-line"
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
}: {
  label?: string;
  items: Item[];
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
        <NavLink key={i.href} item={i} />
      ))}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="w-[252px] shrink-0 border-r border-line bg-canvas flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-line">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>

      {/* Workspace */}
      <button className="mx-3 mt-3 group flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 text-left transition-colors hover:border-line-strong border border-line">
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
        <ChevronDown className="h-3.5 w-3.5 text-muted-2 group-hover:text-ink-3 transition-colors" />
      </button>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-3 space-y-1">
        <NavSection items={navMain} />
        <NavSection label="Magasin" items={navSecondary} />
        <NavSection label="Admin" items={navAdmin} />
      </nav>

      {/* User */}
      <div className="border-t border-line p-3">
        <button className="w-full flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-white transition-colors text-left">
          <div className="h-8 w-8 rounded-full bg-pastel-yellow text-pastel-yellow-ink flex items-center justify-center text-[12px] font-semibold">
            CM
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-semibold text-ink truncate leading-tight">
              Camille Morel
            </p>
            <p className="text-[10.5px] text-muted truncate mt-0.5">
              Commercial · Back-office
            </p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-2" />
        </button>
      </div>
    </aside>
  );
}
