import Link from "next/link";
import {
  Plus,
  Send,
  Banknote,
  Scissors,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ColorChip } from "@/components/ui/status-pill";

type MiniDevis = {
  id: string;
  number: string;
  status: string;
  total_ttc: number | string | null;
  product_summary: string | null;
};

/**
 * Bandeau « Prochaine étape » adapté au contexte de la fiche client.
 * S'appuie sur le dernier devis pour orienter l'action prioritaire.
 */
export function NextStepClientBanner({
  clientId,
  clientHasEmail,
  devis,
}: {
  clientId: string;
  clientHasEmail: boolean;
  devis: MiniDevis[];
}) {
  const latest = devis[0];

  // Cas 1 — aucun devis : proposer d'en créer un.
  if (!latest) {
    return (
      <Bandeau
        tone="violet"
        icon={Sparkles}
        eyebrow="Prochaine étape"
        title="Créer le premier devis"
        description="Aucun devis pour ce client. Lance le simulateur pour proposer une offre sur mesure."
        cta={{
          label: "Créer un devis",
          href: `/boutique/nouveau?client=${clientId}`,
        }}
      />
    );
  }

  // Cas 2 — brouillon : compléter et envoyer.
  if (latest.status === "brouillon") {
    return (
      <Bandeau
        tone="amber"
        icon={Send}
        eyebrow="En cours"
        title={`Devis ${latest.number} à finaliser`}
        description={
          clientHasEmail
            ? "Vérifie les lignes et envoie le devis au client par email."
            : "Complète le devis, puis pense à ajouter l'email du client avant l'envoi."
        }
        cta={{ label: "Ouvrir le devis", href: `/devis/${latest.id}` }}
      />
    );
  }

  // Cas 3 — envoyé : relancer ou encaisser l'acompte.
  if (latest.status === "envoye" || latest.status === "valide") {
    return (
      <Bandeau
        tone="pink"
        icon={Banknote}
        eyebrow="En attente"
        title={`Devis ${latest.number} envoyé — acompte attendu`}
        description="Encaisse l'acompte pour lancer la commande (Stripe, virement, CB, chèque, espèces)."
        cta={{ label: "Ouvrir le devis", href: `/devis/${latest.id}` }}
      />
    );
  }

  // Cas 4 — acompte reçu : suivre la fiche confection.
  if (latest.status === "acompte_recu") {
    return (
      <Bandeau
        tone="emerald"
        icon={Scissors}
        eyebrow="Production"
        title={`Commande ${latest.number} — dossier en confection`}
        description="Suis la fabrication et la pose depuis la fiche confection."
        cta={{
          label: "Voir la fiche confection",
          href: `/devis/${latest.id}`,
        }}
      />
    );
  }

  // Cas 5 — refusé/expiré : proposer d'en refaire un.
  return (
    <Bandeau
      tone="violet"
      icon={Plus}
      eyebrow="Prochaine étape"
      title="Créer un nouveau devis"
      description={
        latest.status === "refuse"
          ? "Le dernier devis a été refusé. Propose une nouvelle offre adaptée."
          : "Le dernier devis a expiré (30 jours). Ré-émets-en un mis à jour."
      }
      cta={{
        label: "Nouveau devis",
        href: `/boutique/nouveau?client=${clientId}`,
      }}
    />
  );
}

function Bandeau({
  tone,
  icon: Icon,
  eyebrow,
  title,
  description,
  cta,
}: {
  tone: "violet" | "amber" | "pink" | "emerald";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  eyebrow: string;
  title: string;
  description: string;
  cta: { label: string; href: string };
}) {
  return (
    <Card className="p-5 flex items-start gap-4">
      <ColorChip tone={tone} size="lg">
        <Icon className="h-4 w-4" strokeWidth={2.4} />
      </ColorChip>
      <div className="flex-1 min-w-0">
        <p className="text-[10.5px] uppercase tracking-widest font-semibold text-muted-2 mb-0.5">
          {eyebrow}
        </p>
        <p className="text-[15px] font-semibold text-ink leading-tight">
          {title}
        </p>
        <p className="text-[12.5px] text-muted mt-1 leading-relaxed">
          {description}
        </p>
      </div>
      <Link href={cta.href} className="shrink-0">
        <Button variant="primary" size="sm">
          {cta.label}
        </Button>
      </Link>
    </Card>
  );
}
