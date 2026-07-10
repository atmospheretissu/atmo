"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CalendarPlus, Loader2, X, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  addAvailabilityForPoseurAction,
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
  const diff = (day + 6) % 7;
  const out = new Date(d);
  out.setDate(d.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function AdminAvailabilityModal({
  poseurs,
  allAvailabilities,
  onClose,
}: {
  poseurs: { id: string; name: string }[];
  allAvailabilities: PoseurAvailability[];
  onClose: () => void;
}) {
  const [poseurId, setPoseurId] = useState<string>(poseurs[0]?.id ?? "");
  const [weekOffset, setWeekOffset] = useState(0);
  const [items, setItems] = useState<PoseurAvailability[]>(allAvailabilities);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

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
    for (const it of items) {
      if (it.poseur_id === poseurId) {
        map.set(`${it.date}::${it.slot}`, it);
      }
    }
    return map;
  }, [items, poseurId]);

  const toggleSlot = (date: string, slot: SlotKey) => {
    if (!poseurId) return;
    const key = `${date}::${slot}`;
    const existing = itemsByKey.get(key);
    startTransition(async () => {
      if (existing) {
        if (existing.status !== "available") return;
        const r = await removeAvailabilityAction(existing.id);
        if (r.ok) setItems((prev) => prev.filter((x) => x.id !== existing.id));
      } else {
        const r = await addAvailabilityForPoseurAction(poseurId, date, slot);
        if (r.ok && r.id) {
          const p = poseurs.find((x) => x.id === poseurId);
          setItems((prev) => [
            ...prev,
            {
              id: r.id!,
              poseur_id: poseurId,
              poseur_name: p?.name ?? null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto p-5">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <CalendarPlus className="h-5 w-5 text-violet-strong" />
            <div>
              <h2 className="text-[15px] font-semibold text-ink">
                Déclarer des dispos pour un poseur
              </h2>
              <p className="text-[12px] text-muted mt-0.5">
                Le poseur pourra les voir, tu pourras y planifier des poses depuis l&apos;agenda.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md hover:bg-canvas-2 inline-flex items-center justify-center text-muted"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-2" />
            <select
              value={poseurId}
              onChange={(e) => setPoseurId(e.target.value)}
              className="h-9 rounded-md border border-line-strong bg-white px-3 text-[13px] font-semibold"
            >
              {poseurs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            {Array.from({ length: 4 }, (_, i) => (
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
                {i === 0 ? "Cette sem." : `+${i}`}
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
                      className={"px-2 py-2 text-center " + (isWeekend ? "bg-canvas-2/40" : "")}
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
                    const isPast = d.getTime() < new Date().setHours(0, 0, 0, 0);
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
                          {it?.status === "booked" && "Réservé"}
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

        <div className="mt-4 flex justify-end">
          <Button variant="secondary" size="md" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </Card>
    </div>
  );
}
