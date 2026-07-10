"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarDays, Loader2, Plus, X, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import {
  addAvailabilityAction,
  removeAvailabilityAction,
} from "@/app/(platform)/poses/availability-actions";
import type { PoseurAvailability, SlotKey } from "@/lib/db/poseur-availability";

const SLOT_LABELS: Record<SlotKey, string> = {
  morning: "Matin",
  afternoon: "Après-midi",
  day: "Journée",
};

const SLOT_ORDER: SlotKey[] = ["morning", "afternoon", "day"];

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = (day + 6) % 7; // lundi = 0
  const out = new Date(d);
  out.setDate(d.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function AvailabilityCalendar({
  initial,
  weeksAhead = 4,
}: {
  initial: PoseurAvailability[];
  weeksAhead?: number;
}) {
  const [items, setItems] = useState<PoseurAvailability[]>(initial);
  const [pending, startTransition] = useTransition();
  const [weekOffset, setWeekOffset] = useState(0);

  const monday = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() + weekOffset * 7);
    return startOfWeek(now);
  }, [weekOffset]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [monday]);

  const itemsByKey = useMemo(() => {
    const map = new Map<string, PoseurAvailability>();
    for (const it of items) map.set(`${it.date}::${it.slot}`, it);
    return map;
  }, [items]);

  const toggleSlot = (date: string, slot: SlotKey) => {
    const key = `${date}::${slot}`;
    const existing = itemsByKey.get(key);
    startTransition(async () => {
      if (existing) {
        if (existing.status !== "available") return; // booked, no toggle
        const r = await removeAvailabilityAction(existing.id);
        if (r.ok) setItems((prev) => prev.filter((x) => x.id !== existing.id));
      } else {
        const r = await addAvailabilityAction(date, slot);
        if (r.ok && r.id) {
          setItems((prev) => [
            ...prev,
            {
              id: r.id!,
              poseur_id: "",
              poseur_name: null,
              date,
              slot,
              status: "available",
              pose_id: null,
              notes: null,
            },
          ]);
        } else if (r.message) {
          alert(`Erreur : ${r.message}`);
        }
      }
    });
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-violet-strong" />
          <div>
            <h2 className="text-[16px] font-semibold text-ink">Mes disponibilités</h2>
            <p className="text-[12.5px] text-muted mt-0.5">
              Clique sur un créneau pour te déclarer disponible / retirer ta dispo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: weeksAhead }, (_, i) => (
            <button
              key={i}
              onClick={() => setWeekOffset(i)}
              className={
                "h-8 px-3 text-[12px] font-semibold rounded-full transition-colors " +
                (weekOffset === i
                  ? "bg-ink text-white"
                  : "bg-white text-muted hover:text-ink border border-line")
              }
            >
              {i === 0 ? "Cette semaine" : `+${i} sem.`}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px] min-w-[560px]">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-muted-2 font-semibold text-[10.5px] uppercase tracking-wider">
                Créneau
              </th>
              {days.map((d, i) => {
                const isWeekend = i >= 5;
                return (
                  <th
                    key={i}
                    className={
                      "px-2 py-2 text-center " +
                      (isWeekend ? "bg-canvas-2/40" : "")
                    }
                  >
                    <p className="text-[10px] text-muted-2 font-semibold uppercase tracking-wider">
                      {DAYS_FR[i]}
                    </p>
                    <p className="text-[15px] font-semibold text-ink tabular-nums mt-1">
                      {d.getDate()}/{d.getMonth() + 1}
                    </p>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {SLOT_ORDER.map((slot) => (
              <tr key={slot} className="border-t border-line">
                <td className="px-3 py-2 font-semibold text-ink-2">
                  {SLOT_LABELS[slot]}
                </td>
                {days.map((d, i) => {
                  const date = formatDate(d);
                  const isPast =
                    d.getTime() < new Date().setHours(0, 0, 0, 0);
                  const it = itemsByKey.get(`${date}::${slot}`);
                  return (
                    <td key={i} className="p-1 text-center">
                      <button
                        disabled={pending || isPast || it?.status === "booked"}
                        onClick={() => toggleSlot(date, slot)}
                        className={
                          "w-full h-11 rounded-md transition-colors text-[11px] font-semibold flex items-center justify-center gap-1 " +
                          (isPast
                            ? "bg-canvas-2/30 text-muted-2 cursor-not-allowed"
                            : it?.status === "booked"
                              ? "bg-blue text-white"
                              : it?.status === "available"
                                ? "bg-emerald text-white hover:bg-emerald/90"
                                : "bg-white border border-dashed border-line hover:border-emerald hover:bg-emerald-soft/40 text-muted-2")
                        }
                      >
                        {it?.status === "booked" && (
                          <>
                            <User className="h-3 w-3" /> Réservé
                          </>
                        )}
                        {it?.status === "available" && (
                          <>
                            <X className="h-3 w-3" /> Retirer
                          </>
                        )}
                        {!it && !isPast && (
                          <>
                            <Plus className="h-3 w-3" /> Dispo
                          </>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pending && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Enregistrement…
        </div>
      )}

      <div className="mt-4 flex items-center gap-3 text-[11px] text-muted flex-wrap">
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-emerald" /> Disponible
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-blue" /> Réservé (staff a planifié une pose)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded border border-dashed border-line" /> Non déclaré
        </span>
      </div>
    </Card>
  );
}
