"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Hint, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ColorChip } from "@/components/ui/status-pill";
import type { BoutiquePieceArticle } from "@/app/(platform)/boutique/actions";
import {
  NEW_COLLECTION_TARIFS,
  lookupPrice,
  tissusByFamily,
  type NewCollectionCategory,
  type NewCollectionFamily,
  type ConfectionKey,
  type Tissu,
} from "@/lib/boutique/new-collection-tarifs";

const eurFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const CATEGORY_LABELS: Record<NewCollectionCategory, string> = {
  rideau: "Rideau sur mesure",
  store_bateau: "Store bateau",
  store_enrouleur: "Store enrouleur",
  store_screen: "Store screen",
};

const FAMILY_LABELS: Record<NewCollectionFamily, string> = {
  LIN: "Lin",
  POLYESTER: "Polyester",
  POLYESTER_DOUBLE: "Polyester doublé",
  COLLECTION: "Collection",
};

const CONFECTION_LABELS: Record<ConfectionKey, string> = {
  pli_simple: "Plis simples",
  wave: "Wave",
  oeillet: "Œillets",
  store: "Store",
};

export function ArticleNewCollectionForm({
  onAdd,
  onCancel,
}: {
  onAdd: (articles: BoutiquePieceArticle[]) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState<NewCollectionCategory>("rideau");
  const [tissuId, setTissuId] = useState<string>("");
  const [confection, setConfection] = useState<ConfectionKey>("pli_simple");
  const [largeur, setLargeur] = useState<number>(200);
  const [hauteur, setHauteur] = useState<number>(250);
  const [avecPose, setAvecPose] = useState(true);
  const [prixPose, setPrixPose] = useState(120);

  const categories = useMemo(() => {
    return (Object.keys(NEW_COLLECTION_TARIFS) as NewCollectionCategory[]).filter(
      (c) => NEW_COLLECTION_TARIFS[c].tissus.length > 0,
    );
  }, []);

  const availableFamilies = useMemo(() => {
    const byFam = tissusByFamily(category);
    return (Object.entries(byFam) as [NewCollectionFamily, Tissu[]][]).filter(
      ([, list]) => list.length > 0,
    );
  }, [category]);

  const tissusFlat = useMemo(() => {
    return NEW_COLLECTION_TARIFS[category].tissus;
  }, [category]);

  const selectedTissu: Tissu | null = useMemo(() => {
    if (!tissuId) return null;
    return tissusFlat.find((t) => `${t.family}::${t.name}` === tissuId) ?? null;
  }, [tissuId, tissusFlat]);

  const availableConfections = useMemo(() => {
    if (!selectedTissu) return [] as ConfectionKey[];
    return Object.keys(selectedTissu.confections);
  }, [selectedTissu]);

  // Assure que confection sélectionnée reste valide
  const effectiveConfection: ConfectionKey | null = useMemo(() => {
    if (!selectedTissu) return null;
    if (availableConfections.includes(confection)) return confection;
    return availableConfections[0] ?? null;
  }, [selectedTissu, availableConfections, confection]);

  const lookup = useMemo(() => {
    if (!selectedTissu || !effectiveConfection) return null;
    const grid = selectedTissu.confections[effectiveConfection];
    if (!grid) return null;
    return lookupPrice(grid, largeur, hauteur);
  }, [selectedTissu, effectiveConfection, largeur, hauteur]);

  const validationError = useMemo(() => {
    if (!selectedTissu) return "Sélectionne un tissu.";
    if (!effectiveConfection) return "Aucun type de confection disponible pour ce tissu.";
    if (largeur <= 0) return "Largeur invalide.";
    if (hauteur <= 0) return "Hauteur invalide.";
    if (!lookup) {
      const maxL = selectedTissu.confections[effectiveConfection].largeurs.slice(-1)[0];
      const maxH = selectedTissu.confections[effectiveConfection].hauteurs.slice(-1)[0];
      return `Dimensions hors grille (max ${maxL}×${maxH}cm).`;
    }
    return null;
  }, [selectedTissu, effectiveConfection, largeur, hauteur, lookup]);

  const prixArticle = lookup?.price ?? 0;
  const totalGlobal = prixArticle + (avecPose ? prixPose : 0);

  const handleAdd = () => {
    if (validationError || !lookup || !selectedTissu || !effectiveConfection) return;

    const articles: BoutiquePieceArticle[] = [];

    // Article 1 — tissu + confection all-in
    const label = `New Collection Atmosphère — ${CATEGORY_LABELS[category]} ${selectedTissu.name}`;
    articles.push({
      type: category === "rideau" ? "rideau" : "store",
      designation: label,
      ref: selectedTissu.name,
      detail:
        `${CONFECTION_LABELS[effectiveConfection] ?? effectiveConfection} · ${largeur}×${hauteur}cm` +
        ` · ${FAMILY_LABELS[selectedTissu.family]}` +
        (selectedTissu.laize ? ` · laize ${selectedTissu.laize}cm` : "") +
        ` · seuil grille ${lookup.largeurSeuil}×${lookup.hauteurSeuil}cm`,
      qty: 1,
      unitLabel: "u",
      unitPriceHt: prixArticle,
      meta: {
        typeArticle: "new_collection_atmosphere",
        category,
        family: selectedTissu.family,
        tissu: selectedTissu.name,
        confection: effectiveConfection,
        largeur,
        hauteur,
        laize: selectedTissu.laize,
        coefficient: selectedTissu.coefficient,
        largeurSeuil: lookup.largeurSeuil,
        hauteurSeuil: lookup.hauteurSeuil,
        prixAllIn: prixArticle,
      },
    });

    // Article 2 — pose éventuelle
    if (avecPose && prixPose > 0) {
      articles.push({
        type: category === "rideau" ? "rideau" : "store",
        designation: `Pose ${CATEGORY_LABELS[category]} (New Collection)`,
        ref: undefined,
        detail: `${largeur}×${hauteur}cm`,
        qty: 1,
        unitLabel: "forfait",
        unitPriceHt: prixPose,
        meta: {
          typeArticle:
            category === "rideau" ? "pose_rideau" : "pose_store",
        },
      });
    }

    onAdd(articles);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 p-5 max-h-[75vh] overflow-y-auto">
      <div className="space-y-5">
        {/* Catégorie */}
        <section>
          <p className="eyebrow mb-2">Catégorie</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1 rounded-md border border-line p-0.5 bg-white h-10">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCategory(c);
                  setTissuId("");
                }}
                className={
                  "text-[12px] font-semibold rounded-[5px] transition-colors " +
                  (category === c
                    ? "bg-ink text-white"
                    : "text-muted hover:text-ink")
                }
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </section>

        {/* Tissu (groupé par famille) */}
        <section>
          <p className="eyebrow mb-2">Tissu Collection Atmosphère</p>
          <Select value={tissuId} onChange={(e) => setTissuId(e.target.value)}>
            <option value="">— Choisir un tissu —</option>
            {availableFamilies.map(([fam, list]) => (
              <optgroup key={fam} label={FAMILY_LABELS[fam]}>
                {list.map((t) => (
                  <option key={`${t.family}::${t.name}`} value={`${t.family}::${t.name}`}>
                    {t.name}
                    {t.laize ? ` · laize ${t.laize}cm` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
          <Hint>Grille tarifaire = fichier TARIFS/ correspondant, prix tout inclus.</Hint>
        </section>

        {/* Confection */}
        {availableConfections.length > 1 && (
          <section>
            <p className="eyebrow mb-2">Type de confection</p>
            <div className="grid grid-cols-3 gap-1 rounded-md border border-line p-0.5 bg-white h-10">
              {availableConfections.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setConfection(c)}
                  className={
                    "text-[12px] font-semibold rounded-[5px] transition-colors " +
                    (effectiveConfection === c
                      ? "bg-ink text-white"
                      : "text-muted hover:text-ink")
                  }
                >
                  {CONFECTION_LABELS[c] ?? c}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Dimensions */}
        <section>
          <p className="eyebrow mb-2">Dimensions</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Largeur finie (cm) *</Label>
              <Input
                type="number"
                min={1}
                value={largeur || ""}
                onChange={(e) => setLargeur(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Hauteur finie (cm) *</Label>
              <Input
                type="number"
                min={1}
                value={hauteur || ""}
                onChange={(e) => setHauteur(Number(e.target.value) || 0)}
              />
            </div>
          </div>
        </section>

        {/* Pose */}
        <section>
          <p className="eyebrow mb-2">Pose à domicile</p>
          <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer">
            <input
              type="checkbox"
              checked={avecPose}
              onChange={(e) => setAvecPose(e.target.checked)}
              className="h-4 w-4 rounded border-line-strong"
            />
            <span className="text-ink-2">Inclure la pose</span>
          </label>
          {avecPose && (
            <div className="mt-3 max-w-[200px]">
              <Label>Prix pose (€)</Label>
              <Input
                type="number"
                step="1"
                min={0}
                value={prixPose || ""}
                onChange={(e) => setPrixPose(Number(e.target.value) || 0)}
              />
            </div>
          )}
        </section>
      </div>

      {/* Récap */}
      <div className="space-y-3 h-fit sticky top-2">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="eyebrow">Récapitulatif</p>
            <ColorChip tone="amber" size="sm">
              <Sparkles className="h-3 w-3" strokeWidth={2.4} />
            </ColorChip>
          </div>
          {validationError ? (
            <div className="text-[12.5px] text-amber inline-flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.4} /> {validationError}
            </div>
          ) : (
            <div className="space-y-2 text-[12.5px]">
              <Row
                label={`${selectedTissu?.name} — ${CONFECTION_LABELS[effectiveConfection ?? ""] ?? ""}`}
                value={prixArticle}
              />
              {avecPose && prixPose > 0 && <Row label="Pose" value={prixPose} />}
              <div className="mt-2 pt-2 border-t border-line flex items-center justify-between">
                <span className="text-[13px] font-semibold text-ink">Total HT</span>
                <span className="text-[15px] font-semibold text-ink tabular-nums">
                  {eurFmt.format(totalGlobal)}
                </span>
              </div>
              <p className="text-[11px] text-muted-2 pt-2">
                Grille : {lookup?.largeurSeuil}×{lookup?.hauteurSeuil}cm (seuil arrondi)
              </p>
            </div>
          )}
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="md" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            variant="accent"
            size="md"
            disabled={Boolean(validationError)}
            onClick={handleAdd}
          >
            Ajouter au devis
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted truncate max-w-[180px]">{label}</span>
      <span className="text-ink tabular-nums">{eurFmt.format(value)}</span>
    </div>
  );
}
