"use client";

import { useState } from "react";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ScanLine,
  Banknote,
  CreditCard,
  Receipt,
  CheckCircle2,
  Tag,
  Printer,
  Mail,
  Percent,
  UserPlus,
  X,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LetterAvatar } from "@/components/ui/letter-avatar";
import { eur } from "@/lib/formatters";

type CartItem = {
  id: string;
  ref: string;
  label: string;
  detail: string;
  unit: number;
  qty: number;
  unitLabel: string;
  tone: "violet" | "orange" | "blue" | "pink" | "emerald";
};

const initialCart: CartItem[] = [
  { id: "c1", ref: "CAS-204", label: "Casamance Saumon", detail: "Tissu au mètre · laize 140cm", unit: 78, qty: 3.5, unitLabel: "m", tone: "violet" },
  { id: "c2", ref: "PASS-12", label: "Passpoil cordon", detail: "Couleur ivoire · 12mm", unit: 4.2, qty: 8, unitLabel: "m", tone: "pink" },
  { id: "c3", ref: "EMB-LB", label: "Embouts laiton brossé", detail: "Ø 28mm · paire", unit: 24, qty: 1, unitLabel: "u", tone: "blue" },
];

const catalog = [
  { ref: "CAS-204", label: "Casamance Saumon", price: 78, tone: "violet" as const, type: "Tissu" },
  { ref: "CAS-301", label: "Casamance Ekos Ardoise", price: 92, tone: "violet" as const, type: "Tissu" },
  { ref: "LIN-V12", label: "Linder Velours Mohair", price: 124, tone: "violet" as const, type: "Tissu" },
  { ref: "LIN-N04", label: "Linder Lin Naturel", price: 56, tone: "violet" as const, type: "Tissu" },
  { ref: "POL-A22", label: "Atelier Pologne · Coton tissé", price: 28, tone: "yellow" as const, type: "Tissu" },
  { ref: "UKR-D11", label: "Atelier Ukraine · Damas crème", price: 34, tone: "yellow" as const, type: "Tissu" },
  { ref: "PASS-12", label: "Passpoil cordon ivoire", price: 4.2, tone: "pink" as const, type: "Accessoire" },
  { ref: "EMB-LB", label: "Embouts laiton brossé", price: 24, tone: "blue" as const, type: "Accessoire" },
  { ref: "ANN-BR", label: "Anneaux bronze × 10", price: 14, tone: "blue" as const, type: "Accessoire" },
  { ref: "CRO-INV", label: "Crochets invisibles × 20", price: 6.5, tone: "blue" as const, type: "Accessoire" },
  { ref: "ATM-CS01", label: "Coussin velours moutarde", price: 39, tone: "emerald" as const, type: "Collection" },
  { ref: "ATM-RD02", label: "Rideau prêt-à-poser ivoire", price: 89, tone: "emerald" as const, type: "Collection" },
];

const categories = ["Tout", "Tissu", "Accessoire", "Collection"] as const;

const todayStats = [
  { label: "Total jour", value: eur(842, true), sub: "12 tickets", tone: "violet" as const, icon: Receipt },
  { label: "Espèces", value: eur(146, true), sub: "3 paiements", tone: "emerald" as const, icon: Banknote },
  { label: "CB", value: eur(584, true), sub: "7 paiements", tone: "blue" as const, icon: CreditCard },
  { label: "Chèque/virement", value: eur(112, true), sub: "2 paiements", tone: "amber" as const, icon: Banknote },
];

