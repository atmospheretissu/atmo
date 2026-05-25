"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Save, User, AlertCircle } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { schedulePoseAction } from "@/app/(platform)/poses/actions";
import type { Poseur } from "@/lib/db/equipe";

export function PoseScheduleForm({
  poseId,
  initialScheduledAt,
  initialDuration,
  initialNotes,
  initialPoseurId,
  poseurs,
}: {
  poseId: string;
  initialScheduledAt: string | null;
  initialDuration: number;
  initialNotes: string;
  initialPoseurId?: string | null;
  poseurs: Poseur[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const isoToLocal = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [date, setDate] = useState(isoToLocal(initialScheduledAt));
  const [duration, setDuration] = useState(initialDuration);
  const [notes, setNotes] = useState(initialNotes);
  const [poseurId, setPoseurId] = useState(initialPoseurId ?? "");

  const activePoseurs = poseurs.filter((p) => p.active);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      alert("Choisis une date et une heure.");
      return;
    }
    const iso = new Date(date).toISOString();
    startTransition(async () => {
      const r = await schedulePoseAction(poseId, iso, {
        durationMinutes: duration,
        notes: notes || undefined,
        poseurId: poseurId || undefined,
      });
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="schedule_at">Date &amp; heure de pose *</Label>
          <Input
            id="schedule_at"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="duration">Durée (minutes)</Label>
          <Input
            id="duration"
            type="number"
            min={30}
            step={15}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 120)}
          />
        </div>
      </div>

      {/* Sélecteur poseur — vraie liste */}
      <div>
        <Label htmlFor="poseur">
          <span className="inline-flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" strokeWidth={2.4} /> Poseur assigné
          </span>
        </Label>
        {activePoseurs.length === 0 ? (
          <div className="rounded-md bg-amber-soft border border-amber/30 px-3 py-2 text-[12.5px] text-amber inline-flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" strokeWidth={2.2} />
            <span>
              Aucun poseur enregistré.{" "}
              <Link href="/parametres" className="underline font-medium">
                Ajoute-en dans Paramètres → Équipe
              </Link>
              .
            </span>
          </div>
        ) : (
          <select
            id="poseur"
            value={poseurId}
            onChange={(e) => setPoseurId(e.target.value)}
            className="h-9 w-full rounded-md border border-line-strong bg-white px-2.5 text-[13.5px] text-ink"
          >
            <option value="">— À assigner —</option>
            {activePoseurs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.zone ? ` · ${p.zone}` : ""}
                {!p.internal ? " (sous-traitant)" : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <Label htmlFor="notes">Notes pour le poseur</Label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Code portail, étage, contraintes (parking…)"
          className="w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13.5px] text-ink placeholder:text-muted-2"
        />
      </div>
      <div className="flex items-center justify-end">
        <Button variant="primary" size="md" type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement…
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" strokeWidth={2.4} />
              {initialScheduledAt ? "Mettre à jour" : "Planifier"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
