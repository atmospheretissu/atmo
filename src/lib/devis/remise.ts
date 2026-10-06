/**
 * Remise globale d'un devis — calcul partagé.
 *
 * Demandée le même matin par Pauline (« nous ne pouvons pas effectuer une
 * remise sur les devis pour le client ») et par Pierre-Edouard (« on peut
 * faire aucune remise globale ou à la ligne ? »). C'était exact, et sans
 * contournement : l'éditeur refuse un prix unitaire négatif, donc même une
 * ligne « Remise −50 € » était impossible.
 *
 * Un seul endroit décide du montant, parce qu'il est lu par l'éditeur, le
 * PDF, la page client et le recalcul serveur. Deux implémentations qui
 * divergeraient d'un centime donneraient un devis dont le PDF et le montant
 * encaissé ne concordent pas.
 *
 * Convention posée par la migration 20261006160000 : `subtotal_ht` est le
 * brut, `total_ht` le net. Tout ce qui consommait déjà `total_ht` —
 * acompte, Stripe, facture, export Pennylane — continue de voir le bon
 * montant sans modification.
 */

export type DiscountKind = "none" | "pct" | "amount";

export function parseDiscountKind(raw: string | null | undefined): DiscountKind {
  return raw === "pct" || raw === "amount" ? raw : "none";
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export type RemiseBreakdown = {
  subtotalHt: number;
  /** Montant de la remise en euros HT, toujours positif ou nul. */
  discountHt: number;
  totalHt: number;
  tva: number;
  totalTtc: number;
  /** Pourcentage effectif, utile à l'affichage même pour une remise en euros. */
  effectivePct: number;
};

/**
 * Applique la remise à un sous-total HT et en déduit la TVA.
 *
 * Deux garde-fous : un pourcentage est borné à 100, et un montant fixe
 * supérieur au sous-total est ramené au sous-total. Sans eux, une faute de
 * frappe produirait un devis à montant négatif — donc un paiement Stripe
 * impossible à créer et un avoir involontaire en comptabilité.
 */
export function computeRemise(
  subtotalHt: number,
  kind: DiscountKind,
  value: number,
  tvaRate = 20,
): RemiseBreakdown {
  const sub = round2(Math.max(0, Number(subtotalHt) || 0));
  const v = Math.max(0, Number(value) || 0);

  let discountHt = 0;
  if (kind === "pct") discountHt = round2((sub * Math.min(100, v)) / 100);
  else if (kind === "amount") discountHt = round2(Math.min(sub, v));

  const totalHt = round2(sub - discountHt);
  const tva = round2(totalHt * (Number(tvaRate) / 100));
  return {
    subtotalHt: sub,
    discountHt,
    totalHt,
    tva,
    totalTtc: round2(totalHt + tva),
    effectivePct: sub > 0 ? round2((discountHt / sub) * 100) : 0,
  };
}

/** Somme des lignes, avant remise. */
export function sumLinesHt(
  lines: Array<{ qty: number; unit_price_ht: number }>,
): number {
  return round2(
    lines.reduce(
      (acc, l) => acc + round2(Number(l.qty) * Number(l.unit_price_ht)),
      0,
    ),
  );
}

/** Libellé affiché dans les blocs de totaux, ex. « Remise −10 % ». */
export function remiseLabel(kind: DiscountKind, value: number): string {
  if (kind === "pct") return `Remise −${round2(value)} %`;
  return "Remise";
}