export default function CaissePage() {
  const [cart, setCart] = useState<CartItem[]>(initialCart);
  const [category, setCategory] = useState<typeof categories[number]>("Tout");
  const [query, setQuery] = useState("");
  const [client, setClient] = useState<{ name: string; initial: string } | null>(null);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState<"especes" | "cb" | "cheque" | "virement">("cb");

  const subtotal = cart.reduce((acc, c) => acc + c.unit * c.qty, 0);
  const discountAmount = (subtotal * discount) / 100;
  const totalHT = subtotal - discountAmount;
  const tva = totalHT * 0.2;
  const totalTTC = totalHT + tva;

  const visibleCatalog = catalog
    .filter((c) => category === "Tout" || c.type === category)
    .filter((c) =>
      query
        ? c.label.toLowerCase().includes(query.toLowerCase()) || c.ref.toLowerCase().includes(query.toLowerCase())
        : true
    );

  const addItem = (ref: string) => {
    const product = catalog.find((c) => c.ref === ref);
    if (!product) return;
    const existing = cart.find((c) => c.ref === ref);
    if (existing) {
      setCart(cart.map((c) => (c.ref === ref ? { ...c, qty: c.qty + 1 } : c)));
    } else {
      setCart([
        ...cart,
        {
          id: `c${Date.now()}`,
          ref: product.ref,
          label: product.label,
          detail: product.type,
          unit: product.price,
          qty: 1,
          unitLabel: product.type === "Tissu" ? "m" : "u",
          tone: product.tone === "yellow" ? "violet" : (product.tone as CartItem["tone"]),
        },
      ]);
    }
  };

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Caisse" },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm">
              Historique
            </Button>
            <Button variant="primary" size="sm">
              <Receipt className="h-3.5 w-3.5" strokeWidth={2.4} /> Clôture jour
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Module 8 · Caisse & Ventes Comptoir</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Caisse en direct
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Toutes les ventes (comptoir, acomptes, soldes, Collection) au même endroit. Stock décrémenté auto. Export Pennylane à la clôture.
          </p>
        </section>

        {/* Day stats */}
        <section className="px-8 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {todayStats.map((s) => (
              <Card key={s.label} className="p-4 flex items-start gap-3">
                <ColorChip tone={s.tone} size="md">
                  <s.icon className="h-4 w-4" strokeWidth={2.2} />
                </ColorChip>
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] text-muted-2 font-medium uppercase tracking-wider">{s.label}</p>
                  <p className="text-[22px] font-semibold text-ink leading-tight tabular-nums mt-0.5">{s.value}</p>
                  <p className="text-[11px] text-muted mt-0.5">{s.sub}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* POS grid */}
        <section className="px-8 pb-10 grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 items-start">
          {/* LEFT — catalog */}
          <div className="space-y-4 min-w-0">
            {/* Search + scan */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Article, référence, scanner code…"
                  className="pl-9 rounded-lg bg-white h-10 text-[13.5px]"
                />
              </div>
              <Button variant="secondary" size="lg">
                <ScanLine className="h-4 w-4" strokeWidth={2.2} />
                Scanner
              </Button>
            </div>

            {/* Categories */}
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

            {/* Catalog grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {visibleCatalog.map((p) => (
                <button
                  key={p.ref}
                  onClick={() => addItem(p.ref)}
                  className="card p-3 text-left hover:border-line-strong transition-colors group"
                >
                  <div
                    className="h-20 rounded-lg mb-2.5"
                    style={{ background: swatch(p.ref) }}
                  />
                  <p className="text-[12.5px] font-semibold text-ink leading-tight truncate">
                    {p.label}
                  </p>
                  <p className="ref mt-0.5">{p.ref}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-line">
                    <span className="text-[10.5px] text-muted">{p.type}</span>
                    <span className="text-[13px] font-semibold text-ink tabular-nums">
                      {eur(p.price)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT — cart */}
          <Card className="sticky top-20 overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 6rem)" }}>
            {/* Client header */}
            <div className="p-4 border-b border-line">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11.5px] font-semibold tracking-wider uppercase text-muted-2">
                  Ticket
                </p>
                <span className="font-mono text-[10.5px] text-muted-2">
                  #TKT-2026-0312
                </span>
              </div>
              {client ? (
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-canvas-2/50">
                  <LetterAvatar initial={client.initial} tone="purple" size="sm" />
                  <p className="flex-1 text-[12.5px] font-medium text-ink truncate">
                    {client.name}
                  </p>
                  <button onClick={() => setClient(null)} className="text-muted-2 hover:text-ink-2">
                    <X className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setClient({ name: "Mme Larochelle, Hélène", initial: "H" })}
                  className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-line hover:border-line-strong text-[12.5px] text-muted hover:text-ink transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Associer un client (optionnel)
                </button>
              )}
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="p-8 text-center text-muted-2 text-[13px]">
                  Panier vide
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {cart.map((c) => (
                    <div key={c.id} className="p-3 flex items-start gap-2.5">
                      <ColorChip tone={c.tone} size="sm">
                        <Tag className="h-3 w-3" strokeWidth={2.4} />
                      </ColorChip>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-semibold text-ink leading-tight truncate">
                          {c.label}
                        </p>
                        <p className="ref mt-0.5">{c.ref} · {c.detail}</p>

                        <div className="flex items-center justify-between mt-1.5">
                          <div className="inline-flex items-center gap-1 rounded-md border border-line bg-white p-0.5">
                            <button
                              onClick={() => setCart(cart.map((x) => x.id === c.id ? { ...x, qty: Math.max(0.5, x.qty - 0.5) } : x))}
                              className="h-5 w-5 rounded inline-flex items-center justify-center text-muted hover:bg-canvas-2 hover:text-ink"
                            >
                              <Minus className="h-3 w-3" strokeWidth={2.4} />
                            </button>
                            <span className="text-[11.5px] font-mono font-semibold tabular-nums px-1 text-ink">
                              {c.qty.toLocaleString("fr-FR")} {c.unitLabel}
                            </span>
                            <button
                              onClick={() => setCart(cart.map((x) => x.id === c.id ? { ...x, qty: x.qty + 0.5 } : x))}
                              className="h-5 w-5 rounded inline-flex items-center justify-center text-muted hover:bg-canvas-2 hover:text-ink"
                            >
                              <Plus className="h-3 w-3" strokeWidth={2.4} />
                            </button>
                          </div>
                          <span className="text-[12.5px] font-semibold tabular-nums text-ink">
                            {eur(c.unit * c.qty)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setCart(cart.filter((x) => x.id !== c.id))}
                        className="text-muted-2 hover:text-red transition-colors"
                        aria-label="Retirer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals + payment */}
            <div className="border-t border-line">
              {/* Discount line */}
              <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11.5px] text-muted">
                  <Percent className="h-3 w-3" />
                  Remise
                </div>
                <div className="relative w-20">
                  <Input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="h-7 text-[12px] pr-6 text-right"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted">%</span>
                </div>
              </div>

              <div className="px-4 pb-2 space-y-1 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Sous-total HT</span>
                  <span className="text-ink-2 tabular-nums">{eur(totalHT)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">TVA 20%</span>
                  <span className="text-muted tabular-nums">{eur(tva)}</span>
                </div>
              </div>

              <div className="px-4 py-3 flex items-baseline justify-between border-t border-line bg-canvas-2/30">
                <span className="text-[13px] font-semibold text-ink">Total TTC</span>
                <span className="text-[24px] font-semibold text-ink tabular-nums leading-none">
                  {eur(totalTTC)}
                </span>
              </div>

              {/* Payment methods */}
              <div className="px-4 py-3 border-t border-line">
                <p className="text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 mb-2">
                  Mode de règlement
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["especes", "cb", "cheque", "virement"] as const).map((mode) => {
                    const icons = { especes: Banknote, cb: CreditCard, cheque: Banknote, virement: Receipt };
                    const labels = { especes: "Espèces", cb: "CB", cheque: "Chèque", virement: "Virement" };
                    const Icon = icons[mode];
                    const active = payment === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => setPayment(mode)}
                        className={
                          "inline-flex items-center gap-1.5 px-2 h-8 rounded-md text-[12px] font-medium transition-colors " +
                          (active
                            ? "bg-ink text-white"
                            : "bg-white text-muted-2 hover:text-ink border border-line")
                        }
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                        {labels[mode]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CTA */}
              <div className="p-4 border-t border-line">
                <Button variant="primary" size="lg" className="w-full">
                  <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />
                  Encaisser {eur(totalTTC, true)}
                </Button>
                <div className="flex items-center gap-2 mt-2">
                  <button className="flex-1 inline-flex items-center justify-center gap-1 h-7 rounded-md text-[11.5px] text-muted hover:text-ink hover:bg-canvas-2 transition-colors">
                    <Printer className="h-3 w-3" strokeWidth={2.2} />
                    Imprimer
                  </button>
                  <button className="flex-1 inline-flex items-center justify-center gap-1 h-7 rounded-md text-[11.5px] text-muted hover:text-ink hover:bg-canvas-2 transition-colors">
                    <Mail className="h-3 w-3" strokeWidth={2.2} />
                    Email ticket
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </>
  );
}

function swatch(ref: string): string {
  const map: Record<string, string> = {
    "CAS-204": "linear-gradient(135deg, #fbcfb8 0%, #e7916e 100%)",
    "CAS-301": "linear-gradient(135deg, #94a3b8 0%, #475569 100%)",
    "LIN-V12": "linear-gradient(135deg, #be7488 0%, #7d3a4a 100%)",
    "LIN-N04": "linear-gradient(135deg, #e5d8be 0%, #b8a37c 100%)",
    "POL-A22": "linear-gradient(135deg, #d4c1a3 0%, #9a8975 100%)",
    "UKR-D11": "linear-gradient(135deg, #ede4ce 0%, #c8b89a 100%)",
    "PASS-12": "linear-gradient(135deg, #f5f5f5 0%, #d6d3cb 100%)",
    "EMB-LB": "linear-gradient(135deg, #d4b48a 0%, #a0824f 100%)",
    "ANN-BR": "linear-gradient(135deg, #c8965e 0%, #8a6435 100%)",
    "CRO-INV": "linear-gradient(135deg, #d1d5db 0%, #6b7280 100%)",
    "ATM-CS01": "linear-gradient(135deg, #facc15 0%, #b45309 100%)",
    "ATM-RD02": "linear-gradient(135deg, #f5f3ee 0%, #d6c9a8 100%)",
  };
  return map[ref] ?? "linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%)";
}
