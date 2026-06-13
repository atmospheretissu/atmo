"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Pencil, X, Check, Building2, MapPin, Phone, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { storeColorToTone, storeInitials, type Store } from "@/lib/db/stores-shared";
import {
  createStoreAction,
  updateStoreAction,
  deleteStoreAction,
} from "@/app/(platform)/parametres/stores-actions";

const COLORS = ["violet", "emerald", "blue", "pink", "amber", "orange", "yellow", "neutral"] as const;

const COLOR_BG: Record<string, string> = {
  violet: "bg-violet text-white",
  emerald: "bg-emerald text-white",
  blue: "bg-blue text-white",
  pink: "bg-pink text-white",
  amber: "bg-amber text-white",
  orange: "bg-orange text-white",
  yellow: "bg-yellow text-ink",
  neutral: "bg-ink text-white",
};

export function StoresSection({ initialStores }: { initialStores: Store[] }) {
  const [stores, setStores] = useState(initialStores);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleAdd = (input: Parameters<typeof createStoreAction>[0]) => {
    startTransition(async () => {
      const r = await createStoreAction(input);
      if (r.ok && r.id) {
        setStores([
          ...stores,
          {
            id: r.id,
            slug: input.name.toLowerCase().replace(/\s+/g, "_"),
            name: input.name,
            short_name: input.short_name ?? null,
            city: input.city ?? null,
            postal_code: input.postal_code ?? null,
            address: input.address ?? null,
            phone: input.phone ?? null,
            email: input.email ?? null,
            color: input.color ?? "violet",
            active: true,
            position: stores.length,
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

  const handleUpdate = (id: string, patch: Parameters<typeof updateStoreAction>[1]) => {
    startTransition(async () => {
      const r = await updateStoreAction(id, patch);
      if (r.ok) {
        setStores(stores.map((s) => (s.id === id ? ({ ...s, ...patch } as Store) : s)));
        setEditingId(null);
      } else {
        alert(r.message);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer ce magasin ?")) return;
    startTransition(async () => {
      const r = await deleteStoreAction(id);
      if (r.ok) setStores(stores.filter((s) => s.id !== id));
      else alert(r.message);
    });
  };

  return (
    <section>
      <div className="flex items-end justify-between gap-4 mb-3 flex-wrap">
        <div>
          <p className="eyebrow mb-1 inline-flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" strokeWidth={2.4} /> Magasins
          </p>
          <h2 className="text-[18px] font-semibold text-ink leading-tight">
            Entités magasin{" "}
            <span className="text-[14px] text-muted-2 tabular-nums">· {stores.length}</span>
          </h2>
          <p className="text-[12.5px] text-muted mt-0.5">
            Chaque magasin a ses propres devis, factures, dossiers et caisse. Config,
            templates et articles restent partagés entre tous les magasins.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setAdding(true)}
          disabled={adding || pending}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
          Ajouter un magasin
        </Button>
      </div>

      <Card className="overflow-hidden">
        {adding && (
          <StoreFormRow onSave={handleAdd} onCancel={() => setAdding(false)} pending={pending} />
        )}
        {stores.length === 0 && !adding ? (
          <div className="px-5 py-10 text-center text-[13px] text-muted">
            Aucun magasin enregistré.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {stores.map((s) =>
              editingId === s.id ? (
                <StoreFormRow
                  key={s.id}
                  initial={s}
                  onSave={(patch) => handleUpdate(s.id, patch)}
                  onCancel={() => setEditingId(null)}
                  pending={pending}
                />
              ) : (
                <StoreRow
                  key={s.id}
                  store={s}
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

function StoreRow({
  store,
  onEdit,
  onDelete,
  onToggleActive,
  disabled,
}: {
  store: Store;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  disabled: boolean;
}) {
  const tone = storeColorToTone(store.color);
  return (
    <li className={"px-5 py-3.5 flex items-start gap-4 " + (store.active ? "" : "opacity-60")}>
      <div
        className={
          "h-10 w-10 rounded-lg inline-flex items-center justify-center shrink-0 font-semibold text-[14px] " +
          (COLOR_BG[tone] ?? "bg-ink text-white")
        }
      >
        {storeInitials(store)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[14px] font-semibold text-ink">{store.name}</p>
          {!store.active && (
            <StatusPill tone="muted" dot={false}>
              Inactif
            </StatusPill>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1 text-[12px] text-muted flex-wrap">
          {store.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" strokeWidth={2.2} /> {store.city}
            </span>
          )}
          {store.phone && (
            <a href={`tel:${store.phone}`} className="inline-flex items-center gap-1 hover:text-ink-2">
              <Phone className="h-3 w-3" strokeWidth={2.2} /> {store.phone}
            </a>
          )}
          {store.email && (
            <a href={`mailto:${store.email}`} className="inline-flex items-center gap-1 hover:text-ink-2">
              <Mail className="h-3 w-3" strokeWidth={2.2} /> {store.email}
            </a>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggleActive}
          disabled={disabled}
          className="h-8 px-2.5 rounded-md border border-line bg-white text-[11.5px] text-muted hover:text-ink hover:border-line-strong disabled:opacity-50"
        >
          {store.active ? "Désactiver" : "Réactiver"}
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

function StoreFormRow({
  initial,
  onSave,
  onCancel,
  pending,
}: {
  initial?: Store;
  onSave: (input: {
    name: string;
    short_name?: string;
    city?: string;
    postal_code?: string;
    address?: string;
    phone?: string;
    email?: string;
    color: string;
  }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [shortName, setShortName] = useState(initial?.short_name ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [postalCode, setPostalCode] = useState(initial?.postal_code ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [color, setColor] = useState(initial?.color ?? "violet");

  return (
    <li className="px-5 py-3.5 bg-canvas-2/40 border-l-4 border-violet">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
        <Input
          autoFocus
          placeholder="Nom (ex: Atmosphère)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          placeholder="Nom court (ex: Marquette)"
          value={shortName}
          onChange={(e) => setShortName(e.target.value)}
        />
        <Input placeholder="Ville" value={city} onChange={(e) => setCity(e.target.value)} />
        <Input
          placeholder="Code postal"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
        />
        <Input
          placeholder="Adresse"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <Input
          placeholder="Téléphone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="sm:col-span-2"
        />
      </div>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 mb-1.5">
            Couleur d'identification
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={
                  "h-7 w-7 rounded-md transition-all " +
                  (COLOR_BG[c] ?? "bg-ink text-white") +
                  (color === c ? " ring-2 ring-ink ring-offset-2 scale-105" : "")
                }
                title={c}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={pending}>
            <X className="h-3.5 w-3.5" strokeWidth={2.2} /> Annuler
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              onSave({
                name: name.trim(),
                short_name: shortName.trim(),
                city: city.trim(),
                postal_code: postalCode.trim(),
                address: address.trim(),
                phone: phone.trim(),
                email: email.trim(),
                color,
              })
            }
            disabled={pending || !name.trim()}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.2} /> Enregistrer
          </Button>
        </div>
      </div>
    </li>
  );
}
