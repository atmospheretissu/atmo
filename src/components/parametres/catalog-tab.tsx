"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Plus,
  Search,
  Loader2,
  Edit3,
  Trash2,
  Check,
  X,
  PackageOpen,
  EyeOff,
  Eye,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  createCatalogProductAction,
  updateCatalogProductAction,
  deleteCatalogProductAction,
  toggleCatalogProductActiveAction,
  type CatalogProductInput,
} from "@/app/(platform)/parametres/catalog-actions";

export type CatalogProduct = {
  id: string;
  ref: string;
  name: string;
  category: string;
  description: string | null;
  unit_price_ht: number;
  unit_label: string;
  width_cm: number | null;
  raccord_cm: number | null;
  is_collection: boolean;
  stock_poland: number;
  stock_ukraine: number;
  active: boolean;
};

const EMPTY: CatalogProductInput = {
  ref: "",
  name: "",
  category: "Tissu",
  description: "",
  unit_price_ht: 0,
  unit_label: "m",
  width_cm: null,
  raccord_cm: null,
  is_collection: false,
  stock_poland: 0,
  stock_ukraine: 0,
  active: true,
};

const CATEGORIES = [
  "Tissu",
  "Papier peint",
  "Rail",
  "Tringle",
  "Accessoire",
  "Pose",
  "Service",
  "Autre",
];

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n);

