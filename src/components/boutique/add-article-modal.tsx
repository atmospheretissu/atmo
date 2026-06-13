"use client";

import { useEffect, useState, useTransition } from "react";
import { X, Package, Scissors, Layers, ShoppingBag, Search, Loader2, AlertCircle, Disc, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ColorChip } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";
import type { BoutiquePieceArticle } from "@/app/(platform)/boutique/actions";
import { searchCatalogProductsAction } from "@/app/(platform)/boutique/actions";
import { RideauForm } from "@/components/boutique/article-rideau-form";
import { StoreForm } from "@/components/boutique/article-store-form";
import { StoreEnrouleurForm } from "@/components/boutique/article-store-enrouleur-form";
import { RideauSerieForm } from "@/components/boutique/article-rideau-serie-form";
import { ArticleLibreForm } from "@/components/boutique/article-libre-form";

type ArticleType =
  | "rideau"
  | "store"
  | "store_enrouleur"
  | "produit"
  | "rideau_serie"
  | "libre";

const TYPES: {
  key: ArticleType;
  label: string;
  description: string;
  tone: "violet" | "blue" | "orange" | "pink";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  available: boolean;
}[] = [
  {
    key: "produit",
    label: "Produit catalogue",
    description: "47 066 références (tissus, papier peint, accessoires…)",
    tone: "orange",
    icon: Package,
    available: true,
  },
  {
    key: "rideau",
    label: "Rideau sur mesure",
    description: "Plis simples · Vague · Œillets — calcul temps réel",
    tone: "violet",
    icon: Scissors,
    available: true,
  },
  {
    key: "store",
    label: "Store sur mesure",
    description: "Bateau régulier / irrégulier — calcul temps réel",
    tone: "blue",
    icon: Layers,
    available: true,
  },
  {
    key: "store_enrouleur",
    label: "Store enrouleur",
    description: "Tissu enrouleur (Vedelux, Copa…) — enroulement avant / arrière",
    tone: "blue",
    icon: Disc,
    available: true,
  },
  {
    key: "rideau_serie",
    label: "Rideau en série",
    description: "56 modèles prêts à poser",
    tone: "pink",
    icon: ShoppingBag,
    available: true,
  },
  {
    key: "libre",
    label: "Autre produit (champ libre)",
    description: "Désignation, qté, prix HT — pour tout ce qui sort des modules",
    tone: "orange",
    icon: Plus,
    available: true,
  },
];

