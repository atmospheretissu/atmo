"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
  AlertTriangle,
  TimerReset,
  Truck,
  CheckCircle2,
  Scissors,
  ScanLine,
  Receipt,
  Settings,
  Filter,
  Sparkles,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorChip } from "@/components/ui/status-pill";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  kind: "alert_danger" | "alert_warning" | "info" | "success" | "scan" | "sms";
  title: string;
  body: string;
  meta: string;
  href?: string;
  at: string; // display time
  read: boolean;
  group: "today" | "yesterday" | "earlier";
  actor?: string;
};

const notifs: Notif[] = [
  {
    id: "n1",
    kind: "alert_danger",
    title: "Pose bloquée · solde impayé",
    body: "DOS-2026-0140 — Tous éléments reçus, 2 952 € de solde restant.",
    meta: "DOS-2026-0140",
    href: "/confections/d3",
    at: "Il y a 12 min",
    read: false,
    group: "today",
  },
  {
    id: "n2",
    kind: "scan",
    title: "Casamance Saumon — 12m reçu",
    body: "QR-A1 scanné par Camille · dossier Larochelle complet à 5/5.",
    meta: "QR-A1 · DOS-2026-0142",
    href: "/confections/d1",
    at: "Il y a 35 min",
    read: false,
    group: "today",
    actor: "C",
  },
  {
    id: "n3",
    kind: "sms",
    title: "SMS envoyé · Mme Audebert",
    body: "Rappel pose J-1 envoyé via Brevo (ATMOSPHERE).",
    meta: "Mar. 14 mai · 09:30",
    href: "/poses/po1",
    at: "Il y a 1h",
    read: false,
    group: "today",
  },
  {
    id: "n4",
    kind: "alert_warning",
    title: "Acompte en attente · 8 jours",
    body: "DEV-2026-0137 — Mme Audebert. Relance automatique J+2.",
    meta: "DEV-2026-0137",
    href: "/devis/6",
    at: "Il y a 3h",
    read: true,
    group: "today",
  },
  {
    id: "n5",
    kind: "info",
    title: "Franco Casamance non atteint",
    body: "Commande 312 € · franco 500 €. 2 dossiers peuvent être regroupés.",
    meta: "BC-2026-0093",
    href: "/commandes/bc5",
    at: "Aujourd'hui · 09:42",
    read: true,
    group: "today",
  },
  {
    id: "n6",
    kind: "success",
    title: "Acompte Stripe encaissé · 1 707 €",
    body: "Mme Larochelle a réglé l'acompte. Production déclenchée.",
    meta: "DEV-2026-0142 · Stripe ****4242",
    href: "/devis/1",
    at: "Hier · 16:12",
    read: true,
    group: "yesterday",
  },
  {
    id: "n7",
    kind: "scan",
    title: "Linder Velours Mohair reçu",
    body: "QR-B1 scanné par Théo · dossier Audebert prêt pour pose.",
    meta: "QR-B1 · DOS-2026-0137",
    href: "/confections/d2",
    at: "Hier · 11:30",
    read: true,
    group: "yesterday",
    actor: "T",
  },
  {
    id: "n8",
    kind: "alert_warning",
    title: "Rail DS en retard · 6 jours",
    body: "DOS-2026-0142 — Larochelle. Tout sauf le rail est reçu.",
    meta: "BC-2026-0090",
    href: "/commandes/bc2",
    at: "Il y a 6 jours",
    read: true,
    group: "earlier",
  },
];

const kindMeta: Record<
  Notif["kind"],
  { tone: "pink" | "amber" | "blue" | "emerald" | "yellow" | "violet"; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }
> = {
  alert_danger: { tone: "pink", icon: AlertTriangle },
  alert_warning: { tone: "amber", icon: TimerReset },
  info: { tone: "blue", icon: Truck },
  success: { tone: "emerald", icon: CheckCircle2 },
  scan: { tone: "yellow", icon: ScanLine },
  sms: { tone: "violet", icon: Mail },
};

