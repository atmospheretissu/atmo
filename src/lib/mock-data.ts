export type DevisStatus =
  | "brouillon"
  | "envoye"
  | "valide"
  | "acompte_recu"
  | "refuse"
  | "expire";

export type Channel =
  | "magasin"
  | "leroy_merlin"
  | "ecommerce"
  | "decoratrice"
  | "visio";

export type Devis = {
  id: string;
  number: string;
  version: number;
  client: {
    name: string;
    city: string;
    email: string;
  };
  channel: Channel;
  product: string;
  productDetail: string;
  qty: number;
  totalHT: number;
  totalTTC: number;
  acompte: number;
  status: DevisStatus;
  commercial: string;
  createdAt: Date;
  updatedAt: Date;
  validUntil: Date;
};

const today = new Date();
const d = (offsetDays: number) => {
  const dd = new Date(today);
  dd.setDate(dd.getDate() + offsetDays);
  return dd;
};

export const channelLabels: Record<Channel, string> = {
  magasin: "Magasin",
  leroy_merlin: "Leroy Merlin",
  ecommerce: "E-commerce",
  decoratrice: "Décoratrice",
  visio: "Visio",
};

export const statusLabels: Record<DevisStatus, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  valide: "Validé",
  acompte_recu: "Acompte reçu",
  refuse: "Refusé",
  expire: "Expiré",
};

export const statusTones: Record<DevisStatus, "neutral" | "info" | "accent" | "success" | "warning" | "danger" | "muted"> = {
  brouillon: "muted",
  envoye: "info",
  valide: "accent",
  acompte_recu: "success",
  refuse: "danger",
  expire: "warning",
};

