"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  ArrowRight,
  Send,
  Edit3,
  CheckCircle2,
  Banknote,
  Scissors,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ColorChip } from "@/components/ui/status-pill";
import { sendDevisEmailAction } from "@/app/(platform)/devis/email-actions";

type Props = {
  devisId: string;
  status: string;
  acomptePaid: boolean;
  soldePaid: boolean;
  hasDossier: boolean;
  dossierId: string | null;
  clientHasEmail: boolean;
  /** True quand une signature électronique a été enregistrée. */
  signed?: boolean;
};

type Step = {
  tone: "violet" | "orange" | "emerald" | "amber" | "pink" | "blue";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  /** Lien à suivre. Ignoré si `action` est défini. */
  ctaHref?: string;
  /** Action serveur à déclencher. Si défini, le CTA devient un bouton. */
  action?: "send_devis";
  variant?: "accent" | "primary" | "secondary";
};

function pickNextStep(p: Props): Step | null {
  switch (p.status) {
    case "brouillon":
      return {
        tone: "amber",
        icon: Edit3,
        eyebrow: "Prochaine étape",
        title: p.clientHasEmail
          ? "Finaliser puis envoyer au client"
          : "Compléter le devis avant envoi",
        description: p.clientHasEmail
          ? "Vérifie les lignes, la TVA et la règle d'acompte, puis envoie le devis par email au client."
          : "Le client n'a pas d'email enregistré. Ajoute-le pour pouvoir lui envoyer le devis automatiquement.",
        ctaLabel: "Envoyer le devis",
        action: p.clientHasEmail ? "send_devis" : undefined,
        ctaHref: p.clientHasEmail ? undefined : `/clients`,
        variant: "accent",
      };

    case "envoye":
      if (!p.signed) {
        return {
          tone: "amber",
          icon: Edit3,
          eyebrow: "En attente",
          title: "Devis envoyé · signature attendue",
          description:
            "Le client a reçu son devis. Il doit d'abord le signer électroniquement (lien dans le bloc « Signature » plus haut) avant que l'acompte puisse être encaissé.",
          ctaLabel: "Voir le lien de signature",
          ctaHref: `/devis/${p.devisId}#signature`,
          variant: "accent",
        };
      }
      return {
        tone: "pink",
        icon: Send,
        eyebrow: "En attente",
        title: "Devis signé · acompte attendu",
        description:
          "Le client a signé électroniquement. Encaisse l'acompte (Stripe, CB, virement, chèque, espèces) pour démarrer la commande.",
        ctaLabel: "Marquer acompte reçu",
        ctaHref: `/devis/${p.devisId}`,
        variant: "primary",
      };

    case "valide":
      return {
        tone: "blue",
        icon: CheckCircle2,
        eyebrow: "Prochaine étape",
        title: "Devis validé · encaisser l'acompte",
        description:
          "Le client a signé. Encaisse l'acompte (Stripe, CB, virement, chèque, espèces) pour démarrer la production.",
        ctaLabel: "Marquer acompte reçu",
        ctaHref: `/devis/${p.devisId}`,
        variant: "accent",
      };

    case "acompte_recu":
      if (!p.soldePaid && p.hasDossier) {
        return {
          tone: "emerald",
          icon: p.hasDossier ? Scissors : Banknote,
          eyebrow: "Production en cours",
          title: "Suivre la fiche confection",
          description:
            "L'acompte est encaissé, le dossier de confection est créé. Suis l'avancement et marque le solde quand il sera réglé.",
          ctaLabel: "Ouvrir la fiche confection",
          ctaHref: p.dossierId ? `/confections/${p.dossierId}` : `/devis/${p.devisId}`,
          variant: "accent",
        };
      }
      return {
        tone: "emerald",
        icon: CheckCircle2,
        eyebrow: "Tout est réglé",
        title: "Acompte et solde encaissés",
        description: "Reste à finaliser la pose si elle est prévue dans le devis.",
        ctaLabel: p.dossierId ? "Planifier la pose" : "Voir l'historique",
        ctaHref: p.dossierId ? `/confections/${p.dossierId}` : `/devis/${p.devisId}`,
        variant: "accent",
      };

    case "refuse":
    case "expire":
      return null;
  }
  return null;
}

export function NextStepDevisBanner(p: Props) {
  const step = pickNextStep(p);
  const [pending, startTransition] = useTransition();
  if (!step) return null;
  const Icon = step.icon;

  const handleSend = () => {
    if (!confirm("Envoyer ce devis par email au client (PDF en pièce jointe) ?")) return;
    startTransition(async () => {
      const r = await sendDevisEmailAction(p.devisId);
      if (r.ok) {
        alert(`✓ Devis envoyé à ${r.emailedTo}\n(Brevo messageId: ${r.messageId})`);
        window.location.reload();
      } else {
        alert(`Échec : ${r.message}`);
      }
    });
  };

  const renderCta = () => {
    if (step.action === "send_devis") {
      return (
        <Button
          variant={step.variant ?? "accent"}
          size="md"
          onClick={handleSend}
          disabled={pending}
        >
          {pending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Envoi…
            </>
          ) : (
            <>
              {step.ctaLabel}
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            </>
          )}
        </Button>
      );
    }
    return (
      <Link href={step.ctaHref ?? "#"}>
        <Button variant={step.variant ?? "accent"} size="md">
          {step.ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
        </Button>
      </Link>
    );
  };

  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <ColorChip tone={step.tone} size="lg">
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </ColorChip>
        <div className="flex-1 min-w-0">
          <p className="eyebrow mb-1">{step.eyebrow}</p>
          <h3 className="text-[17px] font-semibold text-ink leading-tight mb-1.5">
            {step.title}
          </h3>
          <p className="text-[13px] text-muted leading-snug max-w-2xl">
            {step.description}
          </p>
        </div>
        <div className="shrink-0">{renderCta()}</div>
      </div>
    </Card>
  );
}
