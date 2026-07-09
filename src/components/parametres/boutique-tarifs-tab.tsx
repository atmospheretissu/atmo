"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ChevronRight, Loader2, Save, ArrowLeft, Sparkles, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import {
  listAllTarifTissusAction,
  updateGridAction,
  updateTissuMetaAction,
} from "@/app/(platform)/parametres/boutique-tarifs-actions";
import type { Tissu, TarifGrid } from "@/lib/db/boutique-tarifs";

const CATEGORY_LABELS: Record<string, string> = {
  rideau: "Rideau",
  store_bateau: "Store bateau",
  store_enrouleur: "Store enrouleur",
  store_screen: "Store screen",
};

const CATEGORY_TONES: Record<
  string,
  "violet" | "blue" | "pink" | "orange"
> = {
  rideau: "violet",
  store_bateau: "blue",
  store_enrouleur: "pink",
  store_screen: "orange",
};

const FAMILY_LABELS: Record<string, string> = {
  LIN: "Lin",
  POLYESTER: "Polyester",
  POLYESTER_DOUBLE: "Polyester doublé",
  COLLECTION: "Collection",
};

const CONFECTION_LABELS: Record<string, string> = {
  pli_simple: "Plis simples",
  wave: "Wave",
  oeillet: "Œillets",
  store: "Store",
};

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);

