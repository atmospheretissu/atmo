import Link from "next/link";
import {
  ArrowRight,
  Send,
  PackageCheck,
  Scissors,
  Calendar,
  Banknote,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ColorChip } from "@/components/ui/status-pill";

type Props = {
  dossierId: string;
  status: string;
  devisId: string | null;
  acomptePaid: boolean;
  soldePaid: boolean;
  itemsTotal: number;
  itemsReceived: number;
  atelierId: string | null;
};

type Step = {
  tone: "violet" | "orange" | "emerald" | "amber" | "pink" | "blue";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  variant?: "accent" | "primary" | "secondary";
};

function pickNextStep(p: Props): Step | null {
  // Acompte pas réglé → relancer côté devis
  if (!p.acomptePaid && p.devisId) {
    return {
      tone: "pink",
      icon: Send,
      eyebrow: "Prochaine étape",
      title: "Marquer l'acompte reçu",
      description:
        "La commande démarre dès réception de l'acompte. Encaisse en ligne (Stripe) ou enregistre un paiement manuel (CB / chèque / virement / espèces).",
      ctaLabel: "Ouvrir le devis",
      ctaHref: `/devis/${p.devisId}`,
      variant: "accent",
    };
  }

  switch (p.status) {
    case "commande_validee":
    case "attente_matiere": {
      const allReceived = p.itemsReceived === p.itemsTotal && p.itemsTotal > 0;
      if (!allReceived) {
        return {
          tone: "amber",
          icon: PackageCheck,
          eyebrow: "Prochaine étape",
          title: `Réceptionner les éléments (${p.itemsReceived}/${p.itemsTotal})`,
          description:
            "Coche chaque ligne au fur et à mesure des livraisons fournisseurs, ou envoie une ligne directement en confection.",
          ctaLabel: "Scanner réception",
          ctaHref: "/reception",
          variant: "secondary",
        };
      }
      // Tout reçu mais statut pas encore basculé → message neutre
      return null;
    }

    case "confection_en_cours": {
      if (!p.atelierId) {
        return {
          tone: "violet",
          icon: Scissors,
          eyebrow: "Prochaine étape",
          title: "Envoyer à un atelier",
          description:
            "Assigne la fiche à un atelier (interne ou sous-traitant). La date limite de retour est calculée auto à J+10.",
          ctaLabel: "Choisir un atelier",
          ctaHref: `#atelier-${p.dossierId}`,
          variant: "accent",
        };
      }
      return {
        tone: "violet",
        icon: Scissors,
        eyebrow: "En cours",
        title: "Confection en atelier",
        description:
          "Marque chaque article comme réceptionné dès qu'il revient de l'atelier pour passer en prêt-pose.",
        ctaLabel: "Voir les éléments",
        ctaHref: `#items-${p.dossierId}`,
        variant: "secondary",
      };
    }

    case "pret_pose": {
      if (!p.soldePaid && p.devisId) {
        return {
          tone: "pink",
          icon: Banknote,
          eyebrow: "Prochaine étape",
          title: "Demander le solde au client",
          description:
            "Toutes les pièces sont prêtes. Envoie le client sur son portail pour régler le solde et débloquer la planification de pose.",
          ctaLabel: "Envoyer la demande de solde",
          ctaHref: `/devis/${p.devisId}`,
          variant: "accent",
        };
      }
      return {
        tone: "emerald",
        icon: Calendar,
        eyebrow: "Prochaine étape",
        title: "Planifier la pose",
        description:
          "Solde réglé. Fixe le créneau avec le client pour passer en pose à venir.",
        ctaLabel: "Planifier",
        ctaHref: `/agenda`,
        variant: "accent",
      };
    }

    case "pose_a_planifier":
      return {
        tone: "emerald",
        icon: Calendar,
        eyebrow: "Prochaine étape",
        title: "Fixer le créneau de pose",
        description:
          "Le solde est réglé — il reste à confirmer la date de pose avec le client.",
        ctaLabel: "Ouvrir l'agenda",
        ctaHref: "/agenda",
        variant: "accent",
      };

    case "pose_a_venir":
      return {
        tone: "orange",
        icon: CheckCircle2,
        eyebrow: "Prochaine étape",
        title: "Pose à venir",
        description:
          "Une fois la pose effectuée, marque-la comme terminée — le dossier passe automatiquement en clôturé.",
        ctaLabel: "Voir la pose",
        ctaHref: "/poses",
        variant: "secondary",
      };

    case "cloture":
      return {
        tone: "emerald",
        icon: Sparkles,
        eyebrow: "Terminé",
        title: "Dossier clôturé",
        description:
          "Pose effectuée et dossier soldé. Tu peux toujours rouvrir un SAV ou consulter l'historique.",
        ctaLabel: "Voir l'historique",
        ctaHref: "#",
        variant: "secondary",
      };

    case "sav":
      return {
        tone: "amber",
        icon: Sparkles,
        eyebrow: "Service après-vente",
        title: "SAV en cours",
        description: "Suis l'avancement du SAV via les notes et l'équipe assignée.",
        ctaLabel: "Voir les notes",
        ctaHref: `#notes-${p.dossierId}`,
        variant: "secondary",
      };
  }
  return null;
}

export function NextStepBanner(p: Props) {
  const step = pickNextStep(p);
  if (!step) return null;
  const Icon = step.icon;
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
        <div className="shrink-0">
          <Link href={step.ctaHref}>
            <Button variant={step.variant ?? "accent"} size="md">
              {step.ctaLabel}
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
