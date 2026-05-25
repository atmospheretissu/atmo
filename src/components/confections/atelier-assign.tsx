"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Send, CheckCircle2, Scissors, ChevronDown, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { assignAtelierToDossierAction } from "@/app/(platform)/parametres/equipe-actions";
import type { Atelier } from "@/lib/db/equipe";

type AssignedAtelier = {
  id: string;
  name: string;
  contact_name: string | null;
  city: string | null;
  internal: boolean;
};

export function AtelierAssignCard({
  dossierId,
  ateliers,
  currentAtelier,
  sentAt,
}: {
  dossierId: string;
  ateliers: Atelier[];
  currentAtelier: AssignedAtelier | null;
  sentAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [assigned, setAssigned] = useState<AssignedAtelier | null>(currentAtelier);
  const [assignedAt, setAssignedAt] = useState<string | null>(sentAt);

  const handleAssign = (a: Atelier) => {
    startTransition(async () => {
      const r = await assignAtelierToDossierAction(dossierId, a.id);
      if (r.ok) {
        setAssigned({
          id: a.id,
          name: a.name,
          contact_name: a.contact_name,
          city: a.city,
          internal: a.internal,
        });
        setAssignedAt(new Date().toISOString());
        setOpen(false);
      } else {
        alert(r.message);
      }
    });
  };

  const handleUnassign = () => {
    if (!confirm("Retirer l'assignation à l'atelier ?")) return;
    startTransition(async () => {
      const r = await assignAtelierToDossierAction(dossierId, null);
      if (r.ok) {
        setAssigned(null);
        setAssignedAt(null);
      } else {
        alert(r.message);
      }
    });
  };

  const activeAteliers = ateliers.filter((a) => a.active);

  return (
    <Card className="p-5">
      <p className="eyebrow mb-3 inline-flex items-center gap-1.5">
        <Scissors className="h-3.5 w-3.5" strokeWidth={2.4} /> Atelier de confection
      </p>

      {assigned ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-soft text-violet inline-flex items-center justify-center shrink-0">
              <Scissors className="h-4 w-4" strokeWidth={2.4} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[14px] font-semibold text-ink">{assigned.name}</p>
                <StatusPill tone={assigned.internal ? "violet" : "amber"} dot={false}>
                  {assigned.internal ? "Interne" : "Sous-traitant"}
                </StatusPill>
              </div>
              {assigned.contact_name && (
                <p className="text-[12px] text-muted mt-0.5">{assigned.contact_name}</p>
              )}
              {assigned.city && (
                <p className="text-[12px] text-muted-2 mt-0.5">{assigned.city}</p>
              )}
            </div>
          </div>
          {assignedAt && (
            <p className="text-[11.5px] text-emerald inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" strokeWidth={2.4} />
              Envoyée le {new Date(assignedAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOpen((v) => !v)}
              disabled={pending}
            >
              Changer d'atelier
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUnassign}
              disabled={pending}
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.2} />
              Retirer
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[12.5px] text-muted">
            Cette fiche n'est assignée à aucun atelier. Envoie-la pour démarrer la confection.
          </p>
          <Button
            variant="accent"
            size="sm"
            onClick={() => setOpen((v) => !v)}
            disabled={pending || activeAteliers.length === 0}
          >
            <Send className="h-3.5 w-3.5" strokeWidth={2.2} />
            Envoyer à un atelier
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.2} />
          </Button>
          {activeAteliers.length === 0 && (
            <p className="text-[11.5px] text-amber">
              Aucun atelier actif.{" "}
              <Link href="/parametres" className="underline">
                Ajoute-en un dans Paramètres → Équipe
              </Link>
              .
            </p>
          )}
        </div>
      )}

      {/* Liste sélection */}
      {open && activeAteliers.length > 0 && (
        <div className="mt-4 border-t border-line pt-3 -mx-5 px-5 space-y-1.5">
          <p className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 mb-2">
            Choisis un atelier ({activeAteliers.length} disponible{activeAteliers.length > 1 ? "s" : ""})
          </p>
          {activeAteliers.map((a) => (
            <button
              key={a.id}
              onClick={() => handleAssign(a)}
              disabled={pending}
              className={
                "w-full text-left px-3 py-2.5 rounded-lg border border-line hover:border-violet hover:bg-violet-soft/30 transition-colors flex items-center gap-3 disabled:opacity-50 " +
                (assigned?.id === a.id ? "border-violet bg-violet-soft/40" : "")
              }
            >
              <div className="h-8 w-8 rounded-md bg-violet-soft text-violet inline-flex items-center justify-center shrink-0">
                <Scissors className="h-3.5 w-3.5" strokeWidth={2.4} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[13px] font-semibold text-ink">{a.name}</p>
                  <StatusPill tone={a.internal ? "violet" : "amber"} dot={false}>
                    {a.internal ? "Interne" : "Sous-traitant"}
                  </StatusPill>
                </div>
                <p className="text-[11.5px] text-muted-2 mt-0.5">
                  {a.city ?? "—"}
                  {a.specialties && a.specialties.length > 0 && (
                    <span> · {a.specialties.join(", ")}</span>
                  )}
                </p>
              </div>
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 text-muted-2 animate-spin" strokeWidth={2.2} />
              ) : assigned?.id === a.id ? (
                <CheckCircle2 className="h-4 w-4 text-violet" strokeWidth={2.4} />
              ) : null}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
