"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
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
  Plus,
  ScanLine as ScanIcon,
  Sparkles,
  Calendar,
  Clock,
  ArrowRight,
  X,
} from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { ColorChip, ChipTone } from "@/components/ui/status-pill";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import { cn } from "@/lib/utils";
import { searchGlobalAction, type SearchResult } from "@/app/actions/search";

type Item = {
  id: string;
  label: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: ChipTone;
  href?: string;
  shortcut?: string;
  kind: "page" | "command" | "client" | "devis" | "dossier";
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function CommandPalette({ open, onOpenChange }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Recherche serveur debounced sur clients + devis + dossiers
  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchGlobalAction(query);
        setSearchResults(r);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setHighlight(0);
    }
  }, [open]);

  const items: Item[] = useMemo(() => {
    const pages: Item[] = [
      { id: "p-dash", label: "Tableau de bord", icon: LayoutDashboard, tone: "violet", href: "/dashboard", shortcut: "G D", kind: "page" },
      { id: "p-devis", label: "Devis", sub: "Liste & filtres", icon: FileText, tone: "pink", href: "/devis", shortcut: "G V", kind: "page" },
      { id: "p-confections", label: "Suivi de commande", sub: "Kanban dossiers", icon: Scissors, tone: "orange", href: "/confections", shortcut: "G C", kind: "page" },
      { id: "p-commandes", label: "Commandes fournisseurs", icon: PackageSearch, tone: "blue", href: "/commandes", shortcut: "G F", kind: "page" },
      { id: "p-reception", label: "Réception", sub: "Scanner QR", icon: ScanLine, tone: "yellow", href: "/reception", shortcut: "G R", kind: "page" },
      { id: "p-poses", label: "Poses", sub: "Planning", icon: Wrench, tone: "emerald", href: "/poses", shortcut: "G P", kind: "page" },
      { id: "p-agenda", label: "Agenda", sub: "Calendrier mensuel", icon: Calendar, tone: "violet", href: "/agenda", shortcut: "G A", kind: "page" },
      { id: "p-caisse", label: "Caisse", icon: Receipt, tone: "lime", href: "/caisse", kind: "page" },
      { id: "p-collection", label: "Collection Atmosphère", icon: Library, tone: "amber", href: "/collection", kind: "page" },
      { id: "p-clients", label: "Clients", icon: Users, tone: "ink", href: "/clients", kind: "page" },
      { id: "p-params", label: "Paramètres", icon: Settings, tone: "ink", href: "/parametres", kind: "page" },
    ];

    const commands: Item[] = [
      { id: "c-new-devis", label: "Devis rapide", sub: "Lignes manuelles, sans wizard", icon: Plus, tone: "violet", href: "/devis/nouveau", shortcut: "N D", kind: "command" },
      { id: "c-new-boutique", label: "Devis boutique", sub: "Wizard pièces + simulateurs métier", icon: Plus, tone: "pink", href: "/boutique/nouveau", shortcut: "N B", kind: "command" },
      { id: "c-scan", label: "Scanner un colis", sub: "Caméra mobile ou pistolet", icon: ScanIcon, tone: "yellow", href: "/reception", shortcut: "N S", kind: "command" },
      { id: "c-plan-pose", label: "Planifier une pose", icon: Calendar, tone: "emerald", href: "/poses", kind: "command" },
      { id: "c-cloture", label: "Clôture de caisse", icon: Receipt, tone: "lime", href: "/caisse", kind: "command" },
    ];

    return [...commands, ...pages];
  }, []);

  // Mappe les résultats serveur en items
  const dynamicItems: Item[] = useMemo(() => {
    return searchResults.map((r) => {
      if (r.kind === "client") {
        return {
          id: r.id,
          label: r.label,
          sub: r.sub ?? undefined,
          icon: Users,
          tone: "pink" as ChipTone,
          href: r.href,
          kind: "client" as const,
        };
      }
      if (r.kind === "devis") {
        return {
          id: r.id,
          label: r.label,
          sub: r.sub ?? undefined,
          icon: FileText,
          tone: "violet" as ChipTone,
          href: r.href,
          kind: "devis" as const,
        };
      }
      return {
        id: r.id,
        label: r.label,
        sub: r.sub ?? undefined,
        icon: Scissors,
        tone: "orange" as ChipTone,
        href: r.href,
        kind: "dossier" as const,
      };
    });
  }, [searchResults]);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    // Filtre local sur pages/commands + ajoute les résultats serveur
    const localMatch = items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        (i.sub?.toLowerCase().includes(q) ?? false),
    );
    return [...dynamicItems, ...localMatch];
  }, [items, query, dynamicItems]);

  // Group by kind for display
  const groups = useMemo(() => {
    const order = ["client", "devis", "dossier", "command", "page"];
    const labels: Record<string, string> = {
      client: "Clients",
      devis: "Devis",
      dossier: "Dossiers de confection",
      command: "Actions rapides",
      page: "Navigation",
    };
    return order
      .map((kind) => ({
        kind,
        label: labels[kind],
        items: filtered.filter((i) => i.kind === kind),
      }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  // Flat list for keyboard nav
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  const handleSelect = (item: Item) => {
    if (item.href) {
      router.push(item.href);
      onOpenChange(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, flatItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = flatItems[highlight];
        if (item) handleSelect(item);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flatItems, highlight]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4"
      role="dialog"
      aria-modal
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-[2px] animate-fade-up"
        style={{ animationDuration: "0.2s" }}
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <div className="relative w-full max-w-[640px] bg-white rounded-2xl shadow-[0_24px_60px_-12px_rgba(15,23,42,0.25)] border border-line overflow-hidden animate-fade-up">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-line">
          <Search className="h-4 w-4 text-muted-2 shrink-0" strokeWidth={2.2} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher devis, client, dossier, action…"
            className="flex-1 bg-transparent text-[14.5px] text-ink placeholder:text-muted-2 focus:outline-none"
          />
          <Kbd>esc</Kbd>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto py-2">
          {groups.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-[13px] text-muted">Aucun résultat pour "{query}"</p>
              <p className="text-[11.5px] text-muted-2 mt-1">Essayez "devis", "Larochelle", "scan", "pose"…</p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.kind} className="mb-1">
                <p className="px-4 py-1.5 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">
                  {group.label}
                </p>
                <ul>
                  {group.items.map((item) => {
                    const flatIdx = flatItems.indexOf(item);
                    const active = highlight === flatIdx;
                    const Icon = item.icon;
                    return (
                      <li key={item.id}>
                        <button
                          onMouseEnter={() => setHighlight(flatIdx)}
                          onClick={() => handleSelect(item)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                            active ? "bg-canvas-2" : "hover:bg-canvas-2/50"
                          )}
                        >
                          {item.kind === "client" ? (
                            <LetterAvatar
                              initial={(item.label.split(",")[1]?.trim()[0] ?? item.label[0])}
                              tone={toneFor(item.label)}
                              size="sm"
                            />
                          ) : (
                            <ColorChip tone={item.tone} size="sm">
                              <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
                            </ColorChip>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-ink leading-tight truncate">{item.label}</p>
                            {item.sub && (
                              <p className="text-[11.5px] text-muted truncate mt-0.5">{item.sub}</p>
                            )}
                          </div>
                          {item.shortcut && (
                            <div className="flex items-center gap-1 shrink-0">
                              {item.shortcut.split(" ").map((k, i) => (
                                <Kbd key={i}>{k}</Kbd>
                              ))}
                            </div>
                          )}
                          <ArrowRight
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 transition-opacity",
                              active ? "text-ink-3 opacity-100" : "text-muted-2 opacity-0"
                            )}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="border-t border-line bg-canvas-2/40 px-4 py-2 flex items-center justify-between text-[11px] text-muted">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Kbd>↑</Kbd><Kbd>↓</Kbd>
              <span className="ml-1">naviguer</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>↵</Kbd>
              <span className="ml-1">ouvrir</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>esc</Kbd>
              <span className="ml-1">fermer</span>
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-violet" />
            Atmosphère · ⌘K
          </span>
        </div>
      </div>
    </div>
  );
}