export function BoutiqueTarifsTab() {
  const [tissus, setTissus] = useState<Tissu[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const refresh = async () => {
    setLoading(true);
    const list = await listAllTarifTissusAction();
    setTissus(list);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const filteredTissus = useMemo(() => {
    if (!query.trim()) return tissus;
    const q = query.trim().toLowerCase();
    return tissus.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.family.toLowerCase().includes(q),
    );
  }, [tissus, query]);

  const selected = tissus.find((t) => t.id === selectedId) ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Chargement des grilles tarifaires…
      </div>
    );
  }

  if (selected) {
    return (
      <TissuEditor
        tissu={selected}
        onBack={() => setSelectedId(null)}
        onSaved={refresh}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[18px] font-semibold text-ink">Grilles tarifaires Collection Atmosphère</h2>
          <p className="text-[13px] text-muted mt-0.5">
            {tissus.length} tissu{tissus.length > 1 ? "s" : ""} · éditables cellule par cellule
          </p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2" />
          <Input
            placeholder="Filtrer par nom, catégorie…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-canvas-2/40 border-b border-line text-left">
              <Th>Tissu</Th>
              <Th>Catégorie</Th>
              <Th>Famille</Th>
              <Th className="text-right">Laize</Th>
              <Th className="text-right">Confections</Th>
              <Th>Actif</Th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredTissus.map((t) => (
              <tr
                key={t.id}
                className="border-b border-line hover:bg-canvas-2/30 cursor-pointer transition-colors"
                onClick={() => setSelectedId(t.id)}
              >
                <td className="px-4 py-3 font-semibold text-ink">{t.name}</td>
                <td className="px-4 py-3">
                  <StatusPill tone={CATEGORY_TONES[t.category] ?? "muted"} dot>
                    {CATEGORY_LABELS[t.category] ?? t.category}
                  </StatusPill>
                </td>
                <td className="px-4 py-3 text-muted">{FAMILY_LABELS[t.family] ?? t.family}</td>
                <td className="px-4 py-3 text-right font-mono text-muted tabular-nums">
                  {t.laize ? `${t.laize} cm` : "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {Object.keys(t.confections).length}
                </td>
                <td className="px-4 py-3">
                  {t.active ? (
                    <StatusPill tone="emerald" dot>
                      Actif
                    </StatusPill>
                  ) : (
                    <StatusPill tone="muted" dot>
                      Inactif
                    </StatusPill>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  <ChevronRight className="h-4 w-4 text-muted-2" />
                </td>
              </tr>
            ))}
            {filteredTissus.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-2">
                  Aucun tissu ne correspond au filtre.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={
        "px-4 py-2.5 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 " +
        className
      }
    >
      {children}
    </th>
  );
}

function TissuEditor({
  tissu,
  onBack,
  onSaved,
}: {
  tissu: Tissu;
  onBack: () => void;
  onSaved: () => void;
}) {
  const confections = Object.keys(tissu.confections);
  const [activeConf, setActiveConf] = useState<string>(confections[0] ?? "");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-canvas-2 text-muted hover:text-ink transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-[18px] font-semibold text-ink">{tissu.name}</h2>
            <p className="text-[12.5px] text-muted mt-0.5 flex items-center gap-2">
              <StatusPill tone={CATEGORY_TONES[tissu.category] ?? "muted"} dot>
                {CATEGORY_LABELS[tissu.category] ?? tissu.category}
              </StatusPill>
              <span>{FAMILY_LABELS[tissu.family] ?? tissu.family}</span>
              {tissu.laize && <span>· laize {tissu.laize} cm</span>}
            </p>
          </div>
        </div>
      </div>

      {confections.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {confections.map((c) => (
            <button
              key={c}
              onClick={() => setActiveConf(c)}
              className={
                "h-8 px-3 rounded-full text-[12.5px] font-medium transition-all " +
                (activeConf === c
                  ? "bg-ink text-white"
                  : "bg-white text-muted hover:text-ink border border-line")
              }
            >
              {CONFECTION_LABELS[c] ?? c}
            </button>
          ))}
        </div>
      )}

      {activeConf && (
        <GridEditor
          key={tissu.id + activeConf}
          tissuId={tissu.id}
          confection={activeConf}
          initial={tissu.confections[activeConf]}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

function GridEditor({
  tissuId,
  confection,
  initial,
  onSaved,
}: {
  tissuId: string;
  confection: string;
  initial: TarifGrid;
  onSaved: () => void;
}) {
  const [grid, setGrid] = useState<number[][]>(
    initial.grid.map((row) => [...row]),
  );
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty = useMemo(() => {
    if (grid.length !== initial.grid.length) return true;
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        if (grid[i][j] !== initial.grid[i][j]) return true;
      }
    }
    return false;
  }, [grid, initial.grid]);

  const updateCell = (i: number, j: number, value: number) => {
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[i][j] = value;
      return next;
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      const r = await updateGridAction(
        tissuId,
        confection,
        initial.largeurs,
        initial.hauteurs,
        grid,
      );
      if (r.ok) {
        setSavedAt(Date.now());
        onSaved();
      } else {
        alert(`Échec sauvegarde : ${r.message}`);
      }
    });
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <p className="text-[13px] text-muted">
          Grille : {initial.hauteurs.length} hauteurs × {initial.largeurs.length} largeurs · lecture "seuil supérieur"
        </p>
        <div className="flex items-center gap-2">
          {savedAt && !dirty && (
            <span className="text-[12px] text-emerald inline-flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Enregistré
            </span>
          )}
          <Button
            variant="accent"
            size="sm"
            onClick={handleSave}
            disabled={!dirty || pending}
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Enregistrer
          </Button>
        </div>
      </div>

      <div className="overflow-auto max-h-[65vh] border border-line rounded-md">
        <table className="text-[12px] border-collapse min-w-full">
          <thead className="sticky top-0 z-10 bg-canvas-2 border-b border-line">
            <tr>
              <th className="px-2 py-2 text-left text-muted-2 font-semibold uppercase text-[10px] tracking-wider sticky left-0 bg-canvas-2 z-20">
                H \ L
              </th>
              {initial.largeurs.map((l) => (
                <th
                  key={l}
                  className="px-2 py-2 text-right text-muted-2 font-semibold tabular-nums"
                >
                  ≤{l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {initial.hauteurs.map((h, i) => (
              <tr key={h} className="border-b border-line/50 hover:bg-canvas-2/20">
                <td className="px-2 py-1 text-right text-muted-2 font-semibold tabular-nums sticky left-0 bg-white z-10 border-r border-line">
                  ≤{h}
                </td>
                {initial.largeurs.map((_, j) => {
                  const value = grid[i]?.[j] ?? 0;
                  const original = initial.grid[i]?.[j] ?? 0;
                  const changed = value !== original;
                  return (
                    <td key={j} className="p-0">
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={value}
                        onChange={(e) => updateCell(i, j, Number(e.target.value) || 0)}
                        className={
                          "w-full h-8 px-2 py-1 text-right text-[11.5px] font-mono tabular-nums bg-transparent focus:outline-none focus:ring-1 focus:ring-accent focus:bg-white " +
                          (changed ? "bg-amber-soft/40 text-amber font-bold" : "text-ink-2")
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-2 mt-3">
        Colonnes = largeurs (≤ seuil en cm) · lignes = hauteurs (≤ seuil en cm). Un devis
        pour 210×157 → utilise la cellule à ≤225 largeur × ≤165 hauteur.
      </p>
    </Card>
  );
}
