"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Loader2,
  User as UserIcon,
  AlertTriangle,
  Calendar,
  FileText,
  Scissors,
  ChevronDown,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { ColorChip, StatusPill } from "@/components/ui/status-pill";
import {
  KANBAN_ORDER,
  SAV_PRIORITY_LABELS,
  SAV_STATUS_LABELS,
  SAV_STATUS_TONES,
  type SavStatus,
  type SavTicketWithRefs,
} from "@/lib/db/sav-shared";
import {
  updateSavStatusAction,
  assignSavTicketAction,
} from "@/app/(platform)/sav/actions";

type TeamMember = { id: string; label: string };

export function SavKanbanClient({
  initialTickets,
  team,
}: {
  initialTickets: SavTicketWithRefs[];
  team: TeamMember[];
}) {
  const [tickets, setTickets] = useState(initialTickets);
  const [pending, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);

  const byStatus = (status: SavStatus) =>
    tickets.filter((t) => t.status === status);

  const moveTicket = (id: string, to: SavStatus) => {
    const prev = tickets.find((t) => t.id === id);
    if (!prev || prev.status === to) return;
    // Optimiste
    setTickets((all) =>
      all.map((t) => (t.id === id ? { ...t, status: to } : t)),
    );
    startTransition(async () => {
      const r = await updateSavStatusAction(id, to);
      if (!r.ok) {
        // rollback
        setTickets((all) =>
          all.map((t) => (t.id === id ? { ...t, status: prev.status } : t)),
        );
        alert(r.message);
      }
    });
  };

  const assign = (id: string, assignedTo: string | null) => {
    setTickets((all) =>
      all.map((t) =>
        t.id === id
          ? {
              ...t,
              assigned_to: assignedTo,
              assigned_name:
                assignedTo === null
                  ? null
                  : team.find((m) => m.id === assignedTo)?.label ?? null,
            }
          : t,
      ),
    );
    startTransition(async () => {
      await assignSavTicketAction(id, assignedTo);
    });
  };

  if (tickets.length === 0) {
    return (
      <Card className="py-16 px-6 text-center">
        <div className="h-14 w-14 mx-auto rounded-2xl bg-amber-soft text-amber inline-flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6" strokeWidth={2} />
        </div>
        <h2 className="text-[18px] font-semibold text-ink mb-1">
          Aucun ticket SAV
        </h2>
        <p className="text-[13.5px] text-muted max-w-md mx-auto leading-relaxed">
          Ouvre un ticket depuis une fiche client, devis ou dossier quand un
          problème post-livraison est signalé.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {KANBAN_ORDER.map((status) => {
        const items = byStatus(status);
        const tone = SAV_STATUS_TONES[status];
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={() => {
              if (dragId) {
                moveTicket(dragId, status);
                setDragId(null);
              }
            }}
            className="bg-canvas-2/40 rounded-2xl border border-line min-h-[400px]"
          >
            <div className="px-4 py-3 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusPill
                  tone={
                    tone === "neutral"
                      ? "muted"
                      : (tone as "pink" | "amber" | "emerald")
                  }
                >
                  {SAV_STATUS_LABELS[status]}
                </StatusPill>
                <span className="text-[11px] text-muted-2 tabular-nums font-mono">
                  {items.length}
                </span>
              </div>
              {pending && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-2" strokeWidth={2.4} />
              )}
            </div>
            <div className="p-2.5 space-y-2">
              {items.length === 0 ? (
                <p className="text-[11.5px] text-muted-2 text-center py-6 italic">
                  Glisse un ticket ici
                </p>
              ) : (
                items.map((t) => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    team={team}
                    onAssign={assign}
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TicketCard({
  ticket,
  team,
  onAssign,
  onDragStart,
  onDragEnd,
}: {
  ticket: SavTicketWithRefs;
  team: TeamMember[];
  onAssign: (id: string, assignedTo: string | null) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const [assignOpen, setAssignOpen] = useState(false);
  const priorityTone =
    ticket.priority === "urgente"
      ? "bg-pink-soft text-pink"
      : ticket.priority === "haute"
        ? "bg-amber-soft text-amber"
        : "bg-canvas-2 text-muted-2";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="bg-white rounded-lg border border-line p-3 hover:shadow-sm cursor-grab active:cursor-grabbing transition-shadow"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="font-mono text-[10.5px] text-muted-2">{ticket.number}</p>
        <span
          className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${priorityTone}`}
        >
          {SAV_PRIORITY_LABELS[ticket.priority]}
        </span>
      </div>
      <p className="text-[13px] font-semibold text-ink leading-snug mb-1">
        {ticket.title}
      </p>
      {ticket.description && (
        <p className="text-[11.5px] text-muted-2 line-clamp-2 mb-2 leading-snug">
          {ticket.description}
        </p>
      )}

      {/* Liens vers les entités */}
      <div className="flex items-center gap-1.5 flex-wrap mt-2">
        {ticket.client_id && (
          <Link
            href={`/clients/${ticket.client_id}`}
            className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded bg-canvas-2 text-ink-2 hover:bg-canvas-2/70"
          >
            <UserIcon className="h-2.5 w-2.5" strokeWidth={2.4} />
            {ticket.client_name ?? "Client"}
          </Link>
        )}
        {ticket.devis_id && (
          <Link
            href={`/devis/${ticket.devis_id}`}
            className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded bg-pink-soft/40 text-pink hover:bg-pink-soft/60"
          >
            <FileText className="h-2.5 w-2.5" strokeWidth={2.4} />
            {ticket.devis_number ?? "Devis"}
          </Link>
        )}
        {ticket.dossier_id && (
          <Link
            href={`/confections/${ticket.dossier_id}`}
            className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded bg-violet-soft/40 text-violet-strong hover:bg-violet-soft/60"
          >
            <Scissors className="h-2.5 w-2.5" strokeWidth={2.4} />
            {ticket.dossier_number ?? "Dossier"}
          </Link>
        )}
      </div>

      {/* Assignation */}
      <div className="mt-2 pt-2 border-t border-line flex items-center justify-between">
        <div className="relative">
          <button
            onClick={() => setAssignOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[10.5px] text-muted hover:text-ink transition-colors"
          >
            <UserIcon className="h-2.5 w-2.5" strokeWidth={2.4} />
            {ticket.assigned_name ?? "Non assigné"}
            <ChevronDown className="h-2.5 w-2.5" strokeWidth={2.4} />
          </button>
          {assignOpen && (
            <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-line rounded-lg shadow-lg min-w-[180px] max-h-[200px] overflow-y-auto">
              <button
                onClick={() => {
                  onAssign(ticket.id, null);
                  setAssignOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-[11.5px] text-muted hover:bg-canvas-2 inline-flex items-center gap-1.5"
              >
                <X className="h-2.5 w-2.5" strokeWidth={2.4} />
                Non assigné
              </button>
              {team.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onAssign(ticket.id, m.id);
                    setAssignOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-[11.5px] hover:bg-canvas-2 ${
                    ticket.assigned_to === m.id ? "font-semibold text-ink" : "text-ink-2"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted-2 inline-flex items-center gap-1">
          <Calendar className="h-2.5 w-2.5" strokeWidth={2.4} />
          {new Date(ticket.created_at).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
          })}
        </p>
      </div>
    </div>
  );
}
