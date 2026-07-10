"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarDays, CalendarPlus, Loader2, MapPin, Package, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ColorChip, StatusPill } from "@/components/ui/status-pill";
import { bookAvailabilityAction } from "@/app/(platform)/poses/availability-actions";
import { AdminAvailabilityModal } from "@/components/agenda/admin-availability-modal";
import type {
  PoseurAvailability,
  SlotKey,
} from "@/lib/db/poseur-availability";

const SLOT_LABELS: Record<SlotKey, string> = {
  morning: "Matin",
  afternoon: "Après-midi",
  day: "Journée",
};

const SLOT_HOURS: Record<SlotKey, string> = {
  morning: "09:00",
  afternoon: "14:00",
  day: "09:00",
};

type Dossier = {
  id: string;
  number: string;
  client_name: string | null;
  client_city: string | null;
  devis_number: string | null;
  total_ttc: number;
};

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

export function PosePlanner({
  availabilities,
  awaitingDossiers,
  poseurs,
}: {
  availabilities: PoseurAvailability[];
  awaitingDossiers: Dossier[];
  poseurs: { id: string; name: string }[];
}) {
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [collapsed, setCollapsed] = useState(false);
  const [adminModal, setAdminModal] = useState(false);

  const availableSlots = useMemo(
    () => availabilities.filter((a) => a.status === "available"),
    [availabilities],
  );

  const dossierById = useMemo(
    () => new Map(awaitingDossiers.map((d) => [d.id, d])),
    [awaitingDossiers],
  );

  // Group availabilities par date puis par poseur
  const byDate = useMemo(() => {
    const map = new Map<string, PoseurAvailability[]>();
    for (const a of availableSlots) {
      if (!map.has(a.date)) map.set(a.date, []);
      map.get(a.date)!.push(a);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0,
    );
  }, [availableSlots]);

  const bookSlot = (avail: PoseurAvailability) => {
    if (!selectedDossierId) {
      alert("Sélectionne d'abord un dossier à planifier dans la colonne de gauche.");
      return;
    }
    const key = avail.id;
    setPendingKey(key);
    const scheduledAt = new Date(`${avail.date}T${SLOT_HOURS[avail.slot]}:00`).toISOString();
    startTransition(async () => {
      const r = await bookAvailabilityAction(key, selectedDossierId, scheduledAt);
      setPendingKey(null);
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      // Refresh via revalidatePath côté serveur — un simple reload complète
      window.location.reload();
    });
  };

  const selectedDossier = selectedDossierId
    ? dossierById.get(selectedDossierId) ?? null
    : null;

  if (collapsed) {
    return (
      <section className="px-8 pt-6">
        <button
          onClick={() => setCollapsed(false)}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-violet-strong hover:underline"
        >
          <CalendarDays className="h-3.5 w-3.5" /> Ouvrir le planificateur de poses
        </button>
      </section>
    );
  }

  return (
    <section className="px-8 pt-6 pb-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-3">
            <ColorChip tone="violet" size="md">
              <CalendarDays className="h-4 w-4" strokeWidth={2.4} />
            </ColorChip>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Planificateur de poses</h2>
              <p className="text-[12px] text-muted mt-0.5">
                Sélectionne un dossier à gauche, puis clique sur un créneau de dispo à droite.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {poseurs.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAdminModal(true)}
              >
                <CalendarPlus className="h-3.5 w-3.5" strokeWidth={2.4} />
                Ajouter des dispos
              </Button>
            )}
            <button
              onClick={() => setCollapsed(true)}
              className="text-muted-2 hover:text-ink"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
          {/* Dossiers en attente */}
          <div>
            <p className="eyebrow mb-2">
              À planifier · {awaitingDossiers.length}
            </p>
            {awaitingDossiers.length === 0 ? (
              <div className="text-[12.5px] text-muted-2 text-center py-8 border border-dashed border-line rounded-md">
                Aucun dossier prêt à planifier.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[420px] overflow-auto">
                {awaitingDossiers.map((d) => {
                  const active = selectedDossierId === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() =>
                        setSelectedDossierId(active ? null : d.id)
                      }
                      className={
                        "w-full text-left p-3 rounded-md border transition-colors " +
                        (active
                          ? "border-violet bg-violet-soft/40"
                          : "border-line hover:border-line-strong bg-white")
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-ink truncate">
                            {d.client_name ?? "—"}
                          </p>
                          <p className="text-[11px] text-muted-2 font-mono mt-0.5 truncate">
                            {d.number}
                            {d.devis_number ? ` · ${d.devis_number}` : ""}
                          </p>
                          {d.client_city && (
                            <p className="text-[11px] text-muted mt-1 inline-flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5" />
                              {d.client_city}
                            </p>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-muted-2 tabular-nums shrink-0">
                          {eur(d.total_ttc)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Créneaux poseurs */}
          <div>
            <p className="eyebrow mb-2">
              Créneaux poseurs disponibles · 30 jours
            </p>
            {byDate.length === 0 ? (
              <div className="text-[12.5px] text-muted-2 text-center py-8 border border-dashed border-line rounded-md">
                Aucun créneau de dispo déclaré par les poseurs.
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-auto pr-2">
                {byDate.map(([date, slots]) => {
                  const d = new Date(date + "T00:00:00");
                  const dayLabel = d.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  });
                  return (
                    <div key={date}>
                      <p className="text-[11.5px] font-semibold text-muted-2 uppercase tracking-wider mb-1.5 sticky top-0 bg-white py-1">
                        {dayLabel}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {slots.map((s) => {
                          const isPending = pendingKey === s.id;
                          const canBook = Boolean(selectedDossierId);
                          return (
                            <button
                              key={s.id}
                              onClick={() => bookSlot(s)}
                              disabled={pending || !canBook}
                              className={
                                "p-2 rounded-md border transition-colors text-left " +
                                (canBook
                                  ? "border-emerald bg-emerald-soft/40 hover:bg-emerald-soft/70"
                                  : "border-line bg-white opacity-70 cursor-not-allowed")
                              }
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[12px] font-semibold text-ink">
                                  {s.poseur_name ?? "?"}
                                </span>
                                <StatusPill tone="emerald">
                                  {SLOT_LABELS[s.slot]}
                                </StatusPill>
                              </div>
                              {isPending && (
                                <p className="text-[11px] text-muted inline-flex items-center gap-1 mt-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Réservation…
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {selectedDossier && (
          <div className="mt-4 p-3 rounded-md bg-violet-soft/40 border border-violet/20 text-[12.5px] flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-violet-strong" />
            <span>
              <strong>{selectedDossier.client_name}</strong> · {selectedDossier.number} —
              choisis un créneau vert à droite.
            </span>
          </div>
        )}
      </Card>

      {adminModal && (
        <AdminAvailabilityModal
          poseurs={poseurs}
          allAvailabilities={availabilities}
          onClose={() => setAdminModal(false)}
        />
      )}
    </section>
  );
}