export const devisList: Devis[] = [
  {
    id: "1",
    number: "DEV-2026-0142",
    version: 2,
    client: { name: "Mme Larochelle, Hélène", city: "Bordeaux 33000", email: "h.larochelle@orange.fr" },
    channel: "magasin",
    product: "Rideaux sur mesure",
    productDetail: "Salon + chambre · Casamance Saumon",
    qty: 4,
    totalHT: 2845.0,
    totalTTC: 3414.0,
    acompte: 1707.0,
    status: "acompte_recu",
    commercial: "Camille Morel",
    createdAt: d(-12),
    updatedAt: d(-2),
    validUntil: d(18),
  },
  {
    id: "2",
    number: "DEV-2026-0141",
    version: 1,
    client: { name: "M. Vasseur, Antoine", city: "Mérignac 33700", email: "a.vasseur@gmail.com" },
    channel: "leroy_merlin",
    product: "Stores bateau",
    productDetail: "Cuisine + salle à manger · Linder collection Ottoman",
    qty: 3,
    totalHT: 1290.0,
    totalTTC: 1548.0,
    acompte: 774.0,
    status: "envoye",
    commercial: "Théo Lambert",
    createdAt: d(-5),
    updatedAt: d(-5),
    validUntil: d(25),
  },
  {
    id: "3",
    number: "DEV-2026-0140",
    version: 3,
    client: { name: "Famille Rivière", city: "Le Bouscat 33110", email: "famille.riviere@free.fr" },
    channel: "decoratrice",
    product: "Rideaux + recouvrement banquette",
    productDetail: "Casamance Ekos · cuir camel banquette atelier",
    qty: 6,
    totalHT: 4920.0,
    totalTTC: 5904.0,
    acompte: 2952.0,
    status: "valide",
    commercial: "Camille Morel",
    createdAt: d(-8),
    updatedAt: d(-1),
    validUntil: d(22),
  },
  {
    id: "4",
    number: "DEV-2026-0139",
    version: 1,
    client: { name: "M. Castellane, Pierre", city: "Talence 33400", email: "p.castellane@outlook.fr" },
    channel: "leroy_merlin",
    product: "Stores enrouleurs Collection",
    productDetail: "Collection Atmosphère · stocks Pologne",
    qty: 5,
    totalHT: 685.0,
    totalTTC: 822.0,
    acompte: 411.0,
    status: "envoye",
    commercial: "Théo Lambert",
    createdAt: d(-3),
    updatedAt: d(-3),
    validUntil: d(27),
  },
  {
    id: "5",
    number: "DEV-2026-0138",
    version: 1,
    client: { name: "Mme Coppola, Élise", city: "Bordeaux 33200", email: "elise.coppola@me.com" },
    channel: "visio",
    product: "Rideaux occultants",
    productDetail: "Chambre parentale · doublure occultante noire",
    qty: 2,
    totalHT: 1240.0,
    totalTTC: 1488.0,
    acompte: 744.0,
    status: "envoye",
    commercial: "Camille Morel",
    createdAt: d(-1),
    updatedAt: d(-1),
    validUntil: d(29),
  },
  {
    id: "6",
    number: "DEV-2026-0137",
    version: 2,
    client: { name: "M. Audebert, Jean-François", city: "Cestas 33610", email: "jf.audebert@laposte.net" },
    channel: "magasin",
    product: "Rideaux + voilage",
    productDetail: "Linder Velours Mohair · voilage lin lavé",
    qty: 4,
    totalHT: 3420.0,
    totalTTC: 4104.0,
    acompte: 2052.0,
    status: "valide",
    commercial: "Camille Morel",
    createdAt: d(-15),
    updatedAt: d(-4),
    validUntil: d(15),
  },
  {
    id: "7",
    number: "DEV-2026-0136",
    version: 1,
    client: { name: "Atelier Cosse & Fils", city: "Pessac 33600", email: "contact@cossefils.fr" },
    channel: "magasin",
    product: "Papier peint + peinture",
    productDetail: "Réfection bureau professionnel",
    qty: 12,
    totalHT: 1845.0,
    totalTTC: 2214.0,
    acompte: 1107.0,
    status: "expire",
    commercial: "Théo Lambert",
    createdAt: d(-42),
    updatedAt: d(-30),
    validUntil: d(-12),
  },
  {
    id: "8",
    number: "DEV-2026-0135",
    version: 1,
    client: { name: "M. Boulanger, Stéphane", city: "Arcachon 33120", email: "s.boulanger@wanadoo.fr" },
    channel: "decoratrice",
    product: "Stores vénitiens bois",
    productDetail: "Maison de plage · bois noyer 50mm",
    qty: 8,
    totalHT: 2660.0,
    totalTTC: 3192.0,
    acompte: 1596.0,
    status: "brouillon",
    commercial: "Théo Lambert",
    createdAt: d(0),
    updatedAt: d(0),
    validUntil: d(30),
  },
  {
    id: "9",
    number: "DEV-2026-0134",
    version: 1,
    client: { name: "Mme Tournier, Sophie", city: "Bègles 33130", email: "s.tournier@gmail.com" },
    channel: "leroy_merlin",
    product: "Coussins + plaid",
    productDetail: "Collection Atmosphère · velours moutarde",
    qty: 8,
    totalHT: 320.0,
    totalTTC: 384.0,
    acompte: 192.0,
    status: "refuse",
    commercial: "Camille Morel",
    createdAt: d(-9),
    updatedAt: d(-6),
    validUntil: d(21),
  },
];

// Dossiers (workshop / commande complete)
export type DossierItem = {
  id: string;
  type: "tissu" | "rail" | "accessoire" | "autre" | "confection";
  label: string;
  ref: string;
  supplier: string;
  status: "commande" | "recu" | "en_attente" | "confection";
  qrCode: string;
};

export type Dossier = {
  id: string;
  number: string;
  client: string;
  city: string;
  itemsReceived: number;
  itemsTotal: number;
  status: "en_cours" | "tout_commande" | "reception_partielle" | "en_confection" | "pret_pose" | "planifie" | "pose";
  soldeRegle: boolean;
  totalTTC: number;
  scheduledFor?: Date;
  items: DossierItem[];
};

