"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Loader2, Save } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { schedulePoseAction } from "@/app/(platform)/poses/actions";

export function PoseScheduleForm({
  poseId,
  initialScheduledAt,
  initialDuration,
  initialNotes,
}: {
  poseId: string;
  initialScheduledAt: string | null;
  initialDuration: number;
  initialNotes: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Initial datetime-local format (YYYY-MM-DDTHH:MM) from ISO
  const isoToLocal = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [date, setDate] = useState(isoToLocal(initialScheduledAt));
  const [duration, setDuration] = useState(initialDuration);
  const [notes, setNotes] = useState(initialNotes);

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
          <Label htmlFor="schedule_at">Date & heure de pose *</Label>
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
