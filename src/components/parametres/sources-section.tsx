"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Pencil, X, Check, Tag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { sourceColorToTone, type Source } from "@/lib/db/sources-shared";
import type { StatusTone } from "@/components/ui/status-pill";
import {
  createSourceAction,
  updateSourceAction,
  deleteSourceAction,
} from "@/app/(platform)/parametres/sources-actions";

const COLORS: Array<{ key: string; tone: StatusTone }> = [
  { key: "neutral", tone: "neutral" },
  { key: "orange", tone: "orange" },
  { key: "amber", tone: "amber" },
  { key: "blue", tone: "blue" },
  { key: "violet", tone: "violet" },
  { key: "pink", tone: "pink" },
  { key: "emerald", tone: "emerald" },
  { key: "yellow", tone: "yellow" },
  { key: "muted", tone: "muted" },
];

export function SourcesSection({ initialSources }: { initialSources: Source[] }) {
  const [sources, setSources] = useState(initialSources);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleAdd = (input: { label: string; color: string }) => {
    startTransition(async () => {
      const r = await createSourceAction(input);
      if (r.ok && r.id) {
        setSources([
          ...sources,
          {
            id: r.id,
            key: input.label.toLowerCase().replace(/\s+/g, "_"),
            label: input.label,
            color: input.color,
            active: true,
            position: sources.length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
        setAdding(false);
      } else if (!r.ok) {
        alert(r.message);
      }
    });
  };

  const handleUpdate = (id: string, patch: { label?: string; color?: string; active?: boolean }) => {
    startTransition(async () => {
      const r = await updateSourceAction(id, patch);
      if (r.ok) {
        setSources(sources.map((s) => (s.id === id ? { ...s, ...patch } as Source : s)));
        setEditingId(null);
      } else {
        alert(r.message);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer cette source ?")) return;
    startTransition(async () => {
      const r = await deleteSourceAction(id);
      if (r.ok) setSources(sources.filter((s) => s.id !== id));
      else alert(r.message);
    });
  };

  return (
    <section>
      <div className="flex items-end justify-between gap-4 mb-3 flex-wrap">
        <div>
          <p className="eyebrow mb-1 inline-flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" strokeWidth={2.4} /> Sources de devis
          </p>
          <h2 className="text-[18px] font-semibold text-ink leading-tight">
            Sources{" "}
            <span className="text-[14px] text-muted-2 tabular-nums">· {sources.length}</span>
          </h2>
          <p className="text-[12.5px] text-muted mt-0.5">
            Étiquettes affichées sur les devis (Magasin, Leroy Merlin, Saint Maclou, +autres)
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setAdding(true)}
          disabled={adding || pending}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
          Ajouter une source
        </Button>
      </div>

      <Card className="overflow-hidden">
        {adding && (
          <SourceFormRow onSave={handleAdd} onCancel={() => setAdding(false)} pending={pending} />
        )}
        {sources.length === 0 && !adding ? (
          <div className="px-5 py-10 text-center text-[13px] text-muted">
            Aucune source enregistrée.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {sources.map((s) =>
              editingId === s.id ? (
                <SourceFormRow
                  key={s.id}
                  initial={s}
                  onSave={(patch) => handleUpdate(s.id, patch)}
                  onCancel={() => setEditingId(null)}
                  pending={pending}
                />
              ) : (
                <SourceRow
                  key={s.id}
                  source={s}
                  onEdit={() => setEditingId(s.id)}
                  onDelete={() => handleDelete(s.id)}
                  onToggleActive={() => handleUpdate(s.id, { active: !s.active })}
                  disabled={pending}
                />
              ),
            )}
          </ul>
        )}
      </Card>
    </section>
  );
}

function SourceRow({
  source,
  onEdit,
  onDelete,
  onToggleActive,
  disabled,
}: {
  source: Source;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  disabled: boolean;
}) {
  const tone = sourceColorToTone(source.color);
  return (
    <li className={"px-5 py-3 flex items-center gap-4 " + (source.active ? "" : "opacity-60")}>
      <div className="shrink-0">
        <StatusPill tone={tone} dot={false}>
          {source.label}
        </StatusPill>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11.5px] text-muted-2 font-mono truncate">{source.key}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggleActive}
          disabled={disabled}
          className="h-8 px-2.5 rounded-md border border-line bg-white text-[11.5px] text-muted hover:text-ink hover:border-line-strong disabled:opacity-50"
        >
          {source.active ? "Désactiver" : "Réactiver"}
        </button>
        <button
          onClick={onEdit}
          disabled={disabled}
          title="Modifier"
          className="h-8 w-8 rounded-md text-muted hover:text-ink hover:bg-canvas-2 inline-flex items-center justify-center disabled:opacity-50"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
        </button>
        <button
          onClick={onDelete}
          disabled={disabled}
          title="Supprimer"
          className="h-8 w-8 rounded-md text-muted-2 hover:text-pink hover:bg-pink-soft/40 inline-flex items-center justify-center disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
        </button>
      </div>
    </li>
  );
}

function SourceFormRow({
  initial,
  onSave,
  onCancel,
  pending,
}: {
  initial?: Source;
  onSave: (input: { label: string; color: string }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [color, setColor] = useState(initial?.color ?? "muted");

  return (
    <li className="px-5 py-3 bg-canvas-2/40 border-l-4 border-violet">
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          autoFocus
          placeholder="Nom (ex: Saint Maclou)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setColor(c.key)}
              className={
                "h-6 w-6 rounded-md border-2 transition-all " +
                (color === c.key ? "border-ink scale-110" : "border-transparent")
              }
              title={c.key}
            >
              <StatusPill tone={c.tone} dot={false}>
                <span className="block w-2 h-2" />
              </StatusPill>
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={pending}>
            <X className="h-3.5 w-3.5" strokeWidth={2.2} /> Annuler
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onSave({ label: label.trim(), color })}
            disabled={pending || !label.trim()}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.2} /> Enregistrer
          </Button>
        </div>
      </div>
    </li>
  );
}