export const dossiers: Dossier[] = [
  {
    id: "d1",
    number: "DOS-2026-0142",
    client: "Mme Larochelle, Hélène",
    city: "Bordeaux 33000",
    itemsReceived: 4,
    itemsTotal: 5,
    status: "reception_partielle",
    soldeRegle: false,
    totalTTC: 3414.0,
    items: [
      { id: "i1", type: "tissu", label: "Casamance Saumon — 12m", ref: "CAS-SAU-204", supplier: "Casamance", status: "recu", qrCode: "QR-A1" },
      { id: "i2", type: "tissu", label: "Doublure occultante — 8m", ref: "DBL-OCC-12", supplier: "Linder", status: "recu", qrCode: "QR-A2" },
      { id: "i3", type: "rail", label: "Rail DS — 320cm × 2", ref: "DS-320", supplier: "Interstil", status: "commande", qrCode: "QR-A3" },
      { id: "i4", type: "accessoire", label: "Embouts laiton brossé", ref: "EMB-LB-12", supplier: "Interstil", status: "recu", qrCode: "QR-A4" },
      { id: "i5", type: "confection", label: "Confection 4 rideaux plis flamand", ref: "CFC-RID-4", supplier: "Couturière Brigitte M.", status: "confection", qrCode: "QR-A5" },
    ],
  },
  {
    id: "d2",
    number: "DOS-2026-0137",
    client: "M. Audebert, Jean-François",
    city: "Cestas 33610",
    itemsReceived: 5,
    itemsTotal: 5,
    status: "pret_pose",
    soldeRegle: true,
    totalTTC: 4104.0,
    scheduledFor: d(3),
    items: [
      { id: "i6", type: "tissu", label: "Linder Velours Mohair — 14m", ref: "LIN-V12", supplier: "Linder", status: "recu", qrCode: "QR-B1" },
      { id: "i7", type: "tissu", label: "Voilage Lin lavé — 8m", ref: "LIN-N04", supplier: "Linder", status: "recu", qrCode: "QR-B2" },
      { id: "i8", type: "rail", label: "Tringle Interstil laiton 360cm × 2", ref: "INT-LB-360", supplier: "Interstil", status: "recu", qrCode: "QR-B3" },
      { id: "i9", type: "accessoire", label: "Embrasses cuir camel", ref: "EMB-CC-4", supplier: "Houlès", status: "recu", qrCode: "QR-B4" },
      { id: "i10", type: "confection", label: "Confection 4 rideaux + 2 voilages", ref: "CFC-RV-6", supplier: "Couturière Brigitte M.", status: "recu", qrCode: "QR-B5" },
    ],
  },
  {
    id: "d3",
    number: "DOS-2026-0140",
    client: "Famille Rivière",
    city: "Le Bouscat 33110",
    itemsReceived: 2,
    itemsTotal: 6,
    status: "tout_commande",
    soldeRegle: false,
    totalTTC: 5904.0,
    items: [
      { id: "i11", type: "tissu", label: "Casamance Ekos Ardoise — 18m", ref: "CAS-301", supplier: "Casamance", status: "commande", qrCode: "QR-C1" },
      { id: "i12", type: "tissu", label: "Cuir camel banquette — 4m²", ref: "CUI-CAM-4", supplier: "Tanneries Roux", status: "commande", qrCode: "QR-C2" },
      { id: "i13", type: "rail", label: "Rail CV vague 240cm × 3", ref: "CV-240", supplier: "Interstil", status: "recu", qrCode: "QR-C3" },
      { id: "i14", type: "accessoire", label: "Mousse haute densité banquette", ref: "MSE-HD-4", supplier: "Atelier Roux", status: "recu", qrCode: "QR-C4" },
      { id: "i15", type: "confection", label: "Confection 6 rideaux plis vague", ref: "CFC-RID-6", supplier: "Couturière Brigitte M.", status: "en_attente", qrCode: "QR-C5" },
      { id: "i16", type: "confection", label: "Recouvrement banquette", ref: "CFC-BNQ", supplier: "Atelier Roux", status: "en_attente", qrCode: "QR-C6" },
    ],
  },
  {
    id: "d4",
    number: "DOS-2026-0145",
    client: "M. Vasseur, Antoine",
    city: "Mérignac 33700",
    itemsReceived: 0,
    itemsTotal: 4,
    status: "en_cours",
    soldeRegle: false,
    totalTTC: 1548.0,
    items: [
      { id: "i17", type: "tissu", label: "Linder Ottoman — 8m", ref: "LIN-OTT-8", supplier: "Linder", status: "commande", qrCode: "QR-D1" },
      { id: "i18", type: "accessoire", label: "Mécanisme bateau × 3", ref: "MEC-BAT-3", supplier: "Decotex", status: "commande", qrCode: "QR-D2" },
      { id: "i19", type: "accessoire", label: "Cordons et plombs", ref: "ACC-CP-3", supplier: "Decotex", status: "en_attente", qrCode: "QR-D3" },
      { id: "i20", type: "confection", label: "Confection 3 stores bateau", ref: "CFC-STB-3", supplier: "Couturière Sandra L.", status: "en_attente", qrCode: "QR-D4" },
    ],
  },
  {
    id: "d5",
    number: "DOS-2026-0143",
    client: "Mme Coppola, Élise",
    city: "Bordeaux 33200",
    itemsReceived: 3,
    itemsTotal: 3,
    status: "en_confection",
    soldeRegle: false,
    totalTTC: 1488.0,
    items: [
      { id: "i21", type: "tissu", label: "Casamance Ekos Ardoise — 6m", ref: "CAS-301", supplier: "Casamance", status: "recu", qrCode: "QR-E1" },
      { id: "i22", type: "tissu", label: "Doublure occultante noire — 4m", ref: "DBL-OCC-4", supplier: "Linder", status: "recu", qrCode: "QR-E2" },
      { id: "i23", type: "confection", label: "Confection 2 rideaux occultants", ref: "CFC-OCC-2", supplier: "Couturière Brigitte M.", status: "confection", qrCode: "QR-E3" },
    ],
  },
  {
    id: "d6",
    number: "DOS-2026-0138",
    client: "M. Boulanger, Stéphane",
    city: "Arcachon 33120",
    itemsReceived: 8,
    itemsTotal: 8,
    status: "pose",
    soldeRegle: true,
    totalTTC: 3192.0,
    items: [],
  },
];

