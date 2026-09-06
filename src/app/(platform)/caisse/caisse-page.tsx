"use client";

import { useState } from "react";
import { Receipt, Wallet, Calculator } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Topbar } from "@/components/shell/topbar";
import CaisseClient from "./caisse-client";
import { PaymentsTab } from "./payments-tab";
import { ComptabiliteTab } from "./comptabilite-tab";
import type { TodayStats } from "@/lib/db/caisse";
import type { UnifiedPayment } from "@/lib/db/payments-feed";

/**
 * Wrapper de /caisse avec deux onglets :
 *   - Vente comptoir : interface de panier + encaissement (CaisseClient)
 *   - Paiements      : liste consolidée tous types de paiements (toutes sources)
 */
export default function CaissePageClient({
  todayStats,
  payments,
  blockedDay,
}: {
  todayStats: TodayStats;
  payments: UnifiedPayment[];
  blockedDay?: string | null;
}) {
  const [tab, setTab] = useState<"vente" | "paiements" | "comptabilite">("vente");

  // Compte des lignes à exporter pour le badge
  const toExport = payments.filter((p) => !p.pennylane_exported_at).length;

  return (
    <div className="flex-1 flex flex-col">
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Caisse" },
        ]}
      />
      {/* Bandeau d'onglets sticky sous la topbar */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "vente" | "paiements" | "comptabilite")}>
        <div className={cn("sticky top-14 z-20 bg-canvas border-b border-line px-8 pt-3")}>
          <TabsList className="border-b-0">
            <TabsTrigger value="vente">
              <Receipt className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" strokeWidth={2.2} />
              Vente comptoir
            </TabsTrigger>
            <TabsTrigger value="paiements">
              <Wallet className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" strokeWidth={2.2} />
              Paiements
              <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-canvas-2 text-[10.5px] font-semibold tabular-nums text-muted">
                {payments.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="comptabilite">
              <Calculator className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" strokeWidth={2.2} />
              Comptabilité
              {toExport > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-soft text-[10.5px] font-semibold tabular-nums text-amber">
                  {toExport}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="vente">
          <CaisseClient todayStats={todayStats} blockedDay={blockedDay ?? null} />
        </TabsContent>
        <TabsContent value="paiements">
          <div className="px-8 pt-8 pb-4">
            <p className="eyebrow mb-2">Historique consolidé</p>
            <h1 className="text-[28px] font-semibold tracking-tight text-ink leading-[1.1]">
              Tous les paiements
            </h1>
            <p className="text-[13.5px] text-muted mt-2 max-w-2xl">
              Acomptes &amp; soldes des devis (Stripe, virement, chèque), ventes comptoir,
              tous moyens confondus — vue unique pour suivre la trésorerie.
            </p>
          </div>
          <PaymentsTab payments={payments} />
        </TabsContent>
        <TabsContent value="comptabilite">
          <div className="px-8 pt-8 pb-4">
            <p className="eyebrow mb-2">Export comptable</p>
            <h1 className="text-[28px] font-semibold tracking-tight text-ink leading-[1.1]">
              Comptabilité &amp; Pennylane
            </h1>
            <p className="text-[13.5px] text-muted mt-2 max-w-2xl">
              Toutes les recettes (paiements devis + tickets caisse) avec leur statut d'export
              vers Pennylane. Sélectionne les lignes à exporter et valide en deux étapes.
            </p>
          </div>
          <ComptabiliteTab payments={payments} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
