import { z } from "zod";

/**
 * Schémas de validation des formulaires clients.
 * - Côté serveur : valide les Server Actions avant insert/update DB
 * - Côté client : peut être réutilisé pour valider le form avant submit
 */

export const channelEnum = z.enum([
  "magasin",
  "leroy_merlin",
  "saint_maclou",
  "ecommerce",
  "decoratrice",
  "visio",
]);
export type Channel = z.infer<typeof channelEnum>;

export const channelLabels: Record<Channel, string> = {
  magasin: "Magasin",
  leroy_merlin: "Leroy Merlin",
  saint_maclou: "Saint Maclou",
  ecommerce: "E-commerce",
  decoratrice: "Décoratrice",
  visio: "Visio",
};

export const clientSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, "Le nom doit faire au moins 2 caractères")
    .max(120, "Trop long (max 120 caractères)"),
  email: z
    .string()
    .trim()
    .email("Email invalide")
    .max(120)
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal("")),
  address_pose: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  postal_code: z.string().trim().max(20).optional().or(z.literal("")),
  channel: channelEnum,
  source_notes: z.string().trim().max(500).optional().or(z.literal("")),
  internal_notes: z.string().trim().max(1000).optional().or(z.literal("")),
  preferences: z.string().trim().max(500).optional().or(z.literal("")),
});

export type ClientFormInput = z.infer<typeof clientSchema>;

/**
 * Helper: transforme FormData → objet validable par Zod.
 * Les champs vides deviennent `undefined` pour passer la validation optionnelle.
 */
export function parseClientForm(formData: FormData): {
  data: ClientFormInput | null;
  errors: Record<string, string> | null;
} {
  const raw = {
    display_name: formData.get("display_name")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    phone: formData.get("phone")?.toString() ?? "",
    address_pose: formData.get("address_pose")?.toString() ?? "",
    city: formData.get("city")?.toString() ?? "",
    postal_code: formData.get("postal_code")?.toString() ?? "",
    channel: formData.get("channel")?.toString() ?? "magasin",
    source_notes: formData.get("source_notes")?.toString() ?? "",
    internal_notes: formData.get("internal_notes")?.toString() ?? "",
    preferences: formData.get("preferences")?.toString() ?? "",
  };

  const parsed = clientSchema.safeParse(raw);
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
 * Cleans optional empty strings to null before DB insert/update.
 */
export function clientToDbRow(input: ClientFormInput) {
  return {
    display_name: input.display_name,
    email: input.email || null,
    phone: input.phone || null,
    address_pose: input.address_pose || null,
    city: input.city || null,
    postal_code: input.postal_code || null,
    channel: input.channel,
    source_notes: input.source_notes || null,
    internal_notes: input.internal_notes || null,
    preferences: input.preferences || null,
  };
}
