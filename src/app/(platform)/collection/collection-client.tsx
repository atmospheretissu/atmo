"use client";

import { useMemo, useState } from "react";
import {
  Library,
  Package,
  Search,
  Plus,
  Truck,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { eur } from "@/lib/formatters";
import type { CollectionProduct } from "@/lib/db/collection";

type Props = {
  products: CollectionProduct[];
  categories: string[];
};

export default function CollectionClient({ products, categories }: Props) {
  const [category, setCategory] = useState<string>("Tout");
  const [query, setQuery] = useState("");

  const totalStockPL = useMemo(
    () => products.reduce((s, p) => s + (p.stock_poland ?? 0), 0),
    [products]
  );
  const totalStockUA = useMemo(
    () => products.reduce((s, p) => s + (p.stock_ukraine ?? 0), 0),
    [products]
  );

  const visible = useMemo(() => {
    const q = query.toLowerCase().trim();
    return products
      .filter((p) => category === "Tout" || p.category === category)
      .filter((p) =>
        q
          ? p.name.toLowerCase().includes(q) || p.ref.toLowerCase().includes(q)
          : true
      );
  }, [products, category, query]);

  const allCategories = ["Tout", ...categories];

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
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Nouveau produit
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Module · Collection Atmosphère & Leroy Merlin</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Catalogue & partenariats
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Produits semi-finis Pologne / Ukraine à tarifs réduits. Tarification unique + remises LM appliquées.
          </p>
        </section>

        <section className="px-8 pb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="p-5 col-span-2 grid grid-cols-2">
            <div className="pr-5 border-r border-line">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[20px]">🇵🇱</span>
                <p className="text-[13px] font-semibold text-ink">Entrepôt Pologne</p>
              </div>
              <p className="text-[36px] font-semibold tracking-tight text-ink leading-none tabular-nums">{totalStockPL}</p>
              <p className="text-[11.5px] text-muted mt-1">
                unités en stock · {products.filter((p) => (p.stock_poland ?? 0) > 0).length} références
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px]">
                <StatusPill tone={totalStockPL > 0 ? "emerald" : "muted"} dot={false}>
                  {totalStockPL > 0 ? "Approvisionné" : "Vide"}
                </StatusPill>
              </div>
            </div>
            <div className="pl-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[20px]">🇺🇦</span>
                <p className="text-[13px] font-semibold text-ink">Entrepôt Ukraine</p>
              </div>
              <p className="text-[36px] font-semibold tracking-tight text-ink leading-none tabular-nums">{totalStockUA}</p>
              <p className="text-[11.5px] text-muted mt-1">
                unités en stock · {products.filter((p) => (p.stock_ukraine ?? 0) > 0).length} références
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px]">
                <StatusPill tone={totalStockUA > 0 ? "amber" : "muted"} dot={false}>
                  {totalStockUA > 0 ? "Délais incertains" : "Vide"}
                </StatusPill>
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
            <p className="text-[11.5px] opacity-70 mt-1">
              référence{products.length > 1 ? "s" : ""} totale{products.length > 1 ? "s" : ""} · {categories.length} catégorie{categories.length > 1 ? "s" : ""}
            </p>
            <div className="mt-3 flex items-center gap-2 text-[11px] opacity-90">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/20">
                Remise LM <span className="font-mono font-semibold">-18%</span>
              </span>
            </div>
          </Card>
        </section>

        {products.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <section className="px-8 pb-4 flex items-center justify-between gap-4 flex-wrap">
              <nav className="flex items-center gap-1.5 flex-wrap">
                {allCategories.map((c) => (
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

            <section className="px-8 pb-6">
              {visible.length === 0 ? (
                <Card className="py-12 px-6 text-center">
                  <p className="text-[13px] text-muted">Aucun produit ne correspond aux filtres.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {visible.map((p) => {
                    const stockPL = p.stock_poland ?? 0;
                    const stockUA = p.stock_ukraine ?? 0;
                    const totalStock = stockPL + stockUA;
                    const lowStock = totalStock > 0 && totalStock <= 5;
                    const outOfStock = totalStock === 0;
                    return (
                      <Card key={p.id} className="overflow-hidden">
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
                            {p.name}
                          </p>
                          <p className="ref mt-0.5">{p.ref}</p>
                          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-line">
                            <div className="flex items-center gap-2 text-[10.5px] text-muted-2 font-mono">
                              <span>🇵🇱 {stockPL}</span>
                              <span>·</span>
                              <span>🇺🇦 {stockUA}</span>
                            </div>
                            <p className="text-[14px] font-semibold text-ink tabular-nums">
                              {eur(Number(p.unit_price_ht))}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        <section className="px-8 pb-10">
          <Card className="p-5 bg-canvas-2/40 border-dashed">
            <div className="flex items-start gap-3">
              <ColorChip tone="orange" size="md">
                <Package className="h-4 w-4" strokeWidth={2.2} />
              </ColorChip>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-ink leading-tight">
                  Partenariat Leroy Merlin — Phase 2
                </p>
                <p className="text-[12.5px] text-muted mt-1 max-w-2xl">
                  Le suivi des leads LM (visio, échantillons, devis envoyé, validé) sera activé une fois
                  les flux de leads connectés via API LM. Table <span className="font-mono">leroy_merlin_leads</span> à créer (migration séparée).
                </p>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <section className="px-8 pb-10">
      <Card className="py-16 px-6 flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet to-pink text-white inline-flex items-center justify-center mb-4">
          <Library className="h-6 w-6" strokeWidth={2} />
        </div>
        <h2 className="text-[18px] font-semibold text-ink mb-1">Aucun produit Collection</h2>
        <p className="text-[13.5px] text-muted max-w-md mb-6 leading-relaxed">
          La Collection Atmosphère regroupe les produits semi-finis Pologne / Ukraine.
          Marque un produit du catalogue avec <span className="font-mono">is_collection = true</span> pour qu'il apparaisse ici.
        </p>
      </Card>
    </section>
  );
}

function productGradient(ref: string): string {
  const hash = Array.from(ref).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue1 = hash % 360;
  const hue2 = (hue1 + 35) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 35%, 88%) 0%, hsl(${hue2}, 30%, 65%) 100%)`;
}
