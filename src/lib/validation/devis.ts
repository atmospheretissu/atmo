import { z } from "zod";
import { channelEnum } from "@/lib/validation/client";

export const devisStatusEnum = z.enum([
  "brouillon",
  "envoye",
  "valide",
  "acompte_recu",
  "refuse",
  "expire",
]);
export type DevisStatus = z.infer<typeof devisStatusEnum>;

export const devisStatusLabels: Record<DevisStatus, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  valide: "Validé",
  acompte_recu: "Acompte reçu",
  refuse: "Refusé",
  expire: "Expiré",
};

export const devisStatusTones: Record<
  DevisStatus,
  "muted" | "info" | "violet" | "emerald" | "danger" | "warning"
> = {
  brouillon: "muted",
  envoye: "info",
  valide: "violet",
  acompte_recu: "emerald",
  refuse: "danger",
  expire: "warning",
};

/**
 * Une ligne de devis (poste de chiffrage).
 */
export const devisLineSchema = z.object({
  ref: z.string().trim().max(40).optional().or(z.literal("")),
  label: z.string().trim().min(1, "Label requis").max(200),
  detail: z.string().trim().max(300).optional().or(z.literal("")),
  qty: z.coerce.number().positive("Quantité > 0"),
  unit_label: z.string().trim().min(1).max(20).default("u"),
  unit_price_ht: z.coerce.number().nonnegative("Prix HT >= 0"),
});
export type DevisLineInput = z.infer<typeof devisLineSchema>;

/**
 * Schema pour la création d'un devis (avec ses lignes).
 */
export const devisCreateSchema = z.object({
  client_id: z.string().uuid("Client invalide"),
  channel: channelEnum,
  product_summary: z
    .string()
    .trim()
    .min(2, "Description du produit requise")
    .max(200),
  product_detail: z.string().trim().max(300).optional().or(z.literal("")),
  tva_rate: z.coerce.number().min(0).max(100).default(20),
  workshop_notes: z.string().trim().max(2000).optional().or(z.literal("")),
  valid_until: z.string().optional().or(z.literal("")), // ISO date
  decoratrice_id: z.string().uuid().optional().or(z.literal("")),
  lines: z.array(devisLineSchema).min(1, "Ajoute au moins une ligne"),
});
export type DevisCreateInput = z.infer<typeof devisCreateSchema>;

/**
 * Parse FormData → { lines, ...fields } pour le simulateur.
 * Convention : les lignes sont serialisées en `lines` JSON string (caché)
 * pour éviter la complexité des arrays dans FormData.
 */
export function parseDevisForm(formData: FormData): {
  data: DevisCreateInput | null;
  errors: Record<string, string> | null;
} {
  let lines: unknown = [];
  try {
    const raw = formData.get("lines")?.toString() ?? "[]";
    lines = JSON.parse(raw);
  } catch {
    return {
      data: null,
      errors: { lines: "Lignes invalides (JSON malformé)" },
    };
  }

  const input = {
    client_id: formData.get("client_id")?.toString() ?? "",
    channel: formData.get("channel")?.toString() ?? "magasin",
    product_summary: formData.get("product_summary")?.toString() ?? "",
    product_detail: formData.get("product_detail")?.toString() ?? "",
    tva_rate: formData.get("tva_rate")?.toString() ?? "20",
    workshop_notes: formData.get("workshop_notes")?.toString() ?? "",
    valid_until: formData.get("valid_until")?.toString() ?? "",
    decoratrice_id: formData.get("decoratrice_id")?.toString() ?? "",
    lines,
  };

  const parsed = devisCreateSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (!errors[path]) errors[path] = issue.message;
    }
    return { data: null, errors };
  }
  return { data: parsed.data, errors: null };
}

/**
 * Calcule les totaux à partir des lignes (côté serveur — source de vérité).
 */
export function computeDevisTotals(
  lines: DevisLineInput[],
  tvaRate = 20
): { total_ht: number; total_ttc: number; tva: number } {
  const total_ht = lines.reduce(
    (acc, l) => acc + Math.round(l.qty * l.unit_price_ht * 100) / 100,
    0
  );
  const tva = Math.round(total_ht * (tvaRate / 100) * 100) / 100;
  const total_ttc = Math.round((total_ht + tva) * 100) / 100;
  return { total_ht, tva, total_ttc };
}