const groupLabels: Record<Notif["group"], string> = {
  today: "Aujourd'hui",
  yesterday: "Hier",
  earlier: "Plus tôt",
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function NotificationsDrawer({ open, onOpenChange }: Props) {
  const [filter, setFilter] = useState<"all" | "unread" | "alerts">("all");
  const [readState, setReadState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(notifs.map((n) => [n.id, n.read]))
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const visible = notifs.filter((n) => {
    const read = readState[n.id];
    if (filter === "unread") return !read;
    if (filter === "alerts") return n.kind === "alert_danger" || n.kind === "alert_warning";
    return true;
  });

  const unreadCount = Object.values(readState).filter((r) => !r).length;

  const groups: Notif["group"][] = ["today", "yesterday", "earlier"];

  const markAllRead = () => {
    setReadState(Object.fromEntries(notifs.map((n) => [n.id, true])));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-ink/15 backdrop-blur-[2px] transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <aside
        className={cn(
          "fixed right-0 top-0 h-screen z-50 w-full max-w-[420px] bg-white border-l border-line shadow-[-12px_0_40px_-12px_rgba(15,23,42,0.15)] transition-transform duration-200 flex flex-col",
          open ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="h-14 px-5 flex items-center justify-between border-b border-line shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-ink tracking-tight">Notifications</h2>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-pink text-white text-[11px] font-semibold tabular-nums">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-canvas-2 transition-colors"
              aria-label="Paramètres"
            >
              <Settings className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-canvas-2 transition-colors"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 flex items-center justify-between gap-2 border-b border-line shrink-0">
          <nav className="flex items-center gap-1.5">
            {(
              [
                { k: "all", l: "Tout" },
                { k: "unread", l: `Non lus${unreadCount > 0 ? ` · ${unreadCount}` : ""}` },
                { k: "alerts", l: "Alertes" },
              ] as const
            ).map((f) => (
              <button
                key={f.k}
                onClick={() => setFilter(f.k)}
                className={cn(
                  "h-7 px-2.5 rounded-full text-[12px] font-medium transition-all",
                  filter === f.k
                    ? "bg-ink text-white"
                    : "bg-canvas-2 text-muted hover:text-ink"
                )}
              >
                {f.l}
              </button>
            ))}
          </nav>
          <button
            onClick={markAllRead}
            className="text-[11.5px] text-muted hover:text-ink font-medium transition-colors"
            disabled={unreadCount === 0}
          >
            Tout marquer comme lu
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald mx-auto mb-2" strokeWidth={1.8} />
              <p className="text-[13.5px] font-medium text-ink">Rien à signaler</p>
              <p className="text-[11.5px] text-muted-2 mt-1">Aucune notification pour ce filtre.</p>
            </div>
          ) : (
            groups.map((g) => {
              const items = visible.filter((n) => n.group === g);
              if (items.length === 0) return null;
              return (
                <div key={g} className="border-b border-line last:border-0">
                  <p className="px-5 py-2.5 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 bg-canvas-2/30">
                    {groupLabels[g]}
                  </p>
                  <ul>
                    {items.map((n) => {
                      const meta = kindMeta[n.kind];
                      const Icon = meta.icon;
                      const read = readState[n.id];
                      const content = (
                        <div
                          className={cn(
                            "px-5 py-3.5 flex items-start gap-3 transition-colors relative",
                            read ? "" : "bg-violet-soft/30",
                            "hover:bg-canvas-2/50"
                          )}
                        >
                          {!read && (
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-pink animate-pulse-soft" />
                          )}
                          <ColorChip tone={meta.tone} size="md">
                            <Icon className="h-4 w-4" strokeWidth={2.2} />
                          </ColorChip>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[13px] font-semibold text-ink leading-tight">{n.title}</p>
                              {n.actor && (
                                <LetterAvatar initial={n.actor} tone={toneFor(n.actor)} size="xs" className="shrink-0" />
                              )}
                            </div>
                            <p className="text-[12px] text-muted mt-1 leading-snug">{n.body}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="font-mono text-[10.5px] text-muted-2">{n.meta}</span>
                              <span className="text-muted-2">·</span>
                              <span className="text-[10.5px] text-muted-2">{n.at}</span>
                            </div>
                          </div>
                        </div>
                      );
                      return (
                        <li key={n.id}>
                          {n.href ? (
                            <Link
                              href={n.href}
                              onClick={() => {
                                setReadState({ ...readState, [n.id]: true });
                                onOpenChange(false);
                              }}
                              className="block"
                            >
                              {content}
                            </Link>
                          ) : (
                            content
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-line bg-canvas-2/30 shrink-0 flex items-center justify-between text-[11.5px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-violet" />
            Mises à jour temps réel · Brevo + interne
          </span>
          <Link href="/parametres" className="text-violet hover:underline font-medium">
            Préférences
          </Link>
        </div>
      </aside>
    </>
  );
}