export function AddArticleModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (articles: BoutiquePieceArticle[]) => void;
}) {
  const [selectedType, setSelectedType] = useState<ArticleType | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Larger modal for forms with split layout
  const isWide =
    selectedType === "rideau" ||
    selectedType === "store" ||
    selectedType === "store_enrouleur" ||
    selectedType === "libre";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[6vh] px-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cn(
          "relative w-full bg-white rounded-2xl shadow-pop border border-line overflow-hidden animate-fade-up",
          isWide ? "max-w-[1080px]" : "max-w-[680px]"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div>
            <p className="eyebrow">Ajouter un article</p>
            <h3 className="text-[15px] font-semibold text-ink mt-0.5">
              {selectedType === null
                ? "Choisis le type d'article"
                : selectedType === "produit"
                ? "Catalogue produits"
                : selectedType === "rideau"
                ? "Rideau sur mesure"
                : selectedType === "store"
                ? "Store sur mesure"
                : selectedType === "store_enrouleur"
                ? "Store enrouleur"
                : selectedType === "libre"
                ? "Autre produit (champ libre)"
                : "Rideau en série"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md hover:bg-canvas-2 inline-flex items-center justify-center text-muted hover:text-ink transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        {selectedType === null && <TypePicker onPick={setSelectedType} />}

        {selectedType === "produit" && (
          <ProduitCatalogueForm
            onCancel={() => setSelectedType(null)}
            onAdd={(a) => onAdd([a])}
          />
        )}

        {selectedType === "rideau" && (
          <RideauForm onCancel={() => setSelectedType(null)} onAdd={onAdd} />
        )}

        {selectedType === "store" && (
          <StoreForm onCancel={() => setSelectedType(null)} onAdd={onAdd} />
        )}

        {selectedType === "store_enrouleur" && (
          <StoreEnrouleurForm onCancel={() => setSelectedType(null)} onAdd={onAdd} />
        )}

        {selectedType === "rideau_serie" && (
          <RideauSerieForm onCancel={() => setSelectedType(null)} onAdd={onAdd} />
        )}

        {selectedType === "libre" && (
          <ArticleLibreForm onCancel={() => setSelectedType(null)} onAdd={onAdd} />
        )}
      </div>
    </div>
  );
}

function TypePicker({ onPick }: { onPick: (t: ArticleType) => void }) {
  return (
    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
      {TYPES.map((t) => (
        <button
          key={t.key}
          type="button"
          disabled={!t.available}
          onClick={() => t.available && onPick(t.key)}
          className={cn(
            "flex items-start gap-3 p-4 rounded-xl border text-left transition-all",
            t.available
              ? "border-line hover:border-ink hover:shadow-sm bg-white"
              : "border-dashed border-line bg-canvas-2/30 opacity-60 cursor-not-allowed"
          )}
        >
          <ColorChip tone={t.tone} size="md">
            <t.icon className="h-4 w-4" strokeWidth={2.2} />
          </ColorChip>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-[13.5px] font-semibold text-ink">{t.label}</p>
              {!t.available && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-amber-soft text-amber">
                  Part 3
                </span>
              )}
            </div>
            <p className="text-[11.5px] text-muted mt-0.5">{t.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

function ProduitCatalogueForm({
  onCancel,
  onAdd,
}: {
  onCancel: () => void;
  onAdd: (a: BoutiquePieceArticle) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    Array<{
      reference: string;
      nom: string;
      designation: string;
      prix: number | null;
      fournisseur: string;
    }>
  >([]);
  const [selectedProduct, setSelectedProduct] = useState<typeof results[0] | null>(null);
  const [qty, setQty] = useState(1);
  const [unitLabel, setUnitLabel] = useState("u");
  const [overridePrice, setOverridePrice] = useState<number | "">("");
  const [searching, startSearch] = useTransition();

  useEffect(() => {
    if (!query || query.length < 2 || selectedProduct) return;
    const t = setTimeout(() => {
      startSearch(async () => {
        try {
          const r = await searchCatalogProductsAction(query);
          setResults(r);
        } catch {
          setResults([]);
        }
      });
    }, 250);
    return () => clearTimeout(t);
  }, [query, selectedProduct]);

  const finalPrice = overridePrice === "" ? selectedProduct?.prix ?? 0 : Number(overridePrice);

  const handleAdd = () => {
    if (!selectedProduct) return;
    onAdd({
      type: "produit",
      designation: selectedProduct.nom,
      ref: selectedProduct.reference,
      detail: `${selectedProduct.fournisseur} · ${selectedProduct.designation}`,
      qty,
      unitLabel,
      unitPriceHt: finalPrice,
      meta: {
        catalogReference: selectedProduct.reference,
        fournisseur: selectedProduct.fournisseur,
        prixOriginal: selectedProduct.prix,
      },
    });
  };

  return (
    <div className="p-5 max-h-[70vh] overflow-y-auto">
      {!selectedProduct ? (
        <>
          <Label>Chercher un produit (47 066 références)</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, référence (ex: ARCR), fournisseur (CAD, Casamance)…"
              className="pl-9"
            />
          </div>
          <p className="text-[11px] text-muted-2 mt-1.5">
            Minimum 2 caractères · recherche live · max 30 résultats
          </p>

          <div className="mt-3 max-h-[320px] overflow-y-auto border border-line rounded-md bg-white divide-y divide-line">
            {searching && (
              <div className="px-4 py-6 text-center text-[12.5px] text-muted-2 inline-flex items-center justify-center gap-2 w-full">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Recherche…
              </div>
            )}
            {!searching && query.length < 2 && (
              <div className="px-4 py-6 text-center text-[12.5px] text-muted-2">
                Tape au moins 2 caractères pour chercher.
              </div>
            )}
            {!searching && query.length >= 2 && results.length === 0 && (
              <div className="px-4 py-6 text-center text-[12.5px] text-muted-2">
                Aucun produit trouvé pour "{query}".
              </div>
            )}
            {!searching &&
              results.map((p) => (
                <button
                  key={p.reference}
                  type="button"
                  onClick={() => setSelectedProduct(p)}
                  className="w-full px-4 py-2.5 text-left hover:bg-canvas-2/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink truncate">{p.nom}</p>
                      <p className="text-[10.5px] text-muted-2 font-mono mt-0.5">
                        {p.reference}
                        {p.fournisseur && <> · {p.fournisseur}</>}
                      </p>
                    </div>
                    {p.prix !== null && (
                      <p className="text-[12.5px] font-semibold text-ink tabular-nums shrink-0">
                        {p.prix.toFixed(2)} €
                      </p>
                    )}
                  </div>
                </button>
              ))}
          </div>

          <div className="flex items-center justify-end gap-2 mt-5">
            <Button variant="secondary" size="md" type="button" onClick={onCancel}>
              Retour
            </Button>
          </div>
        </>
      ) : (
        <>
          <Card className="p-3 bg-canvas-2/30 mb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-ink">{selectedProduct.nom}</p>
                <p className="text-[11px] text-muted-2 font-mono mt-0.5">
                  {selectedProduct.reference}
                  {selectedProduct.fournisseur && <> · {selectedProduct.fournisseur}</>}
                </p>
                <p className="text-[11.5px] text-muted mt-1">{selectedProduct.designation}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedProduct(null);
                  setQuery("");
                }}
                className="text-[11.5px] text-muted hover:text-ink-2 shrink-0"
              >
                Changer
              </button>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Quantité *</Label>
              <Input
                type="number"
                step="0.01"
                min={0.01}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label>Unité</Label>
              <select
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                className="flex h-9 w-full rounded-md border border-line-strong bg-white px-3 text-[13.5px] text-ink"
              >
                <option value="u">unité</option>
                <option value="m">mètre</option>
                <option value="m²">m²</option>
                <option value="rouleau">rouleau</option>
                <option value="forfait">forfait</option>
              </select>
            </div>
            <div>
              <Label>P.U. HT (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={overridePrice === "" ? "" : overridePrice}
                onChange={(e) =>
                  setOverridePrice(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder={selectedProduct.prix?.toFixed(2) ?? "0.00"}
              />
              <p className="text-[10.5px] text-muted-2 mt-1">
                Prix catalogue : {selectedProduct.prix?.toFixed(2) ?? "—"} €
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-canvas-2/40 border border-line flex items-center justify-between">
            <span className="text-[12.5px] text-muted">Total ligne</span>
            <span className="text-[18px] font-semibold tabular-nums text-ink">
              {(qty * finalPrice).toFixed(2)} €
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 mt-5">
            <Button variant="secondary" size="md" type="button" onClick={onCancel}>
              Retour
            </Button>
            <Button variant="primary" size="md" type="button" onClick={handleAdd}>
              Ajouter à la pièce
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function PartTwoPlaceholder({
  type,
  onBack,
}: {
  type: "store" | "rideau_serie";
  onBack: () => void;
}) {
  const labels = {
    store: "Store sur mesure",
    rideau_serie: "Rideau en série",
  };
  return (
    <div className="p-8 text-center">
      <div className="h-12 w-12 mx-auto rounded-xl bg-amber-soft text-amber inline-flex items-center justify-center mb-3">
        <AlertCircle className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <h3 className="text-[15px] font-semibold text-ink mb-1">
        {labels[type]} — disponible en Part 3
      </h3>
      <p className="text-[12.5px] text-muted max-w-md mx-auto mb-5">
        La logique de chiffrage est déjà portée côté serveur (calculateStore avec mécanisme,
        chaînette, accessoires, pose…). Reste à brancher l'UI du formulaire.
      </p>
      <Button variant="secondary" size="md" type="button" onClick={onBack}>
        Retour au choix
      </Button>
    </div>
  );
}
