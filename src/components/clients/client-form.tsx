"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, Save } from "lucide-react";
import { Input, Label, Select, Hint } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { channelLabels } from "@/lib/validation/client";
import type { Client } from "@/lib/db/clients";
import type { ClientFormState } from "@/app/(platform)/clients/actions";

type Props = {
  /** Si fourni, le formulaire est en mode édition */
  client?: Client;
  /** Server Action à invoquer (create ou update) */
  action: (prev: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  /** Titre du form */
  title: string;
  /** URL de retour */
  cancelHref: string;
};

export function ClientForm({ client, action, title, cancelHref }: Props) {
  const [state, formAction, isPending] = useActionState<ClientFormState, FormData>(
    action,
    undefined
  );

  const errors = state && !state.ok ? state.errors : {};
  const message = state && !state.ok ? state.message : undefined;

  return (
    <form action={formAction} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={cancelHref}
            className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-ink-2 mb-2"
          >
            <ArrowLeft className="h-3 w-3" strokeWidth={2.2} />
            Retour
          </Link>
          <h1 className="text-[32px] font-semibold tracking-tight text-ink leading-[1.1]">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={cancelHref}>
            <Button variant="secondary" size="md" type="button">
              Annuler
            </Button>
          </Link>
          <Button variant="primary" size="md" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Enregistrement…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" strokeWidth={2.4} />
                {client ? "Mettre à jour" : "Créer le client"}
              </>
            )}
          </Button>
        </div>
      </div>

      {message && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-soft text-red text-[12.5px] border border-red/15">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" strokeWidth={2.4} />
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {/* Identité */}
          <Card className="p-5 space-y-4">
            <div>
              <p className="eyebrow mb-3">01 · Identité</p>
            </div>
            <div>
              <Label htmlFor="display_name">Nom complet *</Label>
              <Input
                id="display_name"
                name="display_name"
                placeholder="Mme Larochelle, Hélène"
                defaultValue={client?.display_name ?? ""}
                required
                autoFocus
                aria-invalid={!!errors?.display_name}
              />
              {errors?.display_name && <Hint className="text-red">{errors.display_name}</Hint>}
              <Hint>Format conseillé : "Mme Nom, Prénom" pour faciliter l'archivage.</Hint>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="contact@exemple.fr"
                  defaultValue={client?.email ?? ""}
                  aria-invalid={!!errors?.email}
                />
                {errors?.email && <Hint className="text-red">{errors.email}</Hint>}
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="06 12 34 56 78"
                  defaultValue={client?.phone ?? ""}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="channel">Canal d'entrée *</Label>
              <Select id="channel" name="channel" defaultValue={client?.channel ?? "magasin"} required>
                {Object.entries(channelLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </Card>

          {/* Adresse */}
          <Card className="p-5 space-y-4">
            <div>
              <p className="eyebrow mb-3">02 · Adresse de pose</p>
            </div>
            <div>
              <Label htmlFor="address_pose">Adresse</Label>
              <Input
                id="address_pose"
                name="address_pose"
                placeholder="42 cours du Maréchal Foch"
                defaultValue={client?.address_pose ?? ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  name="city"
                  placeholder="Bordeaux"
                  defaultValue={client?.city ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="postal_code">Code postal</Label>
                <Input
                  id="postal_code"
                  name="postal_code"
                  placeholder="33000"
                  defaultValue={client?.postal_code ?? ""}
                />
              </div>
            </div>
          </Card>

          {/* Notes */}
          <Card className="p-5 space-y-4">
            <div>
              <p className="eyebrow mb-3">03 · Notes & préférences</p>
            </div>
            <div>
              <Label htmlFor="preferences">Préférences notées</Label>
              <textarea
                id="preferences"
                name="preferences"
                rows={3}
                placeholder="Couleurs chaudes, plis flamand uniquement, préfère matinée…"
                defaultValue={client?.preferences ?? ""}
                className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-[13.5px] text-ink placeholder:text-muted-2 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
              />
            </div>
            <div>
              <Label htmlFor="internal_notes">Notes internes</Label>
              <textarea
                id="internal_notes"
                name="internal_notes"
                rows={3}
                placeholder="Pour l'équipe — pas visible côté client. Anecdote, contact urgence, etc."
                defaultValue={client?.internal_notes ?? ""}
                className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-[13.5px] text-ink placeholder:text-muted-2 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
              />
              <Hint>Visible uniquement par l'équipe interne, jamais envoyé au client.</Hint>
            </div>
            <div>
              <Label htmlFor="source_notes">Source du lead (détails)</Label>
              <Input
                id="source_notes"
                name="source_notes"
                placeholder="Recommandation Mme X · LM Mérignac · Insta…"
                defaultValue={client?.source_notes ?? ""}
              />
            </div>
          </Card>
        </div>

        <Card className="p-5 sticky top-20 space-y-3 text-[12.5px] text-muted-2">
          <p className="eyebrow">Conseil</p>
          <p className="leading-relaxed text-ink-2">
            Une fiche client riche permet aux SMS automatiques d'être personnalisés ("Bonjour
            Hélène"), au simulateur de pré-remplir l'adresse, et à la facturation Pennylane
            d'être conforme RGPD du premier coup.
          </p>
          <p className="leading-relaxed pt-2 border-t border-line">
            Tu pourras éditer cette fiche à tout moment depuis sa page.
          </p>
        </Card>
      </div>
    </form>
  );
}