/* Suppliers — for BC list and franco */
export type Fournisseur = {
  id: string;
  name: string;
  country: string;
  franco: number;
  language: "FR" | "EN" | "PL" | "UA";
  type: "tissu" | "rail" | "accessoire" | "couture" | "autre";
  contact: string;
};

export const fournisseurs: Fournisseur[] = [
  { id: "f1", name: "Casamance", country: "FR", franco: 500, language: "FR", type: "tissu", contact: "commandes@casamance.fr" },
  { id: "f2", name: "Linder", country: "FR", franco: 800, language: "FR", type: "tissu", contact: "pro@linder.fr" },
  { id: "f3", name: "Interstil", country: "DE", franco: 1200, language: "EN", type: "rail", contact: "orders@interstil.de" },
  { id: "f4", name: "Atelier Pologne", country: "PL", franco: 2000, language: "PL", type: "tissu", contact: "kontakt@atelier-tkanin.pl" },
  { id: "f5", name: "Atelier Ukraine", country: "UA", franco: 1500, language: "UA", type: "tissu", contact: "info@tkani-ukr.com.ua" },
  { id: "f6", name: "Houlès", country: "FR", franco: 300, language: "FR", type: "accessoire", contact: "pro@houles.com" },
  { id: "f7", name: "Decotex", country: "FR", franco: 250, language: "FR", type: "accessoire", contact: "commandes@decotex.fr" },
];

/* Supplier orders */
export type BonCommande = {
  id: string;
  number: string;
  supplier: string;
  supplierId: string;
  dossier: string;
  amount: number;
  franco: number;
  status: "brouillon" | "envoye" | "confirme" | "expedie" | "recu" | "probleme";
  items: number;
  createdAt: Date;
  expectedAt?: Date;
  receivedAt?: Date;
  language: "FR" | "EN" | "PL" | "UA";
};

