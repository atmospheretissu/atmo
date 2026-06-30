"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2, X } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import {
  searchCatalogTissusAction,
  type TissuSearchResult,
} from "@/app/(platform)/boutique/catalog-search-action";

export type TissuPickerValue = {
  ref: string;
  name?: string;
  prix?: number;
  laize?: number;
  raccord?: number;
};

/**
 * Champ "Référence tissu" connecté au catalogue produits.
 * - L'utilisateur tape le nom (ou la ref) du tissu.
 * - Une liste d'autocomplétion s'ouvre, on choisit un produit.
 * - La référence est saisie ; on remonte aussi prix/laize/raccord pour
 *   pré-remplir les champs voisins.
 *
 * L'utilisateur peut aussi taper du texte libre (compat ancien comportement).
 */
export function TissuPicker({
  value,
  onChange,
  onProductSelected,
  label = "Référence tissu",
  placeholder = "Tape le nom du tissu (ex: Casamance Saumon)…",
}: {
  value: string;
  onChange: (next: string) => void;
  onProductSelected?: (product: TissuSearchResult) => void;
  label?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TissuSearchResult[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Synchronise quand la prop value change (reset externe)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      const r = await searchCatalogTissusAction(query);
      setResults(r);
      setLoading(false);
      setActiveIdx(r.length > 0 ? 0 : -1);
    }, 220);
    return () => clearTimeout(handle);
  }, [query]);

  // Click outside fermeture
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  const choose = (p: TissuSearchResult) => {
    const labelText = `${p.name} · ${p.ref}`;
    setQuery(labelText);
    onChange(labelText);
    onProductSelected?.(p);
    setOpen(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && activeIdx < results.length) {
        e.preventDefault();
        choose(results[activeIdx]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Label>{label}</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2 pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2 animate-spin" />
        )}
        {!loading && query.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onChange("");
              setResults([]);
              setOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-2 hover:text-ink"
            aria-label="Effacer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-line rounded-md shadow-lg max-h-72 overflow-auto">
          {results.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(p)}
              onMouseEnter={() => setActiveIdx(i)}
              className={
                "w-full text-left px-3 py-2 flex items-center justify-between gap-3 transition-colors border-b border-line last:border-0 " +
                (i === activeIdx ? "bg-canvas-2" : "hover:bg-canvas-2/50")
              }
            >
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink truncate">{p.name}</p>
                <p className="text-[11px] text-muted font-mono">{p.ref}</p>
              </div>
              <div className="shrink-0 text-right text-[11.5px] text-muted">
                <p className="font-mono text-ink-2 tabular-nums">
                  {p.unit_price_ht.toFixed(2)} €/m
                </p>
                {p.width_cm && (
                  <p className="text-[10.5px] text-muted-2 mt-0.5">laize {p.width_cm}cm</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && !loading && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-line rounded-md shadow-sm px-3 py-2 text-[12px] text-muted">
          Aucun tissu trouvé pour « {query} ». Continue à taper pour saisir une référence libre.
        </div>
      )}
    </div>
  );
}
