import Link from "next/link";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ColorChip } from "@/components/ui/status-pill";
import { Plus, ShoppingBag, Layers, Scissors, Package } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BoutiquePage() {
  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Création devis" },
        ]}
        actions={
          <Link href="/boutique/nouveau">
            <Button variant="primary" size="sm">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
              Nouveau devis boutique
            </Button>
          </Link>
        }
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Boutique · simulateur complet</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Devis boutique
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Wizard 3 étapes — client, pièces & articles, récapitulatif. Calculs de prix
            automatiques selon les bases tarifaires Atmosphère (rideaux, stores, rails, pose,
            catalogue produits, rideaux en série).
          </p>
        </section>

        <section className="px-8 pb-8">
          <p className="eyebrow mb-3">Types d'articles disponibles</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ArticleCard
              tone="violet"
              icon={Scissors}
              title="Rideaux sur mesure"
              sub="Plis simples · Vague · Œillets"
              status="part-2"
            />
            <ArticleCard
              tone="blue"
              icon={Layers}
              title="Stores sur mesure"
              sub="Bateau régulier / irrégulier"
              status="part-2"
            />
            <ArticleCard
              tone="orange"
              icon={Package}
              title="Catalogue produits"
              sub="47 066 références"
              status="ok"
            />
            <ArticleCard
              tone="pink"
              icon={ShoppingBag}
              title="Rideaux en série"
              sub="56 modèles · prêt à poser"
              status="part-2"
            />
          </div>
        </section>

        <section className="px-8 pb-10">
          <Card className="py-10 px-6 text-center">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-to-br from-violet to-pink text-white inline-flex items-center justify-center mb-4">
              <ShoppingBag className="h-6 w-6" strokeWidth={2} />
            </div>
            <h2 className="text-[18px] font-semibold text-ink mb-1">
              Démarre un devis boutique
            </h2>
            <p className="text-[13.5px] text-muted max-w-md mx-auto mb-6 leading-relaxed">
              Choisis un client, ajoute les pièces (ex : Salon, Chambre), puis remplis-les avec
              des articles. Total + acompte 50 % calculés en direct.
            </p>
            <Link href="/boutique/nouveau">
              <Button variant="primary" size="md">
                <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
                Nouveau devis boutique
              </Button>
            </Link>
          </Card>
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
  status,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  sub: string;
  tone: "violet" | "blue" | "orange" | "pink";
  status: "ok" | "part-2";
}) {
  return (
    <Card className="p-4 flex items-start gap-3">
      <ColorChip tone={tone} size="md">
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </ColorChip>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold text-ink leading-tight">{title}</p>
        <p className="text-[11px] text-muted mt-0.5">{sub}</p>
        {status === "ok" ? (
          <p className="text-[10.5px] text-emerald font-semibold mt-1">✓ Disponible</p>
        ) : (
          <p className="text-[10.5px] text-amber font-semibold mt-1">Part 2 — à venir</p>
        )}
      </div>
    </Card>
  );
}
