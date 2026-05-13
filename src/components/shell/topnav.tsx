"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Search,
  Settings,
  HelpCircle,
  Menu,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { LetterAvatar } from "@/components/ui/letter-avatar";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Tableau", href: "/dashboard" },
  { label: "Devis", href: "/devis" },
  { label: "Confections", href: "/confections" },
  { label: "Commandes", href: "/commandes" },
  { label: "Réception", href: "/reception" },
  { label: "Poses", href: "/poses" },
  { label: "Caisse", href: "/caisse" },
  { label: "Collection", href: "/collection" },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <header className="h-14 px-5 flex items-center gap-4 border-b border-line bg-white sticky top-0 z-30">
      {/* Brand */}
      <Link href="/dashboard" className="shrink-0">
        <Logo />
      </Link>

      <div className="h-5 w-px bg-line mx-1" />

      {/* Tabs */}
      <nav className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "relative h-9 px-3 inline-flex items-center text-[13.5px] font-medium rounded-lg transition-colors whitespace-nowrap",
                active
                  ? "text-ink bg-canvas-2"
                  : "text-muted hover:text-ink hover:bg-canvas-2/60"
              )}
            >
              {t.label}
            </Link>
          );
        })}
        <button
          className="h-9 w-9 inline-flex items-center justify-center text-muted hover:text-ink hover:bg-canvas-2 rounded-lg ml-1"
          aria-label="Plus"
        >
          <Menu className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </nav>

      {/* Right */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          aria-label="Aide"
          className="h-9 w-9 rounded-lg hover:bg-canvas-2 inline-flex items-center justify-center text-muted hover:text-ink transition-colors"
        >
          <HelpCircle className="h-4 w-4" strokeWidth={2.2} />
        </button>
        <button
          aria-label="Recherche"
          className="h-9 w-9 rounded-lg hover:bg-canvas-2 inline-flex items-center justify-center text-muted hover:text-ink transition-colors"
        >
          <Search className="h-4 w-4" strokeWidth={2.2} />
        </button>
        <button
          aria-label="Notifications"
          className="relative h-9 w-9 rounded-lg hover:bg-canvas-2 inline-flex items-center justify-center text-muted hover:text-ink transition-colors"
        >
          <Bell className="h-4 w-4" strokeWidth={2.2} />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-orange ring-2 ring-white" />
        </button>
        <button
          aria-label="Paramètres"
          className="h-9 w-9 rounded-lg hover:bg-canvas-2 inline-flex items-center justify-center text-muted hover:text-ink transition-colors"
        >
          <Settings className="h-4 w-4" strokeWidth={2.2} />
        </button>
        <span className="h-5 w-px bg-line mx-1" />
        <button className="h-9 w-9 inline-flex items-center justify-center rounded-full" aria-label="Mon profil">
          <LetterAvatar initial="C" tone="yellow" size="md" />
        </button>
      </div>
    </header>
  );
}
