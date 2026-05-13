"use client";

import { useState } from "react";
import {
  Library,
  Package,
  Tag,
  MapPin,
  Search,
  Plus,
  AlertTriangle,
  Video,
  Send,
  ArrowRight,
  ChevronRight,
  Truck,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import { eur, shortDate } from "@/lib/formatters";

const products = [
  { ref: "ATM-RD01", label: "Rideau prêt-à-poser ivoire", category: "Rideaux", price: 89, stockPL: 12, stockUA: 8, tone: "violet" as const },
  { ref: "ATM-RD02", label: "Rideau prêt-à-poser lin", category: "Rideaux", price: 119, stockPL: 6, stockUA: 4, tone: "violet" as const },
  { ref: "ATM-RD03", label: "Voilage brodé champagne", category: "Rideaux", price: 64, stockPL: 18, stockUA: 0, tone: "violet" as const },
  { ref: "ATM-ST01", label: "Store enrouleur lin naturel", category: "Stores", price: 78, stockPL: 14, stockUA: 6, tone: "blue" as const },
  { ref: "ATM-ST02", label: "Store vénitien bois noyer", category: "Stores", price: 145, stockPL: 4, stockUA: 0, tone: "blue" as const },
  { ref: "ATM-ST03", label: "Store bateau toile écrue", category: "Stores", price: 98, stockPL: 9, stockUA: 5, tone: "blue" as const },
  { ref: "ATM-BQ01", label: "Banquette velours moutarde", category: "Banquettes", price: 320, stockPL: 2, stockUA: 0, tone: "amber" as const },
  { ref: "ATM-BQ02", label: "Banquette lin écru", category: "Banquettes", price: 280, stockPL: 3, stockUA: 1, tone: "amber" as const },
  { ref: "ATM-CS01", label: "Coussin velours moutarde", category: "Coussins", price: 39, stockPL: 24, stockUA: 18, tone: "pink" as const },
  { ref: "ATM-CS02", label: "Coussin lin lavé", category: "Coussins", price: 32, stockPL: 28, stockUA: 22, tone: "pink" as const },
  { ref: "ATM-CS03", label: "Coussin damas crème", category: "Coussins", price: 45, stockPL: 0, stockUA: 14, tone: "pink" as const },
  { ref: "ATM-RA01", label: "Rail aluminium 240cm", category: "Rails", price: 38, stockPL: 32, stockUA: 12, tone: "emerald" as const },
];

const categories = ["Tout", "Rideaux", "Stores", "Banquettes", "Coussins", "Rails"] as const;

type LMLead = {
  id: string;
  number: string;
  name: string;
  region: string;
  product: string;
  status: "nouveau" | "visio_planifie" | "echantillons" | "devis_envoye" | "valide" | "perdu";
  poseur?: string;
  amount?: number;
  createdAt: Date;
};

const d = (off: number) => {
  const x = new Date();
  x.setDate(x.getDate() + off);
  return x;
};

const lmLeads: LMLead[] = [
  { id: "l1", number: "LM-2026-0212", name: "Mme Beaumont, Claire", region: "Bordeaux 33000", product: "Rideaux salon (2 baies)", status: "valide", poseur: "Romain T.", amount: 1480, createdAt: d(-12) },
  { id: "l2", number: "LM-2026-0213", name: "M. Garnier, Lucas", region: "Toulouse 31000", product: "Stores bateau cuisine", status: "echantillons", createdAt: d(-7) },
  { id: "l3", number: "LM-2026-0214", name: "Mme Pereira, Sofia", region: "Pau 64000", product: "Voilage + rideaux chambre", status: "visio_planifie", createdAt: d(-3) },
  { id: "l4", number: "LM-2026-0215", name: "M. Dujardin, Olivier", region: "Lyon 69000", product: "Store enrouleur véranda", status: "devis_envoye", amount: 740, createdAt: d(-5) },
  { id: "l5", number: "LM-2026-0216", name: "Famille Lopez", region: "Marseille 13000", product: "Banquette + 6 coussins Collection", status: "nouveau", createdAt: d(-1) },
];

const lmStatusLabels: Record<LMLead["status"], string> = {
  nouveau: "Nouveau lead",
  visio_planifie: "Visio planifiée",
  echantillons: "Échantillons envoyés",
  devis_envoye: "Devis envoyé",
  valide: "Validé",
  perdu: "Perdu",
};

const lmStatusTones: Record<LMLead["status"], "blue" | "violet" | "amber" | "pink" | "emerald" | "muted"> = {
  nouveau: "blue",
  visio_planifie: "violet",
  echantillons: "amber",
  devis_envoye: "pink",
  valide: "emerald",
  perdu: "muted",
};

export default function CollectionPage() {
  const [category, setCategory] = useState<typeof categories[number]>("Tout");
  const [query, setQuery] = useState("");

  const totalStockPL = products.reduce((acc, p) => acc + p.stockPL, 0);
  const totalStockUA = products.reduce((acc, p) => acc + p.stockUA, 0);

  const visible = products
    .filter((p) => category === "Tout" || p.category === category)
    .filter((p) =>
      query
        ? p.label.toLowerCase().includes(query.toLowerCase()) || p.ref.toLowerCase().includes(query.toLowerCase())
        : true
    );

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Collection · Leroy Merlin" },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Truck className="h-3.5 w-3.5" strokeWidth={2.2} /> Mouvements stock
            </Button>
            <Button variant="primary" size="sm">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Nouveau lead
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Module 7 · Collection Atmosphère & Leroy Merlin</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Catalogue & partenariats
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Produits semi-finis Pologne / Ukraine à tarifs réduits. Tarification unique + remises LM appliquées.
          </p>
        </section>

        {/* Entrepôts hero */}
        <section className="px-8 pb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="p-5 col-span-2 grid grid-cols-2">
            <div className="pr-5 border-r border-line">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[20px]">🇵🇱</span>
                <p className="text-[13px] font-semibold text-ink">Entrepôt Pologne</p>
              </div>
              <p className="text-[36px] font-semibold tracking-tight text-ink leading-none tabular-nums">{totalStockPL}</p>
              <p className="text-[11.5px] text-muted mt-1">unités en stock · {products.filter((p) => p.stockPL > 0).length} références</p>
              <div className="mt-3 flex items-center gap-2 text-[11px]">
                <StatusPill tone="emerald" dot={false}>Approvisionné</StatusPill>
                <span className="text-muted-2">Dernier réappro 12 mai</span>
              </div>
            </div>
            <div className="pl-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[20px]">🇺🇦</span>
                <p className="text-[13px] font-semibold text-ink">Entrepôt Ukraine</p>
              </div>
              <p className="text-[36px] font-semibold tracking-tight text-ink leading-none tabular-nums">{totalStockUA}</p>
              <p className="text-[11.5px] text-muted mt-1">unités en stock · {products.filter((p) => p.stockUA > 0).length} références</p>
              <div className="mt-3 flex items-center gap-2 text-[11px]">
                <StatusPill tone="amber" dot={false}>Délais incertains</StatusPill>
                <span className="text-muted-2">Dernier réappro 28 avr.</span>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-ink text-white border-ink">
            <div className="flex items-center gap-2 mb-3">
              <ColorChip tone="yellow" size="sm">
                <Library className="h-3.5 w-3.5" strokeWidth={2.4} />
              </ColorChip>
              <p className="text-[12px] font-semibold opacity-90">Catalogue</p>
            </div>
            <p className="text-[36px] font-semibold tracking-tight leading-none tabular-nums">{products.length}</p>
            <p className="text-[11.5px] opacity-70 mt-1">références totales · {categories.length - 1} catégories</p>
            <div className="mt-3 flex items-center gap-2 text-[11px] opacity-90">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/20">
                Remise LM <span className="font-mono font-semibold">-18%</span>
              </span>
            </div>
          </Card>
        </section>

        {/* Filters */}
        <section className="px-8 pb-4 flex items-center justify-between gap-4 flex-wrap">
          <nav className="flex items-center gap-1.5 flex-wrap">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={
                  "h-8 px-3 rounded-full text-[12.5px] font-medium transition-all " +
                  (category === c
                    ? "bg-ink text-white"
                    : "bg-white text-muted hover:text-ink border border-line")
                }
              >
                {c}
              </button>
            ))}
          </nav>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Référence, nom…"
              className="pl-9 w-72 text-[12.5px] rounded-full bg-white"
            />
          </div>
        </section>

        {/* Products grid */}
        <section className="px-8 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visible.map((p) => {
              const totalStock = p.stockPL + p.stockUA;
              const lowStock = totalStock <= 5;
              const outOfStock = totalStock === 0;
              return (
                <Card key={p.ref} className="overflow-hidden">
                  <div
                    className="h-32 relative"
                    style={{ background: productGradient(p.ref) }}
                  >
                    <div className="absolute top-2.5 left-2.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-sm text-[10px] font-semibold text-ink-2 tracking-wide">
                        {p.category}
                      </span>
                    </div>
                    {(lowStock || outOfStock) && (
                      <div className="absolute top-2.5 right-2.5">
                        <StatusPill tone={outOfStock ? "danger" : "amber"}>
                          {outOfStock ? "Rupture" : "Stock bas"}
                        </StatusPill>
                      </div>
                    )}
                  </div>
                  <div className="p-3.5">
                    <p className="text-[13px] font-semibold text-ink leading-tight">
                      {p.label}
                    </p>
                    <p className="ref mt-0.5">{p.ref}</p>
                    <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-line">
                      <div className="flex items-center gap-2 text-[10.5px] text-muted-2 font-mono">
                        <span>🇵🇱 {p.stockPL}</span>
                        <span>·</span>
                        <span>🇺🇦 {p.stockUA}</span>
                      </div>
                      <p className="text-[14px] font-semibold text-ink tabular-nums">
                        {eur(p.price)}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Leroy Merlin leads */}
        <section className="px-8 pb-10">
          <Card className="overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
              <div>
                <p className="eyebrow mb-1 flex items-center gap-1.5">
                  <span className="inline-flex h-1.5 w-4 rounded-full bg-orange" />
                  Partenariat Leroy Merlin
                </p>
                <h2 className="text-[16px] font-semibold text-ink tracking-tight">
                  Leads en cours
                  <span className="text-muted-2 ml-2 font-semibold">{lmLeads.length}</span>
                </h2>
              </div>
              <button className="text-[12px] text-violet hover:underline font-medium inline-flex items-center gap-1">
                Voir tous <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="divide-y divide-line">
              {lmLeads.map((l) => {
                const initial = l.name.includes(",")
                  ? (l.name.split(",")[1].trim()[0] ?? l.name[0])
                  : l.name[0];
                return (
                  <div key={l.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-canvas-2/30 transition-colors">
                    <LetterAvatar initial={initial} tone={toneFor(l.name)} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[13.5px] font-semibold text-ink truncate">{l.name}</p>
                        <span className="ref">{l.number}</span>
                      </div>
                      <p className="text-[12px] text-muted truncate flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        {l.region}
                        <span className="text-muted-2">·</span>
                        {l.product}
                      </p>
                    </div>
                    <div className="hidden md:block text-right shrink-0">
                      {l.amount ? (
                        <p className="text-[13px] font-semibold text-ink tabular-nums">{eur(l.amount, true)}</p>
                      ) : (
                        <p className="text-[12px] text-muted-2">—</p>
                      )}
                      <p className="ref">{shortDate(l.createdAt)}</p>
                    </div>
                    {l.poseur && (
                      <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                        <LetterAvatar initial={l.poseur[0]} tone={toneFor(l.poseur)} size="xs" />
                        <span className="text-[11.5px] text-muted">{l.poseur}</span>
                      </div>
                    )}
                    <StatusPill tone={lmStatusTones[l.status]}>{lmStatusLabels[l.status]}</StatusPill>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3 bg-canvas-2/40 border-t border-line flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-4 text-muted">
                <span><span className="text-ink font-semibold tabular-nums">1</span> nouveau</span>
                <span><span className="text-violet font-semibold tabular-nums">1</span> visio</span>
                <span><span className="text-amber font-semibold tabular-nums">1</span> échantillons</span>
                <span><span className="text-pink font-semibold tabular-nums">1</span> devis envoyé</span>
                <span><span className="text-emerald font-semibold tabular-nums">1</span> validé</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-1 text-[11.5px] text-muted hover:text-ink">
                  <Video className="h-3 w-3" /> Planifier visio
                </button>
                <button className="inline-flex items-center gap-1 text-[11.5px] text-muted hover:text-ink">
                  <Send className="h-3 w-3" /> Envoyer échantillons
                </button>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </>
  );
}

function productGradient(ref: string): string {
  const map: Record<string, string> = {
    "ATM-RD01": "linear-gradient(135deg, #f5f3ee 0%, #d6c9a8 100%)",
    "ATM-RD02": "linear-gradient(135deg, #ede4cd 0%, #b8a37c 100%)",
    "ATM-RD03": "linear-gradient(135deg, #faf3e0 0%, #d4c1a3 100%)",
    "ATM-ST01": "linear-gradient(135deg, #e5d8be 0%, #b8a37c 100%)",
    "ATM-ST02": "linear-gradient(135deg, #8b6f47 0%, #5a4326 100%)",
    "ATM-ST03": "linear-gradient(135deg, #f1ead8 0%, #c5b89a 100%)",
    "ATM-BQ01": "linear-gradient(135deg, #fde047 0%, #92400e 100%)",
    "ATM-BQ02": "linear-gradient(135deg, #ede4cd 0%, #a0905f 100%)",
    "ATM-CS01": "linear-gradient(135deg, #fde047 0%, #b45309 100%)",
    "ATM-CS02": "linear-gradient(135deg, #ede4cd 0%, #9a8975 100%)",
    "ATM-CS03": "linear-gradient(135deg, #f8eed8 0%, #c8b89a 100%)",
    "ATM-RA01": "linear-gradient(135deg, #e5e7eb 0%, #6b7280 100%)",
  };
  return map[ref] ?? "linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%)";
}