export const bonsCommande: BonCommande[] = [
  { id: "bc1", number: "BC-2026-0089", supplier: "Casamance", supplierId: "f1", dossier: "DOS-2026-0142", amount: 1640, franco: 500, status: "recu", items: 2, createdAt: d(-12), expectedAt: d(-6), receivedAt: d(-5), language: "FR" },
  { id: "bc2", number: "BC-2026-0090", supplier: "Interstil", supplierId: "f3", dossier: "DOS-2026-0142", amount: 220, franco: 1200, status: "envoye", items: 1, createdAt: d(-10), expectedAt: d(-2), language: "EN" },
  { id: "bc3", number: "BC-2026-0091", supplier: "Linder", supplierId: "f2", dossier: "DOS-2026-0142", amount: 145, franco: 800, status: "recu", items: 1, createdAt: d(-12), expectedAt: d(-7), receivedAt: d(-6), language: "FR" },
  { id: "bc4", number: "BC-2026-0092", supplier: "Linder", supplierId: "f2", dossier: "DOS-2026-0137", amount: 1820, franco: 800, status: "recu", items: 2, createdAt: d(-18), expectedAt: d(-10), receivedAt: d(-9), language: "FR" },
  { id: "bc5", number: "BC-2026-0093", supplier: "Casamance", supplierId: "f1", dossier: "DOS-2026-0140", amount: 312, franco: 500, status: "brouillon", items: 1, createdAt: d(0), language: "FR" },
  { id: "bc6", number: "BC-2026-0094", supplier: "Tanneries Roux", supplierId: "f1", dossier: "DOS-2026-0140", amount: 480, franco: 300, status: "envoye", items: 1, createdAt: d(-3), expectedAt: d(4), language: "FR" },
  { id: "bc7", number: "BC-2026-0095", supplier: "Linder", supplierId: "f2", dossier: "DOS-2026-0145", amount: 540, franco: 800, status: "envoye", items: 1, createdAt: d(-2), expectedAt: d(6), language: "FR" },
  { id: "bc8", number: "BC-2026-0096", supplier: "Decotex", supplierId: "f7", dossier: "DOS-2026-0145", amount: 168, franco: 250, status: "brouillon", items: 2, createdAt: d(-1), language: "FR" },
  { id: "bc9", number: "BC-2026-0088", supplier: "Houlès", supplierId: "f6", dossier: "DOS-2026-0137", amount: 320, franco: 300, status: "recu", items: 1, createdAt: d(-15), expectedAt: d(-12), receivedAt: d(-11), language: "FR" },
];

/* Couturières */
export type Couturiere = {
  id: string;
  name: string;
  internal: boolean;
  specialties: string[];
  charge: number;
  pieces: number;
  delais: number;
};

export const couturieres: Couturiere[] = [
  { id: "c1", name: "Brigitte M.", internal: true, specialties: ["Rideaux", "Voilages", "Plis flamand"], charge: 75, pieces: 6, delais: 96 },
  { id: "c2", name: "Sandra L.", internal: true, specialties: ["Stores bateau", "Stores roman"], charge: 40, pieces: 3, delais: 98 },
  { id: "c3", name: "Atelier Roux", internal: false, specialties: ["Banquettes", "Recouvrement"], charge: 60, pieces: 2, delais: 94 },
  { id: "c4", name: "Marie-Hélène D.", internal: false, specialties: ["Coussins", "Plaids"], charge: 25, pieces: 5, delais: 100 },
];

/* Poseurs */
export type Poseur = {
  id: string;
  name: string;
  internal: boolean;
  zone: string;
  upcoming: number;
};

export const poseurs: Poseur[] = [
  { id: "p1", name: "Romain T.", internal: true, zone: "Bordeaux Centre + 30 km", upcoming: 5 },
  { id: "p2", name: "Karim H.", internal: true, zone: "Bordeaux Sud-Est", upcoming: 3 },
  { id: "p3", name: "Julien P.", internal: false, zone: "Arcachon · Bassin", upcoming: 2 },
];

/* Poses planifiées */
export type Pose = {
  id: string;
  dossier: string;
  client: string;
  city: string;
  address: string;
  products: string;
  date: Date;
  duration: number;
  poseur: string;
  poseurId: string;
  status: "a_planifier" | "planifie" | "confirme" | "pose";
  notes?: string;
  phone: string;
};

