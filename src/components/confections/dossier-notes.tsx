"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Send, Loader2, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  addDossierNoteAction,
  deleteDossierNoteAction,
} from "@/app/(platform)/confections/actions";

export type DossierNoteVM = {
  id: string;
  body: string;
  created_at: string;
  author_name: string | null;
  kind: string;
};

export function DossierNotesCard({
  dossierId,
  notes: initialNotes,
}: {
  dossierId: string;
  notes: DossierNoteVM[];
}) {
  const [notes, setNotes] = useState<DossierNoteVM[]>(initialNotes);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const r = await addDossierNoteAction(dossierId, trimmed);
      if (r.ok) {
        // Insertion optimiste : on remet la note en tête en attendant le revalidate
        setNotes((prev) => [
          {
            id: r.id,
            body: trimmed,
            created_at: new Date().toISOString(),
            author_name: "Moi",
            kind: "internal",
          },
          ...prev,
        ]);
        setBody("");
      } else {
        setError(r.message);
      }
    });
  };

  const remove = (id: string) => {
    if (!confirm("Supprimer cette note ?")) return;
    startTransition(async () => {
      const r = await deleteDossierNoteAction(id, dossierId);
      if (r.ok) setNotes((prev) => prev.filter((n) => n.id !== id));
      else setError(r.message);
    });
  };

  return (
    <Card className="p-5">
      <p className="eyebrow mb-3 inline-flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.4} /> Notes & commentaires
      </p>

      <div className="space-y-2.5">
        <textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Note interne, point de vigilance, message pour l'équipe…"
          disabled={pending}
          className="w-full rounded-md border border-line bg-white px-3 py-2 text-[12.5px] text-ink placeholder:text-muted-2 focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15 resize-none"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10.5px] text-muted-2">
            Visible uniquement par l'équipe Atmosphère.
          </p>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !body.trim()}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11.5px] font-semibold bg-violet text-white hover:bg-violet-strong disabled:opacity-40 transition-colors"
          >
            {pending ? (
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.4} />
            ) : (
              <Send className="h-3 w-3" strokeWidth={2.4} />
            )}
            Publier
          </button>
        </div>
        {error && (
          <p className="text-[11.5px] text-pink bg-pink-soft/40 border border-pink/30 rounded px-2 py-1">
            {error}
          </p>
        )}
      </div>

      {notes.length > 0 && (
        <div className="mt-4 border-t border-line -mx-5 pt-3 px-5 space-y-3 max-h-[400px] overflow-y-auto">
          {notes.map((n) => (
            <div key={n.id} className="group flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[11px] text-muted-2 mb-1">
                  <span className="font-semibold text-ink-2">
                    {n.author_name ?? "Atmosphère"}
                  </span>
                  <span>·</span>
                  <span>{formatNoteDate(n.created_at)}</span>
                </div>
                <p className="text-[12.5px] text-ink-2 leading-snug whitespace-pre-wrap">
                  {n.body}
                </p>
              </div>
              <button
                onClick={() => remove(n.id)}
                disabled={pending}
                title="Supprimer"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-2 hover:text-pink hover:bg-pink-soft/40 disabled:opacity-40"
              >
                <Trash2 className="h-3 w-3" strokeWidth={2.2} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function formatNoteDate(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
