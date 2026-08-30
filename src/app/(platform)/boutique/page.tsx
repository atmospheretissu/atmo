import Link from "next/link";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ColorChip } from "@/components/ui/status-pill";
import { Plus, Layers, Scissors, Package, Disc, Sparkles, Sofa, ShoppingBag, Plus as PlusIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BoutiquePage() {
  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Création devis" },
        ]}
      />

      <div className="flex-1 overflow-auto">
        {/* CTA principal en grand — l'action à faire */}
        <section className="px-8 pt-10 pb-8">
          <p className="eyebrow mb-3">Nouveau document</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-3">
            Créer un devis
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl mb-6">
            Client, pièces & articles, récap 3 étapes. Prix calculés automatiquement selon les
            grilles Atmosphère (rideaux, stores, rails, pose, catalogue, Collection).
          </p>
          <Link href="/boutique/nouveau">
            <Button variant="primary" size="lg">
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              Créer un devis
            </Button>
          </Link>
        </section>

        {/* Familles disponibles en dessous, à titre indicatif */}
        <section className="px-8 pb-10">
          <p className="eyebrow mb-3">Types d&apos;articles disponibles dans le simulateur</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ArticleCard
              tone="violet"
              icon={Scissors}
              title="Rideaux sur mesure"
              sub="Plis simples · Vague · Œillets · Panneau"
            />
            <ArticleCard
              tone="blue"
              icon={Layers}
              title="Stores sur mesure"
              sub="Bateau régulier / irrégulier"
            />
            <ArticleCard
              tone="blue"
              icon={Disc}
              title="Stores enrouleurs"
              sub="Vedelux / Copa — avant / arrière"
            />
            <ArticleCard
              tone="orange"
              icon={Package}
              title="Catalogue produits"
              sub="47 066 références"
            />
            <ArticleCard
              tone="pink"
              icon={ShoppingBag}
              title="Rideaux en série"
              sub="56 modèles · prêt à poser"
            />
            <ArticleCard
              tone="violet"
              icon={Sparkles}
              title="Collection Atmosphère"
              sub="LIN / Polyester · confection interne"
            />
            <ArticleCard
              tone="blue"
              icon={Sofa}
              title="Mobilier sur mesure"
              sub="Tapis · Canapé · Banquette (Lovable)"
            />
            <ArticleCard
              tone="orange"
              icon={PlusIcon}
              title="Article libre"
              sub="Champ libre — qté, prix HT"
            />
          </div>
        </section>

      </div>
    </>
  );
}

function ArticleCard({
  icon: Icon,
  title,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  sub: string;
  tone: "violet" | "blue" | "orange" | "pink";
}) {
  return (
    <Card className="p-4 flex items-start gap-3">
      <ColorChip tone={tone} size="md">
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </ColorChip>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold text-ink leading-tight">{title}</p>
        <p className="text-[11px] text-muted mt-0.5">{sub}</p>
        <p className="text-[10.5px] text-emerald font-semibold mt-1">✓ Disponible</p>
      </div>
    </Card>
  );
}
