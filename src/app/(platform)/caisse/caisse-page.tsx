"use client";

import { useState } from "react";
import { Receipt, Wallet } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import CaisseClient from "./caisse-client";
import { PaymentsTab } from "./payments-tab";
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
}: {
  todayStats: TodayStats;
  payments: UnifiedPayment[];
}) {
  const [tab, setTab] = useState<"vente" | "paiements">("vente");

  return (
    <div className="flex-1 flex flex-col">
      {/* Bandeau d'onglets sticky sous la topbar */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "vente" | "paiements")}>
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
          </TabsList>
        </div>

        <TabsContent value="vente">
          <CaisseClient todayStats={todayStats} />
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
      </Tabs>
    </div>
  );
}