export const poses: Pose[] = [
  {
    id: "po1",
    dossier: "DOS-2026-0137",
    client: "M. Audebert, Jean-François",
    city: "Cestas 33610",
    address: "12 allée des Pins · 33610 Cestas",
    products: "4 rideaux plis flamand · 2 voilages · 2 tringles laiton",
    date: d(3),
    duration: 180,
    poseur: "Romain T.",
    poseurId: "p1",
    status: "confirme",
    notes: "Accès portail B1234 · garer dans la cour",
    phone: "06 12 34 56 78",
  },
  {
    id: "po2",
    dossier: "DOS-2026-0143",
    client: "Mme Coppola, Élise",
    city: "Bordeaux 33200",
    address: "78 rue Judaïque · 33200 Bordeaux",
    products: "2 rideaux occultants noirs · chambre parentale",
    date: d(4),
    duration: 120,
    poseur: "Romain T.",
    poseurId: "p1",
    status: "planifie",
    notes: "Appartement 3e étage · ascenseur",
    phone: "06 78 90 12 34",
  },
  {
    id: "po3",
    dossier: "DOS-2026-0142",
    client: "Mme Larochelle, Hélène",
    city: "Bordeaux 33000",
    address: "42 cours du Maréchal Foch · 33000 Bordeaux",
    products: "4 rideaux plis flamand · 2 rails DS électrifiables",
    date: d(7),
    duration: 240,
    poseur: "Karim H.",
    poseurId: "p2",
    status: "a_planifier",
    notes: "Pose dès que tout est reçu (rail DS attendu J+1)",
    phone: "06 22 33 44 55",
  },
  {
    id: "po4",
    dossier: "DOS-2026-0140",
    client: "Famille Rivière",
    city: "Le Bouscat 33110",
    address: "8 avenue de la République · 33110 Le Bouscat",
    products: "6 rideaux + banquette recouverte cuir camel",
    date: d(10),
    duration: 300,
    poseur: "Romain T.",
    poseurId: "p1",
    status: "a_planifier",
    notes: "⚠ Solde 2952€ à encaisser avant pose",
    phone: "05 56 12 34 56",
  },
  {
    id: "po5",
    dossier: "DOS-2026-0138",
    client: "M. Boulanger, Stéphane",
    city: "Arcachon 33120",
    address: "15 boulevard de la Plage · 33120 Arcachon",
    products: "8 stores vénitiens bois noyer 50mm",
    date: d(-2),
    duration: 180,
    poseur: "Julien P.",
    poseurId: "p3",
    status: "pose",
    phone: "06 55 44 33 22",
  },
];

export const dossierStatusLabels: Record<Dossier["status"], string> = {
  en_cours: "En cours de commande",
  tout_commande: "Tout commandé",
  reception_partielle: "Réception partielle",
  en_confection: "En confection",
  pret_pose: "Prêt pour pose",
  planifie: "Planifié",
  pose: "Posé / Livré",
};

export const dossierStatusTones: Record<Dossier["status"], "muted" | "blue" | "amber" | "violet" | "emerald" | "pink" | "neutral"> = {
  en_cours: "muted",
  tout_commande: "blue",
  reception_partielle: "amber",
  en_confection: "violet",
  pret_pose: "emerald",
  planifie: "pink",
  pose: "neutral",
};

export const bcStatusLabels: Record<BonCommande["status"], string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  confirme: "Confirmé",
  expedie: "Expédié",
  recu: "Reçu",
  probleme: "Problème",
};

export const bcStatusTones: Record<BonCommande["status"], "muted" | "blue" | "violet" | "amber" | "emerald" | "danger"> = {
  brouillon: "muted",
  envoye: "blue",
  confirme: "violet",
  expedie: "amber",
  recu: "emerald",
  probleme: "danger",
};

export const poseStatusLabels: Record<Pose["status"], string> = {
  a_planifier: "À planifier",
  planifie: "Planifié",
  confirme: "Confirmé client",
  pose: "Posé",
};

export const poseStatusTones: Record<Pose["status"], "amber" | "blue" | "emerald" | "neutral"> = {
  a_planifier: "amber",
  planifie: "blue",
  confirme: "emerald",
  pose: "neutral",
};