export function CatalogTab({
  initialProducts,
}: {
  initialProducts: CatalogProduct[];
}) {
  const [products, setProducts] = useState<CatalogProduct[]>(initialProducts);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string | "all">("all");
  const [editing, setEditing] = useState<CatalogProduct | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return products.filter((p) => {
      if (catFilter !== "all" && p.category !== catFilter) return false;
      if (!q) return true;
      return (
        p.ref.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [products, query, catFilter]);

  const handleSave = (id: string | null, input: CatalogProductInput) => {
    setError(null);
    startTransition(async () => {
      if (id) {
        const r = await updateCatalogProductAction(id, input);
        if (r.ok) {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === id
                ? {
                    ...p,
                    ...input,
                    description: input.description ?? null,
                    width_cm: input.width_cm ?? null,
                    raccord_cm: input.raccord_cm ?? null,
                    is_collection: Boolean(input.is_collection),
                    stock_poland: input.stock_poland ?? 0,
                    stock_ukraine: input.stock_ukraine ?? 0,
                    active: input.active ?? true,
                    unit_label: input.unit_label ?? "u",
                  }
                : p,
            ),
          );
          setEditing(null);
        } else {
          setError(r.message);
        }
      } else {
        const r = await createCatalogProductAction(input);
        if (r.ok) {
          setProducts((prev) => [
            {
              id: r.id,
              ...input,
              description: input.description ?? null,
              width_cm: input.width_cm ?? null,
              raccord_cm: input.raccord_cm ?? null,
              is_collection: Boolean(input.is_collection),
              stock_poland: input.stock_poland ?? 0,
              stock_ukraine: input.stock_ukraine ?? 0,
              active: input.active ?? true,
              unit_label: input.unit_label ?? "u",
            },
            ...prev,
          ]);
          setEditing(null);
        } else {
          setError(r.message);
        }
      }
    });
  };

  const handleDelete = (p: CatalogProduct) => {
    if (!confirm(`Supprimer "${p.name}" ?\nCette action est irréversible.`)) return;
    setError(null);
    startTransition(async () => {
      const r = await deleteCatalogProductAction(p.id);
      if (r.ok) setProducts((prev) => prev.filter((x) => x.id !== p.id));
      else setError(r.message);
    });
  };

  const handleToggleActive = (p: CatalogProduct) => {
    setError(null);
    startTransition(async () => {
      const r = await toggleCatalogProductActiveAction(p.id, !p.active);
      if (r.ok)
        setProducts((prev) =>
          prev.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)),
        );
      else setError(r.message);
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-2">Données · Catalogue produits</p>
          <h2 className="text-[22px] font-semibold text-ink tracking-tight">
            Produits catalogue
            <span className="ml-2 text-[15px] text-muted-2 font-medium tabular-nums">
              {products.length}
            </span>
          </h2>
          <p className="text-[12.5px] text-muted mt-1 max-w-2xl">
            Tissus, accessoires, rails, services. Référencés dans le simulateur
            (module "Produit catalogue") et utilisables sur les devis rapides.
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          disabled={pending}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[13px] font-semibold bg-ink text-white hover:bg-ink/90 disabled:opacity-40 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Ajouter un produit
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Référence, nom, description…"
            className="pl-9 h-9 w-72 rounded-md border border-line bg-white px-3 text-[13px] text-ink placeholder:text-muted-2 focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="h-9 rounded-md border border-line bg-white px-3 text-[12.5px] text-ink"
        >
          <option value="all">Toutes catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="text-[11.5px] text-muted-2">
          {filtered.length} affiché{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <div className="text-[12.5px] text-pink bg-pink-soft/40 border border-pink/30 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Form add */}
      {editing === "new" && (
        <ProductForm
          initial={EMPTY}
          onCancel={() => setEditing(null)}
          onSave={(input) => handleSave(null, input)}
          pending={pending}
          title="Nouveau produit"
        />
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <PackageOpen className="h-8 w-8 text-muted-2 mx-auto mb-3" />
            <p className="text-[13px] text-ink-2 font-medium">
              {products.length === 0
                ? "Aucun produit catalogué pour l'instant."
                : "Aucun produit ne correspond à ce filtre."}
            </p>
            {products.length === 0 && (
              <p className="text-[11.5px] text-muted-2 mt-1">
                Clique sur "Ajouter un produit" pour commencer.
              </p>
            )}
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-canvas-2/40 border-b border-line">
                <Th>Réf.</Th>
                <Th>Nom</Th>
                <Th>Catégorie</Th>
                <Th align="right">P.U. HT</Th>
                <Th>Unité</Th>
                <Th align="right">Stock PL/UA</Th>
                <Th>Actif</Th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) =>
                editing && typeof editing !== "string" && editing.id === p.id ? (
                  <tr key={p.id} className="bg-canvas-2/30 border-b border-line">
                    <td colSpan={8} className="p-3">
                      <ProductForm
                        initial={{
                          ref: p.ref,
                          name: p.name,
                          category: p.category,
                          description: p.description,
                          unit_price_ht: p.unit_price_ht,
                          unit_label: p.unit_label,
                          width_cm: p.width_cm,
                          raccord_cm: p.raccord_cm,
                          is_collection: p.is_collection,
                          stock_poland: p.stock_poland,
                          stock_ukraine: p.stock_ukraine,
                          active: p.active,
                        }}
                        onCancel={() => setEditing(null)}
                        onSave={(input) => handleSave(p.id, input)}
                        pending={pending}
                        title={`Modifier · ${p.name}`}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={p.id}
                    className={`border-b border-line last:border-0 hover:bg-canvas-2/30 transition-colors group ${
                      !p.active ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-[12px] text-muted">
                      {p.ref}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{p.name}</p>
                      {p.description && (
                        <p className="text-[11.5px] text-muted-2 mt-0.5 line-clamp-1">
                          {p.description}
                        </p>
                      )}
                      {p.is_collection && (
                        <span className="inline-flex mt-1 items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-soft text-violet-strong">
                          Collection Atmosphère
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-2">{p.category}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink tabular-nums">
                      {eur(Number(p.unit_price_ht))}
                    </td>
                    <td className="px-4 py-3 text-ink-2">{p.unit_label}</td>
                    <td className="px-4 py-3 text-right text-[11.5px] text-muted-2 tabular-nums">
                      {p.stock_poland} / {p.stock_ukraine}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(p)}
                        disabled={pending}
                        title={p.active ? "Désactiver" : "Activer"}
                        className="inline-flex items-center gap-1 text-[11.5px] font-medium"
                      >
                        {p.active ? (
                          <span className="text-emerald inline-flex items-center gap-1">
                            <Eye className="h-3 w-3" /> Visible
                          </span>
                        ) : (
                          <span className="text-muted-2 inline-flex items-center gap-1">
                            <EyeOff className="h-3 w-3" /> Masqué
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1">
                        <button
                          onClick={() => setEditing(p)}
                          disabled={pending}
                          title="Modifier"
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-2 hover:text-ink hover:bg-canvas-2"
                        >
                          <Edit3 className="h-3.5 w-3.5" strokeWidth={2.2} />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={pending}
                          title="Supprimer"
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-2 hover:text-pink hover:bg-pink-soft/40"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function ProductForm({
  initial,
  onCancel,
  onSave,
  pending,
  title,
}: {
  initial: CatalogProductInput;
  onCancel: () => void;
  onSave: (input: CatalogProductInput) => void;
  pending: boolean;
  title: string;
}) {
  const [v, setV] = useState<CatalogProductInput>(initial);
  const update = (patch: Partial<CatalogProductInput>) =>
    setV((s) => ({ ...s, ...patch }));

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13.5px] font-semibold text-ink">{title}</p>
        <button
          onClick={onCancel}
          disabled={pending}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-2 hover:text-ink hover:bg-canvas-2"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.2} />
        </button>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <FieldGroup label="Référence *" col={3}>
          <input
            value={v.ref}
            onChange={(e) => update({ ref: e.target.value })}
            placeholder="ex: TIS-LIN-NAT"
            className="form-input"
          />
        </FieldGroup>
        <FieldGroup label="Nom *" col={5}>
          <input
            value={v.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="ex: Lin naturel laize 280"
            className="form-input"
          />
        </FieldGroup>
        <FieldGroup label="Catégorie" col={2}>
          <select
            value={v.category}
            onChange={(e) => update({ category: e.target.value })}
            className="form-input"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup label="Unité" col={2}>
          <select
            value={v.unit_label ?? "u"}
            onChange={(e) => update({ unit_label: e.target.value })}
            className="form-input"
          >
            <option value="u">unité</option>
            <option value="m">mètre</option>
            <option value="m²">m²</option>
            <option value="rouleau">rouleau</option>
            <option value="forfait">forfait</option>
            <option value="h">heure</option>
          </select>
        </FieldGroup>

        <FieldGroup label="P.U. HT (€) *" col={3}>
          <input
            type="number"
            step="0.01"
            min={0}
            value={v.unit_price_ht || ""}
            onChange={(e) => update({ unit_price_ht: Number(e.target.value) || 0 })}
            className="form-input"
          />
        </FieldGroup>
        <FieldGroup label="Largeur (cm)" col={2}>
          <input
            type="number"
            step="1"
            min={0}
            value={v.width_cm ?? ""}
            onChange={(e) =>
              update({ width_cm: e.target.value === "" ? null : Number(e.target.value) })
            }
            placeholder="—"
            className="form-input"
          />
        </FieldGroup>
        <FieldGroup label="Raccord (cm)" col={2}>
          <input
            type="number"
            step="1"
            min={0}
            value={v.raccord_cm ?? ""}
            onChange={(e) =>
              update({ raccord_cm: e.target.value === "" ? null : Number(e.target.value) })
            }
            placeholder="—"
            className="form-input"
          />
        </FieldGroup>
        <FieldGroup label="Stock Pologne" col={2}>
          <input
            type="number"
            min={0}
            value={v.stock_poland ?? 0}
            onChange={(e) => update({ stock_poland: Number(e.target.value) || 0 })}
            className="form-input"
          />
        </FieldGroup>
        <FieldGroup label="Stock Ukraine" col={3}>
          <input
            type="number"
            min={0}
            value={v.stock_ukraine ?? 0}
            onChange={(e) => update({ stock_ukraine: Number(e.target.value) || 0 })}
            className="form-input"
          />
        </FieldGroup>

        <FieldGroup label="Description" col={12}>
          <textarea
            rows={2}
            value={v.description ?? ""}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Notes, composition, conseil pose…"
            className="form-input resize-none"
          />
        </FieldGroup>

        <div className="col-span-12 flex items-center gap-4 flex-wrap">
          <label className="inline-flex items-center gap-2 text-[12.5px] cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(v.is_collection)}
              onChange={(e) => update({ is_collection: e.target.checked })}
              className="h-4 w-4 rounded border-line-strong accent-violet"
            />
            Collection Atmosphère
          </label>
          <label className="inline-flex items-center gap-2 text-[12.5px] cursor-pointer">
            <input
              type="checkbox"
              checked={v.active ?? true}
              onChange={(e) => update({ active: e.target.checked })}
              className="h-4 w-4 rounded border-line-strong accent-violet"
            />
            Produit actif (visible dans le simulateur)
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-line">
        <button
          onClick={onCancel}
          disabled={pending}
          className="h-8 px-3 rounded-md text-[12px] font-medium text-muted hover:text-ink-2 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={() => onSave(v)}
          disabled={pending || !v.ref.trim() || !v.name.trim()}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold bg-ink text-white hover:bg-ink/90 disabled:opacity-40 transition-colors"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
          ) : (
            <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
          )}
          Enregistrer
        </button>
      </div>

      <style jsx>{`
        :global(.form-input) {
          display: flex;
          height: 36px;
          width: 100%;
          border-radius: 6px;
          border: 1px solid var(--color-line-strong);
          background: #fff;
          padding: 0 0.75rem;
          font-size: 13px;
          color: var(--color-ink);
        }
        :global(textarea.form-input) {
          height: auto;
          padding: 0.5rem 0.75rem;
        }
        :global(.form-input:focus) {
          outline: none;
          border-color: var(--color-violet);
          box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15);
        }
      `}</style>
    </Card>
  );
}

function FieldGroup({
  label,
  children,
  col,
}: {
  label: string;
  children: React.ReactNode;
  col: number;
}) {
  const colClass: Record<number, string> = {
    2: "col-span-12 md:col-span-2",
    3: "col-span-12 md:col-span-3",
    4: "col-span-12 md:col-span-4",
    5: "col-span-12 md:col-span-5",
    6: "col-span-12 md:col-span-6",
    12: "col-span-12",
  };
  return (
    <div className={colClass[col] ?? "col-span-12"}>
      <label className="block text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={
        "px-4 py-2.5 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 " +
        (align === "right" ? "text-right" : "text-left")
      }
    >
      {children}
    </th>
  );
}
