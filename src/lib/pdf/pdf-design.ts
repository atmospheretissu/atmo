/**
 * Design tokens partagés par tous les PDFs (devis, BC, facture, fiche).
 *
 * Règle critique pour @react-pdf : toujours définir un `lineHeight` explicite
 * sur les gros textes (titres, hero values), sinon la lineHeight par défaut
 * du Page (1.4) provoque des chevauchements quand le bloc suivant a un
 * marginTop calculé sur la fontSize seule.
 */

export const COLORS = {
  ink: "#0F1115",
  text: "#1F2937",
  textMuted: "#6B7280",
  textFaint: "#9CA3AF",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  surface: "#F9FAFB",
  surfaceSoft: "#F3F4F6",
  accent: "#7C3AED",
  accentSoft: "#F5F3FF",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const FONT_SIZE = {
  micro: 7.5,
  small: 8.5,
  body: 9.5,
  bodyLg: 10.5,
  h4: 12,
  h3: 14,
  h2: 18,
  h1: 24,
  hero: 30,
} as const;

export const TYPE = {
  /** Mono small caps for labels (Émetteur, Client, Total TTC…) */
  eyebrow: {
    fontSize: FONT_SIZE.micro,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
    lineHeight: 1.3,
  },
  /** Body text */
  body: {
    fontSize: FONT_SIZE.body,
    color: COLORS.text,
    lineHeight: 1.45,
  },
  bodyMuted: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textMuted,
    lineHeight: 1.45,
  },
  /** For table cells */
  cell: {
    fontSize: FONT_SIZE.body,
    color: COLORS.text,
    lineHeight: 1.35,
  },
  cellBold: {
    fontSize: FONT_SIZE.body,
    color: COLORS.ink,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.35,
  },
  /** Large hero numbers (totaux, montants) — lineHeight 1 = pas de chevauchement */
  heroNumber: {
    fontSize: FONT_SIZE.hero,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    lineHeight: 1.05,
    letterSpacing: -0.4,
  },
  h1: {
    fontSize: FONT_SIZE.h1,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    lineHeight: 1.1,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: FONT_SIZE.h2,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    lineHeight: 1.15,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: FONT_SIZE.h3,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    lineHeight: 1.2,
  },
  /** Wordmark "Atmosphère." en haut de chaque doc */
  wordmark: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    lineHeight: 1.05,
    letterSpacing: -0.4,
  },
};

export const PAGE = {
  /** Marges intérieures de la page A4 — généreuses pour respirer.
   *  paddingBottom laisse la place pour le footer fixe qui fait ~48 pts
   *  (2 lignes de mention légale + numéro de page + trait). */
  paddingTop: 44,
  paddingBottom: 72,
  paddingHorizontal: 44,
  fontFamily: "Helvetica",
  fontSize: FONT_SIZE.body,
  color: COLORS.text,
  lineHeight: 1.45,
} as const;

/**
 * Informations légales et bancaires — utilisées sur devis, factures et BC.
 * Adresse du siège social : 1 rue de l'Union, Village des Voiles,
 * 59520 Marquette-lez-Lille.
 */
export const COMPANY = {
  legalName: "Atmosphère",
  brand: "Atmosphère Tissus",
  addressLine1: "1 rue de l'Union",
  addressLine2: "Village des Voiles",
  postalCode: "59520",
  city: "Marquette-lez-Lille",
  country: "France",
  email: "contact@atmospheretissus.fr",
  phone: "",
  capital: "SAS au capital de 250 000 €",
  siret: "53381194900049",
  rcs: "R.C.S. Lille métropole 533 811 949",
  codeApe: "4751Z",
  tvaIntra: "FR03533811949",
  iban: "FR76 1350 7000 1431 4825 3216 404",
  bic: "CCBPFRPPLIL",
} as const;

export function companyAddress(): string {
  const l2 = COMPANY.addressLine2 ? `, ${COMPANY.addressLine2}` : "";
  return `${COMPANY.addressLine1}${l2}, ${COMPANY.postalCode} ${COMPANY.city}`;
}

