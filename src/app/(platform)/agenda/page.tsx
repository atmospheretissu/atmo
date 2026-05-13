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
  Phone,
  CheckCircle2,
  Wrench,
  AlertTriangle,
  Filter,
  Search,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import {
  poses,
  poseStatusLabels,
  poseStatusTones,
  poseurs,
} from "@/lib/mock-data";
import { time } from "@/lib/formatters";

const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const months = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

const poseurColor: Record<string, "violet" | "emerald" | "pink" | "blue"> = {
  p1: "violet",
  p2: "emerald",
  p3: "pink",
};

const poseurDotClass: Record<string, string> = {
  p1: "bg-violet",
  p2: "bg-emerald",
  p3: "bg-pink",
};

export default function AgendaPage() {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [filter, setFilter] = useState<"all" | "p1" | "p2" | "p3">("all");

  const monthGrid = useMemo(() => buildMonthGrid(viewMonth, viewYear), [viewMonth, viewYear]);

  const posesByDay = useMemo(() => {
    const map = new Map<string, typeof poses>();
    poses.forEach((p) => {
      if (filter !== "all" && p.poseurId !== filter) return;
      const key = p.date.toDateString();
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    });
    return map;
  }, [filter]);

  const selectedPoses =
    posesByDay.get(selectedDate.toDateString()) ?? [];

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

  const filteredPoses = poses.filter((p) => filter === "all" || p.poseurId === filter);
  const upcoming = filteredPoses
    .filter((p) => p.status !== "pose")
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const totalThisMonth = filteredPoses.filter(
    (p) => p.date.getMonth() === viewMonth && p.date.getFullYear() === viewYear
  ).length;

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Agenda" },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Filter className="h-3.5 w-3.5" strokeWidth={2.2} /> Filtres
            </Button>
            <Button variant="primary" size="sm">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Nouvelle pose
            </Button>
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
            Vue planning consolidée tous poseurs. Cliquer sur un jour pour voir le détail. Couleurs = poseur assigné.
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
              Tous · {poses.length}
            </button>
            {poseurs.map((p) => (
              <button
                key={p.id}
                onClick={() => setFilter(p.id as never)}
                className={
                  "h-8 px-3 rounded-full text-[12.5px] font-medium transition-all inline-flex items-center gap-1.5 " +
                  (filter === p.id
                    ? "bg-ink text-white"
                    : "bg-white text-muted hover:text-ink border border-line")
                }
              >
                <span className={`h-1.5 w-1.5 rounded-full ${poseurDotClass[p.id]}`} />
                {p.name}
                <span className="text-[10.5px] text-muted-2 font-mono">{p.upcoming}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="px-8 pb-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
          {/* Calendar */}
          <Card className="overflow-hidden">
            {/* Month nav */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-line">
              <div className="flex items-center gap-3">
                <h2 className="text-[18px] font-semibold text-ink tracking-tight capitalize">
                  {months[viewMonth]} <span className="text-muted-2 font-normal">{viewYear}</span>
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

            {/* Weekday header */}
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

            {/* Days */}
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

                    {/* Pose indicators */}
                    <div className="mt-1 space-y-0.5">
                      {dayPoses.slice(0, 2).map((p) => (
                        <div
                          key={p.id}
                          className={
                            "px-1 py-0.5 rounded text-[9.5px] truncate font-medium leading-tight " +
                            (p.poseurId === "p1"
                              ? "bg-violet-soft text-violet-strong"
                              : p.poseurId === "p2"
                              ? "bg-emerald-soft text-emerald"
                              : "bg-pink-soft text-pink")
                          }
                        >
                          {time(p.date)} {p.client.split(",")[1]?.trim() ?? p.client}
                        </div>
                      ))}
                      {dayPoses.length > 2 && (
                        <p className="text-[9.5px] text-muted-2 px-1">+{dayPoses.length - 2}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Side panel — selected day + upcoming */}
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
                  <button className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-violet hover:underline font-medium">
                    <Plus className="h-3 w-3" /> Ajouter une pose
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {selectedPoses.map((p) => {
                    const initial = p.client.includes(",")
                      ? (p.client.split(",")[1].trim()[0] ?? p.client[0])
                      : p.client[0];
                    return (
                      <Link
                        key={p.id}
                        href={`/poses/${p.id}`}
                        className="block px-5 py-3.5 hover:bg-canvas-2/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`shrink-0 h-12 w-12 rounded-lg flex flex-col items-center justify-center ${
                            p.poseurId === "p1"
                              ? "bg-violet-soft text-violet-strong"
                              : p.poseurId === "p2"
                              ? "bg-emerald-soft text-emerald"
                              : "bg-pink-soft text-pink"
                          }`}>
                            <Clock className="h-3 w-3 mb-0.5" strokeWidth={2.4} />
                            <p className="text-[11px] font-mono font-semibold tabular-nums leading-none">
                              {time(p.date)}
                            </p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <LetterAvatar initial={initial} tone={toneFor(p.client)} size="xs" />
                              <p className="text-[13px] font-semibold text-ink truncate">{p.client}</p>
                            </div>
                            <p className="text-[11.5px] text-muted truncate flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {p.city}
                            </p>
                            <p className="text-[11.5px] text-ink-2 mt-1 truncate">{p.products}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`h-1.5 w-1.5 rounded-full ${poseurDotClass[p.poseurId]}`} />
                              <span className="text-[10.5px] text-muted font-medium">{p.poseur}</span>
                              <span className="text-muted-2">·</span>
                              <span className="text-[10.5px] text-muted-2">{p.duration} min</span>
                            </div>
                          </div>
                          <StatusPill tone={poseStatusTones[p.status]} dot={false}>
                            {poseStatusLabels[p.status]}
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
              <div className="divide-y divide-line">
                {upcoming.slice(0, 5).map((p) => {
                  const initial = p.client.includes(",")
                    ? (p.client.split(",")[1].trim()[0] ?? p.client[0])
                    : p.client[0];
                  return (
                    <Link
                      key={p.id}
                      href={`/poses/${p.id}`}
                      className="px-5 py-3 flex items-center gap-3 hover:bg-canvas-2/30 transition-colors"
                    >
                      <div className="shrink-0 flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-canvas-2 border border-line">
                        <p className="text-[8.5px] font-semibold tracking-wider uppercase text-muted-2 leading-none">
                          {p.date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}
                        </p>
                        <p className="text-[14px] font-semibold text-ink leading-none tabular-nums mt-0.5">
                          {p.date.getDate()}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-semibold text-ink leading-tight truncate">
                          {p.client}
                        </p>
                        <p className="text-[11px] text-muted mt-0.5 truncate">
                          {time(p.date)} · {p.poseur}
                        </p>
                      </div>
                      <StatusPill tone={poseStatusTones[p.status]} dot={false} className="!text-[10px] !px-1.5">
                        {poseStatusLabels[p.status]}
                      </StatusPill>
                    </Link>
                  );
                })}
              </div>
            </Card>

            {/* Legend */}
            <Card className="p-4">
              <p className="eyebrow mb-2">Légende</p>
              <div className="space-y-1.5 text-[12px]">
                {poseurs.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${poseurDotClass[p.id]}`} />
                    <span className="text-ink-2">{p.name}</span>
                    <span className="text-muted-2 ml-auto text-[11px] font-mono">{p.zone.split("·")[0].trim()}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </>
  );
}

function buildMonthGrid(month: number, year: number) {
  const days: { date: Date }[] = [];
  const firstOfMonth = new Date(year, month, 1);
  // JS Sunday = 0, we want Monday-start
  const jsDay = firstOfMonth.getDay();
  const offset = (jsDay + 6) % 7; // Monday=0
  // start date
  const start = new Date(year, month, 1 - offset);
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({ date: d });
  }
  return days;
}
