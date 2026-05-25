"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Pencil, X, Check, MapPin, Phone, Mail, Hammer, Scissors } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import type { Poseur, Atelier } from "@/lib/db/equipe";
import {
  createPoseurAction,
  updatePoseurAction,
  deletePoseurAction,
  createAtelierAction,
  updateAtelierAction,
  deleteAtelierAction,
} from "@/app/(platform)/parametres/equipe-actions";

export function EquipeTab({
  initialPoseurs,
  initialAteliers,
}: {
  initialPoseurs: Poseur[];
  initialAteliers: Atelier[];
}) {
  const [poseurs, setPoseurs] = useState(initialPoseurs);
  const [ateliers, setAteliers] = useState(initialAteliers);

  return (
    <div className="space-y-8">
      <PoseursSection poseurs={poseurs} onChange={setPoseurs} />
      <AteliersSection ateliers={ateliers} onChange={setAteliers} />
    </div>
  );
}

// ──────────────────────────── POSEURS ────────────────────────────

function PoseursSection({
  poseurs,
  onChange,
}: {
  poseurs: Poseur[];
  onChange: (next: Poseur[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleAdd = (input: Parameters<typeof createPoseurAction>[0]) => {
    startTransition(async () => {
      const r = await createPoseurAction(input);
      if (r.ok && r.id) {
        onChange([
          ...poseurs,
          {
            id: r.id,
            name: input.name,
            phone: input.phone ?? null,
            email: input.email ?? null,
            zone: input.zone ?? null,
            internal: input.internal ?? true,
            active: true,
            notes: null,
            profile_id: null,
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

  const handleUpdate = (id: string, patch: Parameters<typeof updatePoseurAction>[1]) => {
    startTransition(async () => {
      const r = await updatePoseurAction(id, patch);
      if (r.ok) {
        onChange(poseurs.map((p) => (p.id === id ? { ...p, ...patch } as Poseur : p)));
        setEditingId(null);
      } else {
        alert(r.message);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer ce poseur ?")) return;
    startTransition(async () => {
      const r = await deletePoseurAction(id);
      if (r.ok) onChange(poseurs.filter((p) => p.id !== id));
      else alert(r.message);
    });
  };

  return (
    <section>
      <SectionHeader
        icon={Hammer}
        title="Poseurs"
        subtitle="Équipe d'installation à domicile · interne ou sous-traitants"
        count={poseurs.length}
        action={
          <Button variant="primary" size="sm" onClick={() => setAdding(true)} disabled={adding || pending}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
            Ajouter un poseur
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {adding && (
          <PoseurFormRow
            onSave={handleAdd}
            onCancel={() => setAdding(false)}
            pending={pending}
          />
        )}
        {poseurs.length === 0 && !adding ? (
          <div className="px-5 py-10 text-center text-[13px] text-muted">
            Aucun poseur enregistré. Clique sur « Ajouter un poseur » pour commencer.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {poseurs.map((p) =>
              editingId === p.id ? (
                <PoseurFormRow
                  key={p.id}
                  initial={p}
                  onSave={(patch) => handleUpdate(p.id, patch)}
                  onCancel={() => setEditingId(null)}
                  pending={pending}
                />
              ) : (
                <PoseurRow
                  key={p.id}
                  poseur={p}
                  onEdit={() => setEditingId(p.id)}
                  onDelete={() => handleDelete(p.id)}
                  onToggleActive={() => handleUpdate(p.id, { active: !p.active })}
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

function PoseurRow({
  poseur,
  onEdit,
  onDelete,
  onToggleActive,
  disabled,
}: {
  poseur: Poseur;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  disabled: boolean;
}) {
  return (
    <li className={"px-5 py-3.5 flex items-start gap-4 " + (poseur.active ? "" : "opacity-60")}>
      <div className="h-10 w-10 rounded-lg bg-emerald-soft text-emerald inline-flex items-center justify-center shrink-0 font-semibold text-[14px]">
        {(poseur.name[0] ?? "?").toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[14px] font-semibold text-ink">{poseur.name}</p>
          <StatusPill tone={poseur.internal ? "violet" : "amber"} dot={false}>
            {poseur.internal ? "Interne" : "Sous-traitant"}
          </StatusPill>
          {!poseur.active && <StatusPill tone="muted" dot={false}>Inactif</StatusPill>}
        </div>
        <div className="flex items-center gap-4 mt-1 text-[12px] text-muted flex-wrap">
          {poseur.zone && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" strokeWidth={2.2} /> {poseur.zone}
            </span>
          )}
          {poseur.phone && (
            <a href={`tel:${poseur.phone}`} className="inline-flex items-center gap-1 hover:text-ink-2">
              <Phone className="h-3 w-3" strokeWidth={2.2} /> {poseur.phone}
            </a>
          )}
          {poseur.email && (
            <a href={`mailto:${poseur.email}`} className="inline-flex items-center gap-1 hover:text-ink-2">
              <Mail className="h-3 w-3" strokeWidth={2.2} /> {poseur.email}
            </a>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggleActive}
          disabled={disabled}
          title={poseur.active ? "Désactiver" : "Réactiver"}
          className="h-8 px-2.5 rounded-md border border-line bg-white text-[11.5px] text-muted hover:text-ink hover:border-line-strong transition-colors disabled:opacity-50"
        >
          {poseur.active ? "Désactiver" : "Réactiver"}
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

function PoseurFormRow({
  initial,
  onSave,
  onCancel,
  pending,
}: {
  initial?: Poseur;
  onSave: (input: { name: string; phone?: string; email?: string; zone?: string; internal: boolean }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [zone, setZone] = useState(initial?.zone ?? "");
  const [internal, setInternal] = useState(initial?.internal ?? true);

  return (
    <li className="px-5 py-3.5 bg-canvas-2/40 border-l-4 border-violet">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Input placeholder="Nom *" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <Input placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="Zone (ex: Bordeaux + 30km)" value={zone} onChange={(e) => setZone(e.target.value)} />
        <select
          value={internal ? "internal" : "external"}
          onChange={(e) => setInternal(e.target.value === "internal")}
          className="h-9 rounded-md border border-line bg-white px-2.5 text-[13px]"
        >
          <option value="internal">Interne</option>
          <option value="external">Sous-traitant</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={pending}>
          <X className="h-3.5 w-3.5" strokeWidth={2.2} /> Annuler
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            onSave({
              name: name.trim(),
              phone: phone.trim(),
              email: email.trim(),
              zone: zone.trim(),
              internal,
            })
          }
          disabled={pending || !name.trim()}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2.2} /> Enregistrer
        </Button>
      </div>
    </li>
  );
}

// ──────────────────────────── ATELIERS ────────────────────────────

const SPECIALTY_OPTIONS = ["rideaux", "stores", "banquettes", "coussins", "recouvrement", "vénitiens"];

function AteliersSection({
  ateliers,
  onChange,
}: {
  ateliers: Atelier[];
  onChange: (next: Atelier[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleAdd = (input: Parameters<typeof createAtelierAction>[0]) => {
    startTransition(async () => {
      const r = await createAtelierAction(input);
      if (r.ok && r.id) {
        onChange([
          ...ateliers,
          {
            id: r.id,
            name: input.name,
            contact_name: input.contact_name ?? null,
            phone: input.phone ?? null,
            email: input.email ?? null,
            city: input.city ?? null,
            postal_code: null,
            country: "France",
            address: null,
            internal: input.internal ?? false,
            specialties: input.specialties ?? [],
            capacity: null,
            active: true,
            notes: null,
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

  const handleUpdate = (id: string, patch: Parameters<typeof updateAtelierAction>[1]) => {
    startTransition(async () => {
      const r = await updateAtelierAction(id, patch);
      if (r.ok) {
        onChange(ateliers.map((a) => (a.id === id ? ({ ...a, ...patch } as Atelier) : a)));
        setEditingId(null);
      } else {
        alert(r.message);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer cet atelier ?")) return;
    startTransition(async () => {
      const r = await deleteAtelierAction(id);
      if (r.ok) onChange(ateliers.filter((a) => a.id !== id));
      else alert(r.message);
    });
  };

  return (
    <section>
      <SectionHeader
        icon={Scissors}
        title="Ateliers de confection"
        subtitle="Lieux où l'on envoie les fiches confection · interne ou sous-traitants"
        count={ateliers.length}
        action={
          <Button variant="primary" size="sm" onClick={() => setAdding(true)} disabled={adding || pending}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
            Ajouter un atelier
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {adding && (
          <AtelierFormRow
            onSave={handleAdd}
            onCancel={() => setAdding(false)}
            pending={pending}
          />
        )}
        {ateliers.length === 0 && !adding ? (
          <div className="px-5 py-10 text-center text-[13px] text-muted">
            Aucun atelier enregistré. Ajoute tes 3 ateliers principaux pour pouvoir envoyer les fiches confection.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {ateliers.map((a) =>
              editingId === a.id ? (
                <AtelierFormRow
                  key={a.id}
                  initial={a}
                  onSave={(patch) => handleUpdate(a.id, patch)}
                  onCancel={() => setEditingId(null)}
                  pending={pending}
                />
              ) : (
                <AtelierRow
                  key={a.id}
                  atelier={a}
                  onEdit={() => setEditingId(a.id)}
                  onDelete={() => handleDelete(a.id)}
                  onToggleActive={() => handleUpdate(a.id, { active: !a.active })}
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

function AtelierRow({
  atelier,
  onEdit,
  onDelete,
  onToggleActive,
  disabled,
}: {
  atelier: Atelier;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  disabled: boolean;
}) {
  return (
    <li className={"px-5 py-3.5 flex items-start gap-4 " + (atelier.active ? "" : "opacity-60")}>
      <div className="h-10 w-10 rounded-lg bg-violet-soft text-violet inline-flex items-center justify-center shrink-0">
        <Scissors className="h-4 w-4" strokeWidth={2.4} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[14px] font-semibold text-ink">{atelier.name}</p>
          <StatusPill tone={atelier.internal ? "violet" : "amber"} dot={false}>
            {atelier.internal ? "Interne" : "Sous-traitant"}
          </StatusPill>
          {!atelier.active && <StatusPill tone="muted" dot={false}>Inactif</StatusPill>}
        </div>
        <div className="flex items-center gap-4 mt-1 text-[12px] text-muted flex-wrap">
          {atelier.contact_name && <span>{atelier.contact_name}</span>}
          {atelier.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" strokeWidth={2.2} /> {atelier.city}
            </span>
          )}
          {atelier.phone && (
            <a href={`tel:${atelier.phone}`} className="inline-flex items-center gap-1 hover:text-ink-2">
              <Phone className="h-3 w-3" strokeWidth={2.2} /> {atelier.phone}
            </a>
          )}
          {atelier.email && (
            <a href={`mailto:${atelier.email}`} className="inline-flex items-center gap-1 hover:text-ink-2">
              <Mail className="h-3 w-3" strokeWidth={2.2} /> {atelier.email}
            </a>
          )}
        </div>
        {atelier.specialties && atelier.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {atelier.specialties.map((s) => (
              <span
                key={s}
                className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-canvas-2 text-muted-2 font-medium"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggleActive}
          disabled={disabled}
          className="h-8 px-2.5 rounded-md border border-line bg-white text-[11.5px] text-muted hover:text-ink hover:border-line-strong disabled:opacity-50"
        >
          {atelier.active ? "Désactiver" : "Réactiver"}
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

function AtelierFormRow({
  initial,
  onSave,
  onCancel,
  pending,
}: {
  initial?: Atelier;
  onSave: (input: {
    name: string;
    contact_name?: string;
    phone?: string;
    email?: string;
    city?: string;
    internal: boolean;
    specialties: string[];
  }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [contactName, setContactName] = useState(initial?.contact_name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [internal, setInternal] = useState(initial?.internal ?? false);
  const [specialties, setSpecialties] = useState<string[]>(initial?.specialties ?? []);

  const toggleSpec = (s: string) =>
    setSpecialties((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
    );

  return (
    <li className="px-5 py-3.5 bg-canvas-2/40 border-l-4 border-violet">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Input placeholder="Nom de l'atelier *" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <Input placeholder="Contact (personne)" value={contactName} onChange={(e) => setContactName(e.target.value)} />
        <select
          value={internal ? "internal" : "external"}
          onChange={(e) => setInternal(e.target.value === "internal")}
          className="h-9 rounded-md border border-line bg-white px-2.5 text-[13px]"
        >
          <option value="internal">Interne</option>
          <option value="external">Sous-traitant</option>
        </select>
        <Input placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="Ville" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      <div className="mt-3">
        <p className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 mb-1.5">
          Spécialités
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SPECIALTY_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSpec(s)}
              className={
                "px-2.5 h-7 rounded-full text-[11.5px] font-medium border transition-colors " +
                (specialties.includes(s)
                  ? "bg-violet text-white border-violet"
                  : "bg-white text-muted border-line hover:border-line-strong")
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={pending}>
          <X className="h-3.5 w-3.5" strokeWidth={2.2} /> Annuler
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            onSave({
              name: name.trim(),
              contact_name: contactName.trim(),
              phone: phone.trim(),
              email: email.trim(),
              city: city.trim(),
              internal,
              specialties,
            })
          }
          disabled={pending || !name.trim()}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2.2} /> Enregistrer
        </Button>
      </div>
    </li>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  count,
  action,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  subtitle: string;
  count: number;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3 flex-wrap">
      <div>
        <p className="eyebrow mb-1 inline-flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" strokeWidth={2.4} /> {title}
        </p>
        <h2 className="text-[18px] font-semibold text-ink leading-tight">
          {title}{" "}
          <span className="text-[14px] text-muted-2 tabular-nums">· {count}</span>
        </h2>
        <p className="text-[12.5px] text-muted mt-0.5">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
