"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalIcon,
  Clock,
  MapPin,
  Search,
  Filter,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import { time } from "@/lib/formatters";

type PoseRow = {
  id: string;
  scheduled_at: string | null;
  duration_minutes: number;
  status: string;
  poseur_id: string | null;
  client_name: string;
  client_city: string | null;
  client_phone: string | null;
  dossier_number: string;
  notes: string | null;
};

type PoseurRow = {
  id: string;
  name: string;
  zone: string | null;
  active: boolean;
  internal: boolean;
};

const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const months = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

const poseStatusLabels: Record<string, string> = {
  a_planifier: "À planifier",
  planifie: "Planifié",
  confirme: "Confirmé client",
  pose: "Posé",
  annule: "Annulé",
};

const poseStatusTones: Record<string, "amber" | "blue" | "emerald" | "neutral" | "danger"> = {
  a_planifier: "amber",
  planifie: "blue",
  confirme: "emerald",
  pose: "neutral",
  annule: "danger",
};

// Palette de couleurs par poseur (déterministe via hash sur l'id)
const PALETTE = ["violet", "emerald", "pink", "blue", "amber", "orange"] as const;
const DOT_CLASS = {
  violet: "bg-violet",
  emerald: "bg-emerald",
  pink: "bg-pink",
  blue: "bg-blue",
  amber: "bg-amber",
  orange: "bg-orange",
} as const;
const SOFT_CLASS = {
  violet: "bg-violet-soft text-violet-strong",
  emerald: "bg-emerald-soft text-emerald",
  pink: "bg-pink-soft text-pink",
  blue: "bg-blue-soft text-blue",
  amber: "bg-amber-soft text-amber",
  orange: "bg-orange-soft text-orange",
} as const;

