"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Hint, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ColorChip } from "@/components/ui/status-pill";
import type { BoutiquePieceArticle } from "@/app/(platform)/boutique/actions";
import { listTarifTissusAction } from "@/app/(platform)/boutique/tarifs-action";
import { lookupPosePrice } from "@/lib/boutique/pose-lookup";
import type {
  NewCollectionCategory,
  NewCollectionFamily,
  ConfectionKey,
  Tissu,
  TarifGrid,
} from "@/lib/db/boutique-tarifs";

function lookupPriceClient(
  grid: TarifGrid,
  largeurCm: number,
  hauteurCm: number,
) {
  const iLargeur = grid.largeurs.findIndex((l) => l >= largeurCm);
  const iHauteur = grid.hauteurs.findIndex((h) => h >= hauteurCm);
  if (iLargeur < 0 || iHauteur < 0) return null;
  const price = grid.grid[iHauteur]?.[iLargeur];
  if (!Number.isFinite(price) || price <= 0) return null;
  return {
    price,
    largeurSeuil: grid.largeurs[iLargeur],
    hauteurSeuil: grid.hauteurs[iHauteur],
  };
}

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

const CONFECTION_LABELS: Record<ConfectionKey, string> = {
  pli_simple: "Plis simples",
  wave: "Wave",
  oeillet: "Œillets",
  store: "Store",
};

const CATEGORIES: NewCollectionCategory[] = [
  "rideau",
  "store_bateau",
  "store_enrouleur",
  "store_screen",
];

/** Normalise le nom d'un tissu pour matcher base ↔ doublé.
 *  "VOGUE" ↔ "VOGUE - DOUBLE" → base = "VOGUE"
 */
function baseName(name: string): string {
  return name.replace(/\s*-\s*DOUBLE\s*$/i, "").trim().toUpperCase();
}

type Doublure = "aucune" | "occultante" | "thermique";

const DOUBLURE_OPTIONS: { value: Doublure; label: string; hint: string }[] = [
  { value: "aucune", label: "Aucune", hint: "Rideau simple (polyester non doublé)" },
  { value: "occultante", label: "Occultante / classique", hint: "Grille polyester doublé" },
  { value: "thermique", label: "Thermique", hint: "Doublé + supplément option thermique" },
];

type Montage = "panneau" | "paire";