export const kpis = {
  devisEnvoyes: { value: 47, delta: 12, period: "30 j" },
  caCommandes: { value: 84200, delta: 8.2, period: "30 j" },
  acompteEnAttente: { value: 8430, count: 5 },
  dossiersActifs: { value: 23, retards: 2 },
  posesPlanifiees: { value: 6, period: "7 j" },
  fraisRetentionLm: { value: 14, change: -2 },
};

export const flowSteps = [
  { label: "Devis", count: 12, tone: "info" as const },
  { label: "Acompte", count: 5, tone: "accent" as const },
  { label: "Confection", count: 7, tone: "warning" as const },
  { label: "Réception", count: 4, tone: "info" as const },
  { label: "Prêt", count: 3, tone: "success" as const },
  { label: "Posé", count: 18, tone: "muted" as const },
];

export type Alert = {
  id: string;
  type: "retard_acompte" | "franco" | "retard_pose" | "solde_impaye" | "element_manquant";
  severity: "warning" | "danger" | "info";
  title: string;
  detail: string;
  ref: string;
  date: Date;
};

export const alerts: Alert[] = [
  {
    id: "a1",
    type: "retard_acompte",
    severity: "warning",
    title: "Acompte en attente · 8 jours",
    detail: "DEV-2026-0137 — Mme Audebert — relance automatique J+2",
    ref: "DEV-2026-0137",
    date: d(-8),
  },
  {
    id: "a2",
    type: "franco",
    severity: "info",
    title: "Franco Casamance non atteint",
    detail: "Commande en cours 312 € · Franco 500 € — regrouper 2 autres dossiers possibles",
    ref: "BC-2026-0089",
    date: d(0),
  },
  {
    id: "a3",
    type: "solde_impaye",
    severity: "danger",
    title: "Pose bloquée · solde impayé",
    detail: "DOS-2026-0140 — Tous éléments reçus mais 2 952 € de solde restant dû",
    ref: "DOS-2026-0140",
    date: d(-1),
  },
  {
    id: "a4",
    type: "element_manquant",
    severity: "warning",
    title: "Rail DS en retard · 6 jours",
    detail: "DOS-2026-0142 — Larochelle · attendu pour J+1 dossier complet",
    ref: "DOS-2026-0142",
    date: d(-6),
  },
];

// Simulator catalog
export const tissus = [
  { ref: "CAS-204", name: "Casamance · Saumon", price: 78, width: 140, raccord: 32 },
  { ref: "CAS-301", name: "Casamance · Ekos Ardoise", price: 92, width: 140, raccord: 64 },
  { ref: "LIN-V12", name: "Linder · Velours Mohair", price: 124, width: 150, raccord: 0 },
  { ref: "LIN-N04", name: "Linder · Lin Naturel", price: 56, width: 280, raccord: 0 },
  { ref: "POL-A22", name: "Atelier Pologne · Coton tissé", price: 28, width: 160, raccord: 0 },
  { ref: "UKR-D11", name: "Atelier Ukraine · Damas crème", price: 34, width: 145, raccord: 40 },
];

export const teteRideau = [
  { id: "flamand", label: "Plis flamand", coef: 2.4 },
  { id: "vague", label: "Plis vague (wave)", coef: 2.1 },
  { id: "oeillets", label: "Œillets", coef: 1.8 },
  { id: "simple", label: "Plis simple piqué", coef: 2.0 },
];

export const doublures = [
  { id: "none", label: "Aucune", price: 0 },
  { id: "thermique", label: "Doublure thermique", price: 14 },
  { id: "occultante", label: "Occultante noire", price: 18 },
  { id: "lin", label: "Lin lavé écru", price: 22 },
];

export const rails = [
  { id: "ds", label: "Rail DS électrifiable", priceCm: 0.34 },
  { id: "dv", label: "Rail DV discret", priceCm: 0.22 },
  { id: "cs", label: "Rail CS courbable", priceCm: 0.48 },
  { id: "cv", label: "Rail CV vague", priceCm: 0.56 },
  { id: "interstil", label: "Tringle Interstil laiton", priceCm: 0.62 },
];