function colorFor(poseurId: string | null): typeof PALETTE[number] {
  if (!poseurId) return "amber";
  let h = 0;
  for (let i = 0; i < poseurId.length; i++) h = (h * 31 + poseurId.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function AgendaClient({
  poses,
  poseurs,
}: {
  poses: PoseRow[];
  poseurs: PoseurRow[];
}) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [filter, setFilter] = useState<string>("all"); // "all" | "unassigned" | poseurId

  const activePoseurs = poseurs.filter((p) => p.active);

  // Map id → nom + couleur
  const poseurNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of poseurs) m.set(p.id, p.name);
    return m;
  }, [poseurs]);

  // Helper : ne garde que les poses planifiées (avec scheduled_at)
  const scheduledPoses = useMemo(
    () => poses.filter((p): p is PoseRow & { scheduled_at: string } => Boolean(p.scheduled_at)),
    [poses],
  );

  const monthGrid = useMemo(
    () => buildMonthGrid(viewMonth, viewYear),
    [viewMonth, viewYear],
  );

  const posesByDay = useMemo(() => {
    const map = new Map<string, typeof scheduledPoses>();
    for (const p of scheduledPoses) {
      if (filter === "unassigned" && p.poseur_id) continue;
      if (filter !== "all" && filter !== "unassigned" && p.poseur_id !== filter) continue;
      const key = new Date(p.scheduled_at).toDateString();
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return map;
  }, [scheduledPoses, filter]);

  const selectedPoses = posesByDay.get(selectedDate.toDateString()) ?? [];

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else setViewMonth(viewMonth - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else setViewMonth(viewMonth + 1);
  };

  const filteredPoses = scheduledPoses.filter((p) => {
    if (filter === "unassigned") return !p.poseur_id;
    if (filter === "all") return true;
    return p.poseur_id === filter;
  });
  const upcoming = filteredPoses
    .filter((p) => p.status !== "pose" && new Date(p.scheduled_at).getTime() >= today.getTime() - 86400000)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const totalThisMonth = filteredPoses.filter((p) => {
    const d = new Date(p.scheduled_at);
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  }).length;

  // Compte par poseur (uniquement à venir)
  const upcomingByPoseur = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of scheduledPoses) {
      if (!p.poseur_id || p.status === "pose") continue;
      m.set(p.poseur_id, (m.get(p.poseur_id) ?? 0) + 1);
    }
    return m;
  }, [scheduledPoses]);
  const unassignedCount = scheduledPoses.filter((p) => !p.poseur_id && p.status !== "pose").length;

  return (
    <>
      <Topbar
        breadcrumb={[{ label: "Atmosphère" }, { label: "Agenda" }]}
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Filter className="h-3.5 w-3.5" strokeWidth={2.2} /> Filtres
            </Button>
            <Link href="/poses">
              <Button variant="primary" size="sm">
                <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Voir toutes les poses
              </Button>
            </Link>
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Vue mensuelle · interventions</p>
          <div className="flex items-end justify-between gap-8 flex-wrap mb-2">
            <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1]">
              Agenda
              <span className="ml-3 text-[24px] text-muted-2 font-semibold tabular-nums">
                {totalThisMonth}
              </span>
            </h1>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
                <Input placeholder="Client, ville…" className="pl-9 w-60 text-[12.5px] rounded-full bg-white" />
              </div>
            </div>
          </div>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Vue planning consolidée tous poseurs. Cliquer sur un jour pour voir le détail.
            Couleurs = poseur assigné.
          </p>
        </section>

        {/* Poseur filter chips */}
        <section className="px-8 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className={
                "h-8 px-3 rounded-full text-[12.5px] font-medium transition-all " +
                (filter === "all"
                  ? "bg-ink text-white"
                  : "bg-white text-muted hover:text-ink border border-line")
              }
            >
              Tous · {scheduledPoses.length}
            </button>
            {unassignedCount > 0 && (
              <button
                onClick={() => setFilter("unassigned")}
                className={
                  "h-8 px-3 rounded-full text-[12.5px] font-medium transition-all inline-flex items-center gap-1.5 " +
                  (filter === "unassigned"
                    ? "bg-ink text-white"
                    : "bg-white text-muted hover:text-ink border border-line")
                }
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                Non assigné
                <span className="text-[10.5px] text-muted-2 font-mono">{unassignedCount}</span>
              </button>
            )}
            {activePoseurs.map((p) => {
              const color = colorFor(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => setFilter(p.id)}
                  className={
                    "h-8 px-3 rounded-full text-[12.5px] font-medium transition-all inline-flex items-center gap-1.5 " +
                    (filter === p.id
                      ? "bg-ink text-white"
                      : "bg-white text-muted hover:text-ink border border-line")
                  }
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[color]}`} />
                  {p.name}
                  <span className="text-[10.5px] text-muted-2 font-mono">
                    {upcomingByPoseur.get(p.id) ?? 0}
                  </span>
                </button>
              );
            })}
            {activePoseurs.length === 0 && (
              <span className="text-[12px] text-muted-2 italic">
                Aucun poseur enregistré.{" "}
                <Link href="/parametres" className="text-violet underline">
                  Ajouter
                </Link>
              </span>
            )}
          </div>
        </section>

        <section className="px-8 pb-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
          {/* Calendar */}
          <Card className="overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-line">
              <div className="flex items-center gap-3">
                <h2 className="text-[18px] font-semibold text-ink tracking-tight capitalize">
                  {months[viewMonth]}{" "}
                  <span className="text-muted-2 font-normal">{viewYear}</span>
                </h2>
                <button
                  onClick={() => {
                    setViewMonth(today.getMonth());
                    setViewYear(today.getFullYear());
                    setSelectedDate(today);
                  }}
                  className="inline-flex items-center gap-1 px-2 h-6 rounded-md bg-canvas-2 text-[11.5px] text-ink-2 hover:bg-canvas-2/80 transition-colors"
                >
                  Aujourd'hui
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={goPrev}
                  className="h-8 w-8 rounded-md text-muted hover:text-ink hover:bg-canvas-2 inline-flex items-center justify-center transition-colors"
                  aria-label="Mois précédent"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
                </button>
                <button
                  onClick={goNext}
                  className="h-8 w-8 rounded-md text-muted hover:text-ink hover:bg-canvas-2 inline-flex items-center justify-center transition-colors"
                  aria-label="Mois suivant"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-line bg-canvas-2/30">
              {weekdays.map((w) => (
                <div
                  key={w}
                  className="px-2 py-2 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 text-center"
                >
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {monthGrid.map((day, i) => {
                const dayPoses = posesByDay.get(day.date.toDateString()) ?? [];
                const isToday = day.date.toDateString() === today.toDateString();
                const isSelected = day.date.toDateString() === selectedDate.toDateString();
                const isOtherMonth = day.date.getMonth() !== viewMonth;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day.date)}
                    className={
                      "relative aspect-square sm:aspect-[1.2/1] border-r border-b border-line p-1.5 text-left transition-colors min-h-[78px] " +
                      (isSelected
                        ? "bg-violet-soft"
                        : isOtherMonth
                          ? "bg-canvas-2/30 hover:bg-canvas-2/50"
                          : "bg-white hover:bg-canvas-2/40")
                    }
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={
                          "inline-flex items-center justify-center h-6 min-w-6 px-1 rounded-md text-[11.5px] font-semibold tabular-nums " +
                          (isToday
                            ? "bg-ink text-white"
                            : isOtherMonth
                              ? "text-muted-2"
                              : "text-ink")
                        }
                      >
                        {day.date.getDate()}
                      </span>
                      {dayPoses.length > 0 && (
                        <span className="text-[10px] font-mono text-muted tabular-nums shrink-0">
                          {dayPoses.length}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 space-y-0.5">
                      {dayPoses.slice(0, 2).map((p) => {
                        const color = colorFor(p.poseur_id);
                        return (
                          <div
                            key={p.id}
                            className={`px-1 py-0.5 rounded text-[9.5px] truncate font-medium leading-tight ${SOFT_CLASS[color]}`}
                          >
                            {time(p.scheduled_at)} {firstNameOf(p.client_name)}
                          </div>
                        );
                      })}
                      {dayPoses.length > 2 && (
                        <p className="text-[9.5px] text-muted-2 px-1">+{dayPoses.length - 2}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Side panel */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-line">
                <p className="eyebrow mb-1">Sélectionné</p>
                <h3 className="text-[16px] font-semibold text-ink tracking-tight capitalize">
                  {selectedDate.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h3>
              </div>

              {selectedPoses.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <CalIcon className="h-7 w-7 text-muted-2 mx-auto mb-2" strokeWidth={1.6} />
                  <p className="text-[12.5px] text-muted">Aucune intervention</p>
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {selectedPoses.map((p) => {
                    const color = colorFor(p.poseur_id);
                    const initial = (p.client_name[0] ?? "?").toUpperCase();
                    const poseurName = p.poseur_id
                      ? poseurNameById.get(p.poseur_id) ?? "Poseur inconnu"
                      : "Non assigné";
                    return (
                      <Link
                        key={p.id}
                        href={`/poses/${p.id}`}
                        className="block px-5 py-3.5 hover:bg-canvas-2/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`shrink-0 h-12 w-12 rounded-lg flex flex-col items-center justify-center ${SOFT_CLASS[color]}`}
                          >
                            <Clock className="h-3 w-3 mb-0.5" strokeWidth={2.4} />
                            <p className="text-[11px] font-mono font-semibold tabular-nums leading-none">
                              {time(p.scheduled_at)}
                            </p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <LetterAvatar initial={initial} tone={toneFor(p.client_name)} size="xs" />
                              <p className="text-[13px] font-semibold text-ink truncate">
                                {p.client_name}
                              </p>
                            </div>
                            {p.client_city && (
                              <p className="text-[11.5px] text-muted truncate flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {p.client_city}
                              </p>
                            )}
                            {p.dossier_number && (
                              <p className="text-[11.5px] text-ink-2 mt-1 truncate font-mono">
                                {p.dossier_number}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[color]}`} />
                              <span className={p.poseur_id ? "text-[10.5px] text-muted font-medium" : "text-[10.5px] text-amber font-medium"}>
                                {poseurName}
                              </span>
                              <span className="text-muted-2">·</span>
                              <span className="text-[10.5px] text-muted-2">
                                {p.duration_minutes} min
                              </span>
                            </div>
                          </div>
                          <StatusPill tone={poseStatusTones[p.status] ?? "muted"} dot={false}>
                            {poseStatusLabels[p.status] ?? p.status}
                          </StatusPill>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Upcoming */}
            <Card className="overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
                <div>
                  <p className="eyebrow mb-1">À venir</p>
                  <h3 className="text-[15px] font-semibold text-ink">Prochaines interventions</h3>
                </div>
                <span className="text-[11.5px] font-mono text-muted-2">{upcoming.length}</span>
              </div>
              {upcoming.length === 0 ? (
                <div className="px-5 py-6 text-center text-[12.5px] text-muted">
                  Aucune pose à venir.
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {upcoming.slice(0, 5).map((p) => {
                    const d = new Date(p.scheduled_at);
                    const poseurName = p.poseur_id
                      ? poseurNameById.get(p.poseur_id) ?? "Inconnu"
                      : "Non assigné";
                    return (
                      <Link
                        key={p.id}
                        href={`/poses/${p.id}`}
                        className="px-5 py-3 flex items-center gap-3 hover:bg-canvas-2/30 transition-colors"
                      >
                        <div className="shrink-0 flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-canvas-2 border border-line">
                          <p className="text-[8.5px] font-semibold tracking-wider uppercase text-muted-2 leading-none">
                            {d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}
                          </p>
                          <p className="text-[14px] font-semibold text-ink leading-none tabular-nums mt-0.5">
                            {d.getDate()}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] font-semibold text-ink leading-tight truncate">
                            {p.client_name}
                          </p>
                          <p className="text-[11px] text-muted mt-0.5 truncate">
                            {time(p.scheduled_at)} · {poseurName}
                          </p>
                        </div>
                        <StatusPill tone={poseStatusTones[p.status] ?? "muted"} dot={false}>
                          {poseStatusLabels[p.status] ?? p.status}
                        </StatusPill>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Légende */}
            {activePoseurs.length > 0 && (
              <Card className="p-4">
                <p className="eyebrow mb-2">Légende</p>
                <div className="space-y-1.5 text-[12px]">
                  {activePoseurs.map((p) => {
                    const color = colorFor(p.id);
                    return (
                      <div key={p.id} className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${DOT_CLASS[color]}`} />
                        <span className="text-ink-2">{p.name}</span>
                        {p.zone && (
                          <span className="text-muted-2 ml-auto text-[11px] truncate max-w-[150px]">
                            {p.zone}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {unassignedCount > 0 && (
                    <div className="flex items-center gap-2 pt-1.5 border-t border-line mt-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber" />
                      <span className="text-amber">Non assigné</span>
                      <span className="text-muted-2 ml-auto text-[11px] font-mono">{unassignedCount}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function buildMonthGrid(month: number, year: number) {
  const days: { date: Date }[] = [];
  const firstOfMonth = new Date(year, month, 1);
  const jsDay = firstOfMonth.getDay();
  const offset = (jsDay + 6) % 7; // Monday=0
  const start = new Date(year, month, 1 - offset);
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({ date: d });
  }
  return days;
}

function firstNameOf(displayName: string): string {
  // Extract a short name for compact calendar cells
  const trimmed = displayName.trim();
  if (trimmed.includes(",")) return trimmed.split(",")[1]?.trim() ?? trimmed;
  return trimmed.split(" ")[0] ?? trimmed;
}