/**
 * Bloc CGV — texte exact fourni par l'entreprise.
 * Utilisé sur devis, facture d'acompte et facture de solde.
 */
export const CGV_SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. Objet",
    body: "Les présentes conditions générales de vente régissent les relations contractuelles entre Atmosphère, ci-après dénommé « le Vendeur », et ses clients, ci-après dénommés « les Clients », pour la vente de produits et services.",
  },
  {
    title: "2. Produits standards et sur mesure",
    body: "a. Les produits standards sont ceux disponibles dans notre catalogue et prêts à être expédiés dès la confirmation de la commande.\n\nb. Les produits sur mesure sont fabriqués selon les spécifications fournies sur le devis et ne peuvent pas être retournés pour remboursement en raison de leur caractère unique, sauf en cas de défaut de fabrication imputable au Vendeur.\n\nPour les rideaux sur mesure, une retouche sera acceptée si la hauteur diffère de +/- 2 cm par rapport aux mesures spécifiées dans le devis, en raison des contraintes techniques de fabrication.\n\nc. Achat de pots de peinture : Les pots de peinture étant fabriqués à la demande du client, ils ne peuvent être ni échangés ni repris. Le Client est seul responsable de l'estimation de la quantité de peinture nécessaire à la réalisation de ses travaux.",
  },
  {
    title: "3. Vérification et responsabilité des mesures transmises",
    body: "Pour toute commande réalisée sur la base de mesures transmises par le Client, que ce soit en magasin, par visioconférence, par email, téléphone ou tout autre moyen à distance, le Client est tenu de vérifier attentivement l'exactitude des dimensions communiquées au moment de la validation de la commande.\n\nLorsque la prise de mesures n'est pas effectuée directement par le Vendeur, la responsabilité de l'exactitude des mesures incombe exclusivement au Client. En conséquence, le Vendeur décline toute responsabilité en cas d'erreur, d'omission ou d'imprécision dans les mesures transmises, et aucune reprise, modification ou remboursement ne pourra être exigé pour ce motif, sauf accord commercial exceptionnel.",
  },
  {
    title: "4. Commande et acompte",
    body: "Toute commande de produit sur mesure nécessite le versement d'un acompte représentant 50 % du montant total de la commande. Le montant de l'acompte est précisé lors de la validation de la commande et son versement valide celle-ci.\n\nTout versement d'acompte engage le Vendeur à acquérir les matériaux nécessaires à la fabrication du produit sur mesure.\n\nCet acompte ne peut pas être remboursé si le client annule sa commande après validation.",
  },
  {
    title: "5. Prix et paiement",
    body: "Les prix des produits sur mesure sont indiqués en euros toutes taxes comprises (TTC). Le solde restant dû, après déduction de l'acompte versé, devra être réglé selon les modalités convenues entre le Vendeur et le Client.",
  },
  {
    title: "6. Délais de livraison",
    body: "Les délais de fabrication et de livraison des produits sur mesure sont communiqués au Client lors de la validation de la commande.\n\nLe Vendeur s'engage à respecter ces délais dans la mesure du possible, mais ne peut être tenu responsable des retards dus à des circonstances indépendantes de sa volonté.",
  },
  {
    title: "7. Garantie",
    body: "Le Vendeur garantit la conformité des produits sur mesure aux spécifications convenues avec le Client. En cas de défaut de fabrication avéré, le Vendeur s'engage à remplacer le produit ou à rembourser le Client selon son choix.",
  },
  {
    title: "8. Responsabilité",
    body: "Le Vendeur décline toute responsabilité en cas de dommages résultant d'une utilisation inappropriée ou abusive des produits sur mesure vendus.",
  },
  {
    title: "9. Force majeure",
    body: "En cas de force majeure ou d'événements imprévisibles rendant impossible l'exécution de la commande, le Vendeur en informera le Client dans les meilleurs délais et proposera une solution alternative ou un remboursement de l'acompte versé.\n\nEn acceptant ces conditions générales de vente, le Client reconnaît avoir pris connaissance et accepté l'ensemble des clauses énoncées ci-dessus.",
  },
];
