"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
  Download,
  Upload,
  CheckSquare,
  Square,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  createCatalogProductAction,
  updateCatalogProductAction,
  deleteCatalogProductAction,
  toggleCatalogProductActiveAction,
  searchCatalogPageAction,
  bulkUpdateCatalogAction,
  bulkDeleteCatalogAction,
  previewCsvImportAction,
  commitCsvImportAction,
  type CatalogProductInput,
  type ImportPreview,
} from "@/app/(platform)/parametres/catalog-actions";

export type CatalogProduct = {
  id: string;
  ref: string;
  name: string;
  category: string;
  description: string | null;
  unit_price_ht: number | null;
  unit_label: string;
  width_cm: number | null;
  raccord_cm: number | null;
  is_collection: boolean;
  stock_poland: number;
  stock_ukraine: number;
  active: boolean;
  supplier_name: string | null;
  catalog_source: "atmo" | "external";
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
  supplier_name: "",
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

const PAGE_SIZE = 50;

export function CatalogTab({
  initialProducts,
  initialTotal,
  initialCategories,
}: {
  initialProducts: CatalogProduct[];
  initialTotal?: number;
  initialCategories?: string[];
}) {
  const [products, setProducts] = useState<CatalogProduct[]>(initialProducts);
  const [total, setTotal] = useState<number>(initialTotal ?? initialProducts.length);
  const [page, setPage] = useState(0);
  const dynamicCategories = useMemo(
    () =>
      Array.from(
        new Set([...(initialCategories ?? []), ...CATEGORIES]),
      ).sort((a, b) => a.localeCompare(b, "fr")),
    [initialCategories],
  );
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string | "all">("all");
  const [supplierFilter, setSupplierFilter] = useState<string | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "atmo" | "external">(
    "all",
  );
  const [suppliersList, setSuppliersList] = useState<string[]>([]);
  const [editing, setEditing] = useState<CatalogProduct | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  // Server-side search/pagination — la table fait 45k+ lignes, pas de filtre
  // client side.
  const filtered = products;

  // Debounce search + filter change → re-fetch côté serveur
  useEffect(() => {
    const t = setTimeout(() => {
      startTransition(async () => {
        const r = await searchCatalogPageAction({
          q: query,
          category: catFilter === "all" ? null : catFilter,
          supplier: supplierFilter === "all" ? null : supplierFilter,
          source: sourceFilter === "all" ? null : sourceFilter,
          page,
          pageSize: PAGE_SIZE,
        });
        setProducts(r.products);
        setTotal(r.total);
        if (r.suppliers) setSuppliersList(r.suppliers);
      });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, catFilter, supplierFilter, sourceFilter, page]);

  // Reset page sur changement de filtre
  useEffect(() => {
    setPage(0);
  }, [query, catFilter, supplierFilter, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
              supplier_name: input.supplier_name ?? null,
              catalog_source: input.is_collection ? "atmo" : "external",
            } satisfies CatalogProduct,
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
              {total.toLocaleString("fr-FR")}
            </span>
          </h2>
          <p className="text-[12.5px] text-muted mt-1 max-w-2xl">
            Tissus, accessoires, rails, services. Référencés dans le simulateur
            (module "Produit catalogue") et utilisables sur les devis rapides.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={
              "/api/catalog/export" +
              (catFilter !== "all" ? `?category=${encodeURIComponent(catFilter)}` : "") +
              (query ? `${catFilter !== "all" ? "&" : "?"}q=${encodeURIComponent(query)}` : "")
            }
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[13px] font-semibold border border-line bg-white hover:border-line-strong text-ink-2 transition-colors"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={2.4} /> Exporter CSV
          </a>
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[13px] font-semibold border border-line bg-white hover:border-line-strong text-ink-2 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" strokeWidth={2.4} /> Importer CSV
          </button>
          <button
            onClick={() => setEditing("new")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[13px] font-semibold bg-ink text-white hover:bg-ink/90 disabled:opacity-40 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Ajouter un produit
          </button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-md bg-violet-soft/40 border border-violet/20">
          <span className="text-[13px] text-ink-2">
            <strong className="text-ink">{selectedIds.size}</strong> produit(s) sélectionné(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkOpen(true)}
              className="h-8 px-3 rounded-md text-[12px] font-semibold bg-ink text-white hover:bg-ink/90"
            >
              Modifier en masse
            </button>
            <button
              onClick={() => {
                if (!confirm(`Supprimer ${selectedIds.size} produit(s) ? Irréversible.`)) return;
                startTransition(async () => {
                  const r = await bulkDeleteCatalogAction(Array.from(selectedIds));
                  if (r.ok) {
                    setProducts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
                    setSelectedIds(new Set());
                  } else {
                    setError(r.message ?? "Échec suppression");
                  }
                });
              }}
              className="h-8 px-3 rounded-md text-[12px] font-semibold border border-pink text-pink hover:bg-pink hover:text-white"
            >
              Supprimer
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="h-8 px-2 text-muted hover:text-ink"
              aria-label="Désélectionner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
          {dynamicCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) =>
            setSourceFilter(e.target.value as "all" | "atmo" | "external")
          }
          className="h-9 rounded-md border border-line bg-white px-3 text-[12.5px] text-ink"
        >
          <option value="all">Toutes sources</option>
          <option value="atmo">Collection Atmosphère</option>
          <option value="external">Fournisseurs externes</option>
        </select>
        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          className="h-9 rounded-md border border-line bg-white px-3 text-[12.5px] text-ink max-w-[220px]"
          disabled={suppliersList.length === 0}
        >
          <option value="all">Tous fournisseurs</option>
          {suppliersList.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="text-[11.5px] text-muted-2">
          {filtered.length} sur {total.toLocaleString("fr-FR")}
        </span>
        {totalPages > 1 && (
          <div className="ml-auto inline-flex items-center gap-1 text-[12px]">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || pending}
              className="h-8 px-2.5 rounded-md border border-line hover:border-line-strong disabled:opacity-40"
            >
              ←
            </button>
            <span className="text-muted-2 px-1 tabular-nums">
              {page + 1} / {totalPages.toLocaleString("fr-FR")}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || pending}
              className="h-8 px-2.5 rounded-md border border-line hover:border-line-strong disabled:opacity-40"
            >
              →
            </button>
          </div>
        )}
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
                <th className="pl-4 pr-2 py-2.5 w-8">
                  <button
                    onClick={() => {
                      if (selectedIds.size === filtered.length) setSelectedIds(new Set());
                      else setSelectedIds(new Set(filtered.map((p) => p.id)));
                    }}
                    className="text-muted hover:text-ink"
                    aria-label="Tout sélectionner"
                  >
                    {selectedIds.size === filtered.length && filtered.length > 0 ? (
                      <CheckSquare className="h-4 w-4" strokeWidth={2.2} />
                    ) : (
                      <Square className="h-4 w-4" strokeWidth={2.2} />
                    )}
                  </button>
                </th>
                <Th>Réf.</Th>
                <Th>Nom</Th>
                <Th>Fournisseur</Th>
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
                    <td colSpan={10} className="p-3">
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
                          supplier_name: p.supplier_name,
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
                    } ${selectedIds.has(p.id) ? "bg-violet-soft/20" : ""}`}
                  >
                    <td className="pl-4 pr-2 py-3 w-8">
                      <button
                        onClick={() => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(p.id)) next.delete(p.id);
                            else next.add(p.id);
                            return next;
                          });
                        }}
                        className="text-muted hover:text-ink"
                        aria-label="Sélectionner"
                      >
                        {selectedIds.has(p.id) ? (
                          <CheckSquare className="h-4 w-4 text-violet" strokeWidth={2.2} />
                        ) : (
                          <Square className="h-4 w-4" strokeWidth={2.2} />
                        )}
                      </button>
                    </td>
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
                        <span className="inline-flex mt-1 mr-1 items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-soft text-violet-strong">
                          Collection Atmosphère
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-ink-2">
                      {p.supplier_name ?? (
                        <span className="text-muted-2 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-2">{p.category}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink tabular-nums">
                      {p.unit_price_ht == null ? (
                        <span className="text-muted-2 italic font-normal">
                          non défini
                        </span>
                      ) : (
                        eur(Number(p.unit_price_ht))
                      )}
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

      {importOpen && (
        <ImportCsvModal
          onClose={() => setImportOpen(false)}
          onDone={async () => {
            setImportOpen(false);
            const r = await searchCatalogPageAction({
              q: query,
              category: catFilter === "all" ? null : catFilter,
              page,
              pageSize: PAGE_SIZE,
            });
            setProducts(r.products);
            setTotal(r.total);
          }}
        />
      )}

      {bulkOpen && (
        <BulkEditModal
          count={selectedIds.size}
          onClose={() => setBulkOpen(false)}
          onApply={(patch, mult) => {
            startTransition(async () => {
              const r = await bulkUpdateCatalogAction(Array.from(selectedIds), {
                ...patch,
                ...(mult !== undefined ? { price_multiplier: mult } : {}),
              });
              if (r.ok) {
                const rr = await searchCatalogPageAction({
                  q: query,
                  category: catFilter === "all" ? null : catFilter,
                  page,
                  pageSize: PAGE_SIZE,
                });
                setProducts(rr.products);
                setTotal(rr.total);
                setSelectedIds(new Set());
                setBulkOpen(false);
              } else {
                setError(r.message ?? "Échec mise à jour en masse");
              }
            });
          }}
          pending={pending}
        />
      )}
    </div>
  );
}

function ImportCsvModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    errors: number;
  } | null>(null);

  const onFile = (file: File) => {
    setError(null);
    setPreview(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setCsvText(text);
      startTransition(async () => {
        try {
          const p = await previewCsvImportAction(text);
          setPreview(p);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Erreur d'analyse du CSV");
        }
      });
    };
    reader.readAsText(file, "utf-8");
  };

  const commit = () => {
    if (!csvText) return;
    startTransition(async () => {
      const r = await commitCsvImportAction(csvText);
      if (r.ok) {
        setResult({ created: r.created, updated: r.updated, errors: r.errors });
      } else {
        setError(r.message ?? "Erreur à l'import");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-line flex items-center justify-between">
          <div>
            <p className="text-[15px] font-semibold text-ink">Importer un CSV</p>
            <p className="text-[12px] text-muted mt-0.5">
              Colonnes : ref, name, category, description, unit_price_ht, unit_label,
              width_cm, raccord_cm, is_collection, stock_poland, stock_ukraine, active.
              Match par <strong>ref</strong>.
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-2 hover:text-ink hover:bg-canvas-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!result && (
            <>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
                className="block text-[13px]"
              />

              {pending && (
                <div className="text-[13px] text-muted inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyse en cours…
                </div>
              )}

              {error && (
                <div className="text-[12.5px] text-pink bg-pink-soft/40 border border-pink/30 rounded px-3 py-2">
                  {error}
                </div>
              )}

              {preview && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <StatBox
                      label="À créer"
                      value={preview.toCreate.length}
                      tone="emerald"
                    />
                    <StatBox
                      label="À mettre à jour"
                      value={preview.toUpdate.length}
                      tone="violet"
                    />
                    <StatBox
                      label="Erreurs"
                      value={preview.errors.length}
                      tone={preview.errors.length > 0 ? "pink" : "muted"}
                    />
                  </div>

                  {preview.errors.length > 0 && (
                    <div className="text-[12px] text-pink bg-pink-soft/30 border border-pink/20 rounded px-3 py-2 max-h-32 overflow-auto">
                      <p className="font-semibold mb-1">Erreurs détectées :</p>
                      <ul className="space-y-0.5 list-disc pl-4">
                        {preview.errors.slice(0, 20).map((e, i) => (
                          <li key={i}>
                            <span className="font-mono">L{e.line}</span>{" "}
                            {e.ref && (
                              <span className="font-mono text-ink">[{e.ref}]</span>
                            )}{" "}
                            {e.message}
                          </li>
                        ))}
                        {preview.errors.length > 20 && (
                          <li className="italic">
                            … et {preview.errors.length - 20} autres
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                    <button
                      onClick={onClose}
                      className="h-9 px-3 rounded-md text-[13px] font-semibold text-ink-2 hover:bg-canvas-2"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={commit}
                      disabled={
                        pending ||
                        preview.errors.length > 0 ||
                        (preview.toCreate.length === 0 && preview.toUpdate.length === 0)
                      }
                      className="h-9 px-4 rounded-md text-[13px] font-semibold bg-ink text-white hover:bg-ink/90 disabled:opacity-40 inline-flex items-center gap-1.5"
                    >
                      {pending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Confirmer l&apos;import
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {result && (
            <div className="space-y-3">
              <div className="p-4 rounded-md bg-emerald-soft/40 border border-emerald/30">
                <p className="text-[14px] font-semibold text-emerald-strong mb-1">
                  Import terminé
                </p>
                <p className="text-[12.5px] text-ink-2">
                  <strong>{result.created}</strong> créé(s), <strong>{result.updated}</strong>{" "}
                  mis à jour.
                  {result.errors > 0 && (
                    <>
                      {" "}
                      <span className="text-pink">
                        {result.errors} erreur(s).
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => onDone()}
                  className="h-9 px-4 rounded-md text-[13px] font-semibold bg-ink text-white hover:bg-ink/90"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "violet" | "pink" | "muted";
}) {
  const bg =
    tone === "emerald"
      ? "bg-emerald-soft/40 border-emerald/20 text-emerald-strong"
      : tone === "violet"
        ? "bg-violet-soft/40 border-violet/20 text-violet-strong"
        : tone === "pink"
          ? "bg-pink-soft/40 border-pink/20 text-pink"
          : "bg-canvas-2 border-line text-muted-2";
  return (
    <div className={`p-3 rounded-md border ${bg}`}>
      <p className="text-[10.5px] uppercase tracking-wider font-semibold opacity-70">
        {label}
      </p>
      <p className="text-[22px] font-bold tabular-nums mt-0.5">{value}</p>
    </div>
  );
}

function BulkEditModal({
  count,
  onClose,
  onApply,
  pending,
}: {
  count: number;
  onClose: () => void;
  onApply: (
    patch: {
      category?: string;
      unit_label?: string;
      active?: boolean;
      is_collection?: boolean;
    },
    priceMultiplier?: number,
  ) => void;
  pending: boolean;
}) {
  const [enCategory, setEnCategory] = useState(false);
  const [category, setCategory] = useState("Tissu");
  const [enUnit, setEnUnit] = useState(false);
  const [unit, setUnit] = useState("m");
  const [enActive, setEnActive] = useState(false);
  const [active, setActive] = useState(true);
  const [enCollection, setEnCollection] = useState(false);
  const [collection, setCollection] = useState(false);
  const [enMult, setEnMult] = useState(false);
  const [mult, setMult] = useState<number>(1);

  const submit = () => {
    const patch: {
      category?: string;
      unit_label?: string;
      active?: boolean;
      is_collection?: boolean;
    } = {};
    if (enCategory) patch.category = category;
    if (enUnit) patch.unit_label = unit;
    if (enActive) patch.active = active;
    if (enCollection) patch.is_collection = collection;
    onApply(patch, enMult ? mult : undefined);
  };

  const hasAny = enCategory || enUnit || enActive || enCollection || enMult;

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-line flex items-center justify-between">
          <div>
            <p className="text-[15px] font-semibold text-ink">
              Modifier {count} produit(s) en masse
            </p>
            <p className="text-[12px] text-muted mt-0.5">
              Coche les champs à modifier — les autres restent inchangés.
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-2 hover:text-ink hover:bg-canvas-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <BulkRow
            checked={enCategory}
            onToggle={() => setEnCategory((v) => !v)}
            label="Catégorie"
          >
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={!enCategory}
              className="form-input"
            >
              <option value="Tissu">Tissu</option>
              <option value="Doublure">Doublure</option>
              <option value="Voilage">Voilage</option>
              <option value="Rail">Rail</option>
              <option value="Tringle">Tringle</option>
              <option value="Accessoire">Accessoire</option>
              <option value="Store">Store</option>
              <option value="Confection">Confection</option>
              <option value="Pose">Pose</option>
              <option value="Divers">Divers</option>
            </select>
          </BulkRow>

          <BulkRow
            checked={enUnit}
            onToggle={() => setEnUnit((v) => !v)}
            label="Unité"
          >
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              disabled={!enUnit}
              className="form-input"
            >
              <option value="m">m (mètre linéaire)</option>
              <option value="m²">m²</option>
              <option value="u">u (unité)</option>
              <option value="h">h (heure)</option>
              <option value="forfait">forfait</option>
            </select>
          </BulkRow>

          <BulkRow
            checked={enActive}
            onToggle={() => setEnActive((v) => !v)}
            label="Actif"
          >
            <select
              value={active ? "1" : "0"}
              onChange={(e) => setActive(e.target.value === "1")}
              disabled={!enActive}
              className="form-input"
            >
              <option value="1">Visible</option>
              <option value="0">Masqué</option>
            </select>
          </BulkRow>

          <BulkRow
            checked={enCollection}
            onToggle={() => setEnCollection((v) => !v)}
            label="Collection Atmosphère"
          >
            <select
              value={collection ? "1" : "0"}
              onChange={(e) => setCollection(e.target.value === "1")}
              disabled={!enCollection}
              className="form-input"
            >
              <option value="1">Oui</option>
              <option value="0">Non</option>
            </select>
          </BulkRow>

          <BulkRow
            checked={enMult}
            onToggle={() => setEnMult((v) => !v)}
            label="Prix × facteur"
          >
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={mult}
                onChange={(e) => setMult(Number(e.target.value))}
                disabled={!enMult}
                className="form-input"
              />
              <span className="text-[11.5px] text-muted whitespace-nowrap">
                ex: 1.10 = +10%
              </span>
            </div>
          </BulkRow>
        </div>

        <div className="p-5 border-t border-line flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-md text-[13px] font-semibold text-ink-2 hover:bg-canvas-2"
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={pending || !hasAny}
            className="h-9 px-4 rounded-md text-[13px] font-semibold bg-ink text-white hover:bg-ink/90 disabled:opacity-40 inline-flex items-center gap-1.5"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Appliquer à {count}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkRow({
  checked,
  onToggle,
  label,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[auto_140px_1fr] items-center gap-3">
      <button
        onClick={onToggle}
        className="text-muted hover:text-ink"
        aria-label={`Modifier ${label}`}
      >
        {checked ? (
          <CheckSquare className="h-4 w-4 text-violet" strokeWidth={2.2} />
        ) : (
          <Square className="h-4 w-4" strokeWidth={2.2} />
        )}
      </button>
      <label className="text-[12.5px] font-medium text-ink-2">{label}</label>
      {children}
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

        <FieldGroup label="P.U. HT (€)" col={3}>
          <input
            type="number"
            step="0.01"
            min={0}
            value={v.unit_price_ht ?? ""}
            onChange={(e) =>
              update({
                unit_price_ht:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
            placeholder="non défini"
            className="form-input"
          />
        </FieldGroup>
        <FieldGroup label="Fournisseur" col={5}>
          <input
            list="supplier-suggestions"
            value={v.supplier_name ?? ""}
            onChange={(e) => update({ supplier_name: e.target.value })}
            placeholder="ex: Casamance, CAD, Nobilis…"
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