export function ArticleNewCollectionForm({
  onAdd,
  onCancel,
}: {
  onAdd: (articles: BoutiquePieceArticle[]) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState<NewCollectionCategory>("rideau");
  const [tissuBase, setTissuBase] = useState<string>("");
  const [coloris, setColoris] = useState<string>("");
  const [doublure, setDoublure] = useState<Doublure>("aucune");
  const [montage, setMontage] = useState<Montage>("panneau");
  const [confection, setConfection] = useState<ConfectionKey>("pli_simple");
  const [largeur, setLargeur] = useState<number>(210);
  const [hauteur, setHauteur] = useState<number>(157);
  const [avecPose, setAvecPose] = useState(true);
  const [prixPoseOverride, setPrixPoseOverride] = useState<number | null>(null);

  // Prix pose auto depuis la grille selon dimensions + catégorie
  const prixPoseAuto = useMemo(
    () => lookupPosePrice(category, largeur, hauteur),
    [category, largeur, hauteur],
  );
  const prixPose = prixPoseOverride ?? prixPoseAuto ?? 0;

  // Fetch tissus depuis la DB à chaque changement de catégorie
  const [tissus, setTissus] = useState<Tissu[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const list = await listTarifTissusAction(category);
        if (!cancelled) {
          setTissus(list);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setTissus([]);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category]);

  /** Regroupe les tissus par nom de base et détermine les doublures dispo pour chacun.
   *  Ex : {"VOGUE": {LIN: null, POLYESTER: <Tissu>, POLYESTER_DOUBLE: <Tissu - DOUBLE>}}
   */
  const tissuGroups = useMemo(() => {
    const groups = new Map<
      string,
      Partial<Record<NewCollectionFamily, Tissu>>
    >();
    const thermiqueTissu = tissus.find(
      (t) => baseName(t.name) === "OPTION THERMIQUE POLYESTER" || t.name.toUpperCase().includes("OPTION THERMIQUE"),
    );
    for (const t of tissus) {
      // On skip le supplément thermique de la liste des tissus sélectionnables
      if (thermiqueTissu && t.id === thermiqueTissu.id) continue;
      const bn = baseName(t.name);
      const g = groups.get(bn) ?? {};
      g[t.family] = t;
      groups.set(bn, g);
    }
    return { groups, thermiqueTissu };
  }, [tissus]);

  const availableTissuBaseNames = useMemo(
    () => Array.from(tissuGroups.groups.keys()).sort(),
    [tissuGroups],
  );

  /** Le tissu "actif" selon la doublure sélectionnée + éventuel supplément.
   *  Simplifié :
   *    - Doublure "aucune"    → cherche POLYESTER, puis LIN, puis COLLECTION
   *    - Doublure occultante/thermique → cherche POLYESTER_DOUBLE d'abord
   */
  const activeTissu: Tissu | null = useMemo(() => {
    if (!tissuBase) return null;
    const group = tissuGroups.groups.get(tissuBase);
    if (!group) return null;
    if (doublure === "aucune") {
      return group.POLYESTER ?? group.LIN ?? group.COLLECTION ?? group.POLYESTER_DOUBLE ?? null;
    }
    return group.POLYESTER_DOUBLE ?? group.POLYESTER ?? group.LIN ?? group.COLLECTION ?? null;
  }, [tissuBase, tissuGroups, doublure]);

  const supplementThermique: Tissu | null = useMemo(() => {
    if (doublure !== "thermique") return null;
    return tissuGroups.thermiqueTissu ?? null;
  }, [doublure, tissuGroups]);

  // Doublures disponibles selon le tissu sélectionné
  const availableDoublures = useMemo(() => {
    if (!tissuBase) return [] as Doublure[];
    const group = tissuGroups.groups.get(tissuBase);
    if (!group) return [];
    // Enrouleur / Screen : pas de doublure
    if (group.COLLECTION && !group.POLYESTER && !group.POLYESTER_DOUBLE && !group.LIN) {
      return [];
    }
    // Sinon : toutes les doublures disponibles. Si POLYESTER_DOUBLE n'existe
    // pas pour ce tissu, on utilise sa grille POLYESTER/LIN comme base.
    // Thermique nécessite la grille OPTION THERMIQUE seedée.
    const out: Doublure[] = ["aucune", "occultante"];
    if (tissuGroups.thermiqueTissu) out.push("thermique");
    return out;
  }, [tissuBase, tissuGroups]);

  // S'assure que la doublure sélectionnée reste valide
  useEffect(() => {
    if (availableDoublures.length > 0 && !availableDoublures.includes(doublure)) {
      setDoublure(availableDoublures[0]);
    }
  }, [availableDoublures, doublure]);

  const availableConfections = useMemo(() => {
    if (!activeTissu) return [] as ConfectionKey[];
    // Pour rideau/store bateau : toujours proposer les 3 confections
    // (fallback wave → pli_simple si le tissu n'a pas de tarif wave).
    if (category === "rideau" || category === "store_bateau") {
      const base = new Set(Object.keys(activeTissu.confections));
      if (base.has("pli_simple") && !base.has("wave")) base.add("wave");
      return Array.from(base);
    }
    return Object.keys(activeTissu.confections);
  }, [activeTissu, category]);

  const effectiveConfection: ConfectionKey | null = useMemo(() => {
    if (!activeTissu) return null;
    if (availableConfections.includes(confection)) return confection;
    return availableConfections[0] ?? null;
  }, [activeTissu, availableConfections, confection]);

  const lookupMain = useMemo(() => {
    if (!activeTissu || !effectiveConfection) return null;
    // Fallback wave → pli_simple si pas de grille wave
    const grid =
      activeTissu.confections[effectiveConfection] ??
      (effectiveConfection === "wave" ? activeTissu.confections["pli_simple"] : undefined);
    if (!grid) return null;
    return lookupPriceClient(grid, largeur, hauteur);
  }, [activeTissu, effectiveConfection, largeur, hauteur]);

  const lookupThermiqueSupp = useMemo(() => {
    if (!supplementThermique || !effectiveConfection) return null;
    const grid = supplementThermique.confections[effectiveConfection];
    if (!grid) return null;
    return lookupPriceClient(grid, largeur, hauteur);
  }, [supplementThermique, effectiveConfection, largeur, hauteur]);

  const prixBase = lookupMain?.price ?? 0;
  const prixThermique = lookupThermiqueSupp?.price ?? 0;
  const prixArticle = prixBase + prixThermique;
  const totalGlobal = prixArticle + (avecPose ? prixPose : 0);

  const validationError = useMemo(() => {
    if (!tissuBase) return "Sélectionne un tissu.";
    if (!activeTissu) return "Ce tissu n'est pas disponible dans cette famille de doublure.";
    if (!effectiveConfection) return "Aucun type de confection disponible pour ce tissu.";
    if (largeur <= 0) return "Largeur invalide.";
    if (hauteur <= 0) return "Hauteur invalide.";
    if (!lookupMain) {
      const grid = activeTissu.confections[effectiveConfection];
      const maxL = grid.largeurs.slice(-1)[0];
      const maxH = grid.hauteurs.slice(-1)[0];
      return `Dimensions hors grille (max ${maxL}×${maxH}cm).`;
    }
    if (doublure === "thermique" && !lookupThermiqueSupp) {
      return "Supplément thermique introuvable pour cette taille.";
    }
    return null;
  }, [
    tissuBase,
    activeTissu,
    effectiveConfection,
    largeur,
    hauteur,
    lookupMain,
    doublure,
    lookupThermiqueSupp,
  ]);

  const handleAdd = () => {
    if (validationError || !lookupMain || !activeTissu || !effectiveConfection) return;

    const articles: BoutiquePieceArticle[] = [];
    const doublureLabel = doublure === "aucune" ? "" : ` · doublure ${doublure}`;
    const montageLabel = category === "rideau" ? ` · ${montage === "paire" ? "Paire" : "Panneau"}` : "";
    const label = `Collection Atmosphère — ${CATEGORY_LABELS[category]} ${tissuBase}`;

    const colorisLabel = coloris.trim() ? ` · coloris ${coloris.trim()}` : "";
    articles.push({
      type: category === "rideau" ? "rideau" : "store",
      designation: label,
      ref: tissuBase,
      detail:
        `${CONFECTION_LABELS[effectiveConfection] ?? effectiveConfection} · ${largeur}×${hauteur}cm` +
        montageLabel +
        doublureLabel +
        colorisLabel +
        (activeTissu.laize ? ` · laize ${activeTissu.laize}cm` : "") +
        ` · seuil grille ${lookupMain.largeurSeuil}×${lookupMain.hauteurSeuil}cm`,
      qty: 1,
      unitLabel: "u",
      unitPriceHt: prixArticle,
      meta: {
        typeArticle: "new_collection_atmosphere",
        category,
        tissu: tissuBase,
        family: activeTissu.family,
        tissuId: activeTissu.id,
        confection: effectiveConfection,
        doublure,
        montage: category === "rideau" ? montage : null,
        coloris: coloris.trim() || null,
        largeur,
        hauteur,
        laize: activeTissu.laize,
        largeurSeuil: lookupMain.largeurSeuil,
        hauteurSeuil: lookupMain.hauteurSeuil,
        prixBase,
        prixSupplementThermique: prixThermique,
        prixAllIn: prixArticle,
        // Marqueur pour l'auto-supplier "Collection Atmosphere" dans BC
        supplierPreferHint: "collection_atmosphere",
      },
    });

    if (avecPose && prixPose > 0) {
      articles.push({
        type: category === "rideau" ? "rideau" : "store",
        designation: `Pose ${CATEGORY_LABELS[category]} (Collection)`,
        ref: undefined,
        detail: `${largeur}×${hauteur}cm`,
        qty: 1,
        unitLabel: "forfait",
        unitPriceHt: prixPose,
        meta: {
          typeArticle: category === "rideau" ? "pose_rideau" : "pose_store",
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
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCategory(c);
                  setTissuBase("");
                }}
                className={
                  "text-[12px] font-semibold rounded-[5px] transition-colors " +
                  (category === c ? "bg-ink text-white" : "text-muted hover:text-ink")
                }
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </section>

        {/* Tissu */}
        <section>
          <p className="eyebrow mb-2">Tissu</p>
          <Select
            value={tissuBase}
            onChange={(e) => setTissuBase(e.target.value)}
            disabled={loading || availableTissuBaseNames.length === 0}
          >
            <option value="">
              {loading
                ? "Chargement des tissus…"
                : availableTissuBaseNames.length === 0
                  ? "Aucun tissu — /paramètres → Boutique tarifs"
                  : "— Choisir un tissu —"}
            </option>
            {availableTissuBaseNames.map((bn) => (
              <option key={bn} value={bn}>
                {bn}
              </option>
            ))}
          </Select>
          <Hint>
            {loading ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> chargement
              </span>
            ) : (
              <>Grille tarifaire officielle · éditable dans /paramètres → Boutique tarifs</>
            )}
          </Hint>
        </section>

        {/* Coloris libre — visible seulement pour enrouleur / screen */}
        {(category === "store_enrouleur" || category === "store_screen") && (
          <section>
            <p className="eyebrow mb-2">Coloris</p>
            <Input
              value={coloris}
              onChange={(e) => setColoris(e.target.value)}
              placeholder="ex : Blanc lin · Sable · Anthracite…"
            />
            <Hint>Coloris affiché sur le devis et le bon de commande.</Hint>
          </section>
        )}

        {/* Doublure — visible seulement pour rideau + store bateau
             (Enrouleur / Screen n'ont pas de notion de doublure). */}
        {(category === "rideau" || category === "store_bateau") && (
          <section>
            <p className="eyebrow mb-2">Doublure</p>
            <div className="grid grid-cols-3 gap-1 rounded-md border border-line p-0.5 bg-white h-10">
              {DOUBLURE_OPTIONS.map((o) => {
                const disabled = tissuBase !== "" && !availableDoublures.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => !disabled && setDoublure(o.value)}
                    disabled={disabled}
                    className={
                      "text-[12px] font-semibold rounded-[5px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed " +
                      (doublure === o.value
                        ? "bg-ink text-white"
                        : "text-muted hover:text-ink")
                    }
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            <Hint>
              {DOUBLURE_OPTIONS.find((o) => o.value === doublure)?.hint}
              {tissuBase !== "" && availableDoublures.length < 3 && (
                <> · certaines doublures indisponibles pour ce tissu</>
              )}
            </Hint>
          </section>
        )}

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

        {/* Montage (rideau uniquement, pas d'impact prix) */}
        {category === "rideau" && (
          <section>
            <p className="eyebrow mb-2">Montage</p>
            <div className="grid grid-cols-2 gap-1 rounded-md border border-line p-0.5 bg-white h-10">
              {(["panneau", "paire"] as Montage[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMontage(m)}
                  className={
                    "text-[12px] font-semibold rounded-[5px] transition-colors capitalize " +
                    (montage === m ? "bg-ink text-white" : "text-muted hover:text-ink")
                  }
                >
                  {m}
                </button>
              ))}
            </div>
            <Hint>Paire ou panneau : prix identique.</Hint>
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
            <div className="mt-3 max-w-[220px]">
              <Label>Prix pose (€)</Label>
              <Input
                type="number"
                step="1"
                min={0}
                value={prixPose || ""}
                onChange={(e) => setPrixPoseOverride(Number(e.target.value) || 0)}
              />
              <Hint>
                {prixPoseOverride === null && prixPoseAuto != null && (
                  <>Auto : {prixPoseAuto}€ (grille pose {category === "rideau" ? "rideaux" : "stores"})</>
                )}
                {prixPoseOverride === null && prixPoseAuto == null && (
                  <>Aucun tarif grille pour cette dimension — saisis manuellement</>
                )}
                {prixPoseOverride !== null && (
                  <>
                    Manuel · <button
                      type="button"
                      onClick={() => setPrixPoseOverride(null)}
                      className="text-violet-strong hover:underline"
                    >
                      revenir à l'auto ({prixPoseAuto ?? "?"}€)
                    </button>
                  </>
                )}
              </Hint>
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
                label={`${tissuBase} · ${CONFECTION_LABELS[effectiveConfection ?? ""] ?? ""}`}
                value={prixBase}
              />
              {prixThermique > 0 && (
                <Row label="Supplément thermique" value={prixThermique} />
              )}
              {avecPose && prixPose > 0 && <Row label="Pose" value={prixPose} />}
              <div className="mt-2 pt-2 border-t border-line flex items-center justify-between">
                <span className="text-[13px] font-semibold text-ink">Total HT</span>
                <span className="text-[15px] font-semibold text-ink tabular-nums">
                  {eurFmt.format(totalGlobal)}
                </span>
              </div>
              <p className="text-[11px] text-muted-2 pt-2">
                Grille : {lookupMain?.largeurSeuil}×{lookupMain?.hauteurSeuil}cm (seuil arrondi)
                {activeTissu ? ` · famille ${activeTissu.family}` : ""}
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
