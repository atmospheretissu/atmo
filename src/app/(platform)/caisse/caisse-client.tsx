"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  Banknote,
  CreditCard,
  Receipt,
  CheckCircle2,
  Tag,
  Mail,
  Percent,
  UserPlus,
  X,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { eur } from "@/lib/formatters";
import {
  createTicketAction,
  searchCaisseCatalogAction,
  closeCashRegisterAction,
  searchClientsForCaisseAction,
  listCaisseCatalogFacetsAction,
} from "./actions";
import type {
  TodayStats,
  PaymentMethod,
  TicketCreated,
  Denominations,
} from "@/lib/db/caisse";

type CartItem = {
  ref: string;
  label: string;
  detail: string;
  unit: number;
  qty: number;
  unitLabel: string;
  isFree?: boolean;
  /** Commentaire libre par ligne (ex : coloris peinture SL10). */
  notes?: string;
};

type ClientPick = {
  id: string;
  display_name: string;
  city: string | null;
  phone: string | null;
  email: string | null;
};

type SearchResult = {
  reference: string;
  nom: string;
  designation: string;
  prix: number | null;
  fournisseur: string;
  type: string;
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  stripe: "Stripe",
  especes: "Espèces",
  cb: "CB",
  cheque: "Chèque",
  virement: "Virement",
};

const PAYMENT_ICONS = {
  especes: Banknote,
  cb: CreditCard,
  cheque: Banknote,
  virement: Receipt,
  stripe: CreditCard,
} as const;

const TVA_RATE = 20;

export default function CaisseClient({
  todayStats,
  blockedDay,
}: {
  todayStats: TodayStats;
  blockedDay?: string | null;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState<PaymentMethod>("cb");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [receiptEmail, setReceiptEmail] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState<TicketCreated | null>(null);
  const [closureOpen, setClosureOpen] = useState(false);
  const [client, setClient] = useState<ClientPick | null>(null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [freeLineOpen, setFreeLineOpen] = useState(false);

  // Split payment
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [payment2, setPayment2] = useState<PaymentMethod>("especes");
  const [amount1Str, setAmount1Str] = useState("");
  const [amount2Str, setAmount2Str] = useState("");

  const subtotal = useMemo(
    () => cart.reduce((acc, c) => acc + c.unit * c.qty, 0),
    [cart]
  );
  const totalHt = subtotal * (1 - discount / 100);
  const tva = totalHt * (TVA_RATE / 100);
  const totalTtc = totalHt + tva;

  // Charge les facets au montage (catégories + fournisseurs).
  useEffect(() => {
    listCaisseCatalogFacetsAction().then((f) => {
      setCategories(f.categories);
      setSuppliers(f.suppliers);
    });
  }, []);

  const hasFilter = Boolean(catFilter || supplierFilter);
  const hasQuery = query.length >= 2;

  useEffect(() => {
    if (!hasFilter && !hasQuery) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchCaisseCatalogAction({
          q: query,
          category: catFilter,
          supplier: supplierFilter,
        });
        setResults(r);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query, catFilter, supplierFilter, hasFilter, hasQuery]);

  const addItem = (p: SearchResult) => {
    if (p.prix == null) return;
    const existing = cart.find((c) => c.ref === p.reference);
    if (existing) {
      setCart(cart.map((c) => (c.ref === p.reference ? { ...c, qty: c.qty + 1 } : c)));
    } else {
      setCart([
        ...cart,
        {
          ref: p.reference,
          label: p.nom,
          detail: `${p.fournisseur} · ${p.type}`,
          unit: p.prix,
          qty: 1,
          unitLabel: p.type.toLowerCase().includes("tissu") ? "m" : "u",
        },
      ]);
    }
  };

  const adjustQty = (ref: string, delta: number) => {
    setCart(
      cart
        .map((c) =>
          c.ref === ref ? { ...c, qty: Math.max(0.5, Number((c.qty + delta).toFixed(2))) } : c
        )
        .filter((c) => c.qty > 0)
    );
  };

  const removeItem = (ref: string) => setCart(cart.filter((c) => c.ref !== ref));

  const addFreeItem = (input: {
    label: string;
    detail: string;
    qty: number;
    unit: number;
    unitLabel: string;
  }) => {
    const freeRef = `LIBRE-${Date.now().toString(36)}`;
    setCart([
      ...cart,
      {
        ref: freeRef,
        label: input.label,
        detail: input.detail,
        qty: input.qty,
        unit: input.unit,
        unitLabel: input.unitLabel,
        isFree: true,
      },
    ]);
  };

  const reset = () => {
    setCart([]);
    setDiscount(0);
    setPayment("cb");
    setCashReceived("");
    setReceiptEmail("");
    setClient(null);
    setSplitEnabled(false);
    setAmount1Str("");
    setAmount2Str("");
  };

  // Auto-répartit le total sur les 2 modes quand on active le split.
  useEffect(() => {
    if (!splitEnabled) return;
    if (totalTtc <= 0) return;
    if (!amount1Str && !amount2Str) {
      const half = Math.round((totalTtc / 2) * 100) / 100;
      setAmount1Str(half.toFixed(2));
      setAmount2Str((totalTtc - half).toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitEnabled, totalTtc]);

  // Quand on change amount1, calcule amount2 automatiquement.
  const updateAmount1 = (v: string) => {
    setAmount1Str(v);
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0 && n <= totalTtc) {
      setAmount2Str((totalTtc - n).toFixed(2));
    }
  };

  const encaisser = () => {
    if (blockedDay) {
      alert(
        `Impossible d'encaisser tant que la clôture du ${blockedDay} n'est pas faite.`,
      );
      return;
    }
    if (cart.length === 0) {
      alert("Panier vide");
      return;
    }
    if (!splitEnabled && payment === "especes") {
      const cr = Number(cashReceived);
      if (!Number.isFinite(cr) || cr < totalTtc - 0.01) {
        alert(`Encaissement espèces : entrez un montant >= ${eur(totalTtc)}`);
        return;
      }
    }
    if (splitEnabled) {
      if (payment === payment2) {
        alert("Paiement mixte : choisis deux modes de règlement différents.");
        return;
      }
      const a1 = Number(amount1Str);
      const a2 = Number(amount2Str);
      if (!Number.isFinite(a1) || !Number.isFinite(a2) || a1 <= 0 || a2 <= 0) {
        alert("Paiement mixte : renseigne les deux montants (> 0).");
        return;
      }
      if (Math.abs(a1 + a2 - totalTtc) > 0.02) {
        alert(
          `Paiement mixte : la somme (${(a1 + a2).toFixed(2)}€) doit égaler le total (${totalTtc.toFixed(2)}€).`,
        );
        return;
      }
    }
    startTransition(async () => {
      const r = await createTicketAction({
        client_id: client?.id ?? null,
        lines: cart.map((c) => ({
          ref: c.ref,
          // Le commentaire libre saisi par le caissier est concaténé au label
          // sur une seconde ligne (rendu sur le ticket PDF via split '\n').
          label: c.notes?.trim() ? `${c.label}\n${c.notes.trim()}` : c.label,
          qty: c.qty,
          unit_label: c.unitLabel,
          unit_price_ht: c.unit,
        })),
        payment_method: payment,
        payment_method_2: splitEnabled ? payment2 : null,
        amount_1: splitEnabled ? Number(amount1Str) : null,
        amount_2: splitEnabled ? Number(amount2Str) : null,
        discount_pct: discount,
        cash_received:
          !splitEnabled && payment === "especes" ? Number(cashReceived) : null,
        receipt_email: receiptEmail || null,
        tva_rate: TVA_RATE,
      });
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      setConfirmed(r.ticket);
      reset();
    });
  };

  return (
    <>
      <div>
        {blockedDay && (
          <section className="px-8 pt-6">
            <div className="rounded-lg border border-pink/30 bg-pink-soft/40 p-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded-md bg-pink text-white inline-flex items-center justify-center shrink-0">
                <Receipt className="h-4 w-4" strokeWidth={2.4} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink">
                  Caisse bloquée : clôture du {blockedDay} manquante
                </p>
                <p className="text-[12.5px] text-muted mt-0.5">
                  Impossible d&apos;encaisser de nouveaux tickets tant que la
                  journée précédente n&apos;a pas été comptée. Ouvre la clôture
                  ci-dessous.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setClosureOpen(true)}
              >
                Compter et clôturer
              </Button>
            </div>
          </section>
        )}
        <section className="px-8 pt-8 pb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="eyebrow mb-2">Module · Caisse &amp; Ventes Comptoir</p>
            <h1 className="text-[28px] font-semibold tracking-tight text-ink leading-[1.1]">
              Caisse en direct
              <span className="ml-3 text-[20px] text-muted-2 font-semibold tabular-nums">
                {eur(todayStats.totalTtc, true)}
              </span>
            </h1>
            <p className="text-[13.5px] text-muted mt-1">
              {todayStats.ticketCount} ticket{todayStats.ticketCount > 1 ? "s" : ""} aujourd'hui · Clôture en fin de journée pour export Pennylane.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setClosureOpen(true)}>
            <Receipt className="h-3.5 w-3.5" strokeWidth={2.4} /> Clôture jour
          </Button>
        </section>

        <section className="px-8 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total jour" value={eur(todayStats.totalTtc, true)} sub={`${todayStats.ticketCount} ticket${todayStats.ticketCount > 1 ? "s" : ""}`} tone="violet" icon={Receipt} />
            <StatCard label="Espèces" value={eur(todayStats.byMethod.especes.amount, true)} sub={`${todayStats.byMethod.especes.count} paiement(s)`} tone="emerald" icon={Banknote} />
            <StatCard label="CB" value={eur(todayStats.byMethod.cb.amount, true)} sub={`${todayStats.byMethod.cb.count} paiement(s)`} tone="blue" icon={CreditCard} />
            <StatCard label="Chèque + virement" value={eur(todayStats.byMethod.cheque.amount + todayStats.byMethod.virement.amount, true)} sub={`${todayStats.byMethod.cheque.count + todayStats.byMethod.virement.count} paiement(s)`} tone="amber" icon={Banknote} />
          </div>
        </section>

        <section className="px-8 pb-10 grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Chercher (référence, nom, fournisseur)…"
                  className="pl-9 rounded-lg bg-white h-10 text-[13.5px]"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2 animate-spin" />
                )}
              </div>
              <select
                value={catFilter ?? ""}
                onChange={(e) => setCatFilter(e.target.value || null)}
                className="h-10 rounded-lg border border-line bg-white px-3 text-[13px] text-ink"
              >
                <option value="">Toutes catégories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={supplierFilter ?? ""}
                onChange={(e) => setSupplierFilter(e.target.value || null)}
                className="h-10 rounded-lg border border-line bg-white px-3 text-[13px] text-ink max-w-[200px]"
                disabled={suppliers.length === 0}
              >
                <option value="">Tous fournisseurs</option>
                {suppliers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setFreeLineOpen(true)}
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-line bg-white hover:border-line-strong text-[12.5px] font-semibold text-ink-2 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
                Ligne libre
              </button>
            </div>

            {(catFilter || supplierFilter || hasQuery) && (
              <div className="flex items-center gap-2 flex-wrap text-[12px]">
                <span className="text-muted-2">Filtres actifs :</span>
                {hasQuery && (
                  <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-canvas-2 border border-line text-ink-2">
                    « {query} »
                  </span>
                )}
                {catFilter && (
                  <span className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-md bg-violet-soft text-violet-strong border border-violet/20">
                    {catFilter}
                    <button
                      onClick={() => setCatFilter(null)}
                      className="hover:text-ink"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {supplierFilter && (
                  <span className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-md bg-blue-soft text-blue border border-blue/20">
                    {supplierFilter}
                    <button
                      onClick={() => setSupplierFilter(null)}
                      className="hover:text-ink"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setQuery("");
                    setCatFilter(null);
                    setSupplierFilter(null);
                  }}
                  className="text-muted hover:text-ink underline ml-1"
                >
                  Tout effacer
                </button>
              </div>
            )}

            {!hasFilter && !hasQuery ? (
              <Card className="py-10 px-6">
                <p className="text-[13.5px] text-ink font-medium mb-2 text-center">
                  Parcourir le catalogue (~45 000 produits)
                </p>
                <p className="text-[12px] text-muted mb-5 text-center">
                  Filtre par catégorie ou fournisseur, ou tape 2+ caractères
                  pour rechercher.
                </p>
                {categories.length > 0 && (
                  <>
                    <p className="text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 mb-2">
                      Catégories populaires
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {categories.slice(0, 12).map((c) => (
                        <button
                          key={c}
                          onClick={() => setCatFilter(c)}
                          className="h-7 px-2.5 rounded-md text-[12px] font-medium bg-white border border-line hover:border-violet hover:text-violet transition-colors"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {suppliers.length > 0 && (
                  <>
                    <p className="text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 mb-2">
                      Fournisseurs
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {suppliers.slice(0, 20).map((s) => (
                        <button
                          key={s}
                          onClick={() => setSupplierFilter(s)}
                          className="h-7 px-2.5 rounded-md text-[12px] font-medium bg-white border border-line hover:border-blue hover:text-blue transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                      {suppliers.length > 20 && (
                        <span className="text-[11px] text-muted-2 self-center">
                          + {suppliers.length - 20} autres (voir liste)
                        </span>
                      )}
                    </div>
                  </>
                )}
              </Card>
            ) : results.length === 0 && !searching ? (
              <Card className="py-12 px-6 text-center">
                <p className="text-[13px] text-muted">
                  Aucun produit trouvé{hasQuery && (
                    <>
                      {" "}
                      pour <strong className="text-ink">&quot;{query}&quot;</strong>
                    </>
                  )}
                  {(catFilter || supplierFilter) && " avec ces filtres"}.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.map((p) => (
                  <button
                    key={p.reference}
                    onClick={() => addItem(p)}
                    disabled={p.prix == null}
                    className="card p-3 text-left hover:border-line-strong transition-colors disabled:opacity-50"
                  >
                    <p className="text-[12.5px] font-semibold text-ink leading-tight line-clamp-2">{p.nom}</p>
                    <p className="ref mt-0.5 truncate">{p.reference}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-line">
                      <span className="text-[10.5px] text-muted truncate">{p.fournisseur}</span>
                      <span className="text-[13px] font-semibold text-ink tabular-nums">
                        {p.prix == null ? "—" : eur(p.prix)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Card className="sticky top-20 overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 6rem)" }}>
            <div className="p-4 border-b border-line">
              <p className="text-[11.5px] font-semibold tracking-wider uppercase text-muted-2">
                Ticket en cours
              </p>
              {client ? (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-violet/30 bg-violet-soft/40 p-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink truncate">
                      {client.display_name}
                    </p>
                    <p className="text-[11px] text-muted truncate">
                      {[client.phone, client.city].filter(Boolean).join(" · ") ||
                        "—"}
                    </p>
                  </div>
                  <button
                    onClick={() => setClient(null)}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-2 hover:text-pink"
                    aria-label="Retirer le client"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  className="mt-2 w-full inline-flex items-center justify-center gap-2 h-12 rounded-lg bg-violet text-white text-[14px] font-semibold hover:bg-violet-strong transition-colors shadow-sm"
                  onClick={() => setClientPickerOpen(true)}
                >
                  <UserPlus className="h-4 w-4" strokeWidth={2.4} />
                  Associer à un client
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="p-8 text-center text-muted-2 text-[13px]">Panier vide</div>
              ) : (
                <div className="divide-y divide-line">
                  {cart.map((c) => (
                    <div key={c.ref} className="p-3 flex items-start gap-2.5">
                      <ColorChip tone="violet" size="sm">
                        <Tag className="h-3 w-3" strokeWidth={2.4} />
                      </ColorChip>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-semibold text-ink leading-tight truncate">{c.label}</p>
                        <p className="ref mt-0.5 truncate">{c.ref} · {c.detail}</p>
                        {/* Champ commentaire libre — ex : coloris peinture SL10 */}
                        <input
                          type="text"
                          value={c.notes ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCart((prev) =>
                              prev.map((x) =>
                                x.ref === c.ref ? { ...x, notes: val } : x,
                              ),
                            );
                          }}
                          placeholder="Commentaire (coloris, référence…)"
                          className="mt-1 w-full text-[11px] px-1.5 h-6 rounded border border-line/60 bg-white text-ink-2 placeholder:text-muted-2 focus:border-violet focus:outline-none focus:ring-1 focus:ring-violet/20"
                        />
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="inline-flex items-center gap-1 rounded-md border border-line bg-white p-0.5">
                            <button onClick={() => adjustQty(c.ref, -0.5)} className="h-5 w-5 rounded inline-flex items-center justify-center text-muted hover:bg-canvas-2 hover:text-ink">
                              <Minus className="h-3 w-3" strokeWidth={2.4} />
                            </button>
                            <span className="text-[11.5px] font-mono font-semibold tabular-nums px-1 text-ink">
                              {c.qty.toLocaleString("fr-FR")} {c.unitLabel}
                            </span>
                            <button onClick={() => adjustQty(c.ref, 0.5)} className="h-5 w-5 rounded inline-flex items-center justify-center text-muted hover:bg-canvas-2 hover:text-ink">
                              <Plus className="h-3 w-3" strokeWidth={2.4} />
                            </button>
                          </div>
                          <span className="text-[12.5px] font-semibold tabular-nums text-ink">{eur(c.unit * c.qty)}</span>
                        </div>
                      </div>
                      <button onClick={() => removeItem(c.ref)} className="text-muted-2 hover:text-pink transition-colors" aria-label="Retirer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-line">
              <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11.5px] text-muted">
                  <Percent className="h-3 w-3" /> Remise
                </div>
                <div className="relative w-20">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
                    className="h-7 text-[12px] pr-6 text-right"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted">%</span>
                </div>
              </div>

              <div className="px-4 pb-2 space-y-1 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Sous-total HT</span>
                  <span className="text-ink-2 tabular-nums">{eur(totalHt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">TVA {TVA_RATE}%</span>
                  <span className="text-muted tabular-nums">{eur(tva)}</span>
                </div>
              </div>

              <div className="px-4 py-3 flex items-baseline justify-between border-t border-line bg-canvas-2/30">
                <span className="text-[13px] font-semibold text-ink">Total TTC</span>
                <span className="text-[24px] font-semibold text-ink tabular-nums leading-none">
                  {eur(totalTtc)}
                </span>
              </div>

              <div className="px-4 py-3 border-t border-line">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">
                    Mode de règlement
                  </p>
                  <label className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={splitEnabled}
                      onChange={(e) => {
                        setSplitEnabled(e.target.checked);
                        if (e.target.checked && totalTtc > 0) {
                          const half = Math.round((totalTtc / 2) * 100) / 100;
                          setAmount1Str(half.toFixed(2));
                          setAmount2Str((totalTtc - half).toFixed(2));
                        }
                      }}
                      className="h-3.5 w-3.5"
                    />
                    Paiement en 2 fois
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["especes", "cb", "cheque", "virement"] as const).map((mode) => {
                    const Icon = PAYMENT_ICONS[mode];
                    const active = payment === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => {
                          setPayment(mode);
                          if (!splitEnabled) {
                            if (mode !== "especes" && totalTtc > 0) {
                              setCashReceived(String(totalTtc));
                            } else if (mode === "especes") {
                              setCashReceived("");
                            }
                          }
                        }}
                        className={
                          "inline-flex items-center gap-1.5 px-2 h-8 rounded-md text-[12px] font-medium transition-colors " +
                          (active ? "bg-ink text-white" : "bg-white text-muted-2 hover:text-ink border border-line")
                        }
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                        {PAYMENT_LABELS[mode]}
                      </button>
                    );
                  })}
                </div>

                {splitEnabled && (
                  <div className="mt-2 space-y-2 rounded-md bg-canvas-2/40 p-2 border border-line">
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={totalTtc}
                        value={amount1Str}
                        onChange={(e) => updateAmount1(e.target.value)}
                        className="h-8 text-[12px] tabular-nums flex-1"
                        placeholder="Montant 1"
                      />
                      <span className="text-[11.5px] text-muted-2">
                        {PAYMENT_LABELS[payment]}
                      </span>
                    </div>
                    <p className="text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">
                      Second mode
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        ["especes", "cb", "cheque", "virement"] as const
                      ).map((mode) => {
                        const Icon = PAYMENT_ICONS[mode];
                        const active = payment2 === mode;
                        const disabled = mode === payment;
                        return (
                          <button
                            key={mode}
                            onClick={() => setPayment2(mode)}
                            disabled={disabled}
                            className={
                              "inline-flex items-center gap-1.5 px-2 h-7 rounded-md text-[11.5px] font-medium transition-colors " +
                              (disabled
                                ? "opacity-30 cursor-not-allowed border border-line bg-white"
                                : active
                                  ? "bg-ink text-white"
                                  : "bg-white text-muted-2 hover:text-ink border border-line")
                            }
                          >
                            <Icon className="h-3 w-3" strokeWidth={2.2} />
                            {PAYMENT_LABELS[mode]}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={totalTtc}
                        value={amount2Str}
                        onChange={(e) => setAmount2Str(e.target.value)}
                        className="h-8 text-[12px] tabular-nums flex-1"
                        placeholder="Montant 2"
                      />
                      <span className="text-[11.5px] text-muted-2">
                        {PAYMENT_LABELS[payment2]}
                      </span>
                    </div>
                    {(() => {
                      const sum =
                        (Number(amount1Str) || 0) + (Number(amount2Str) || 0);
                      const diff = Math.round((sum - totalTtc) * 100) / 100;
                      if (Math.abs(diff) < 0.01) {
                        return (
                          <p className="text-[11px] text-emerald font-medium">
                            Total réparti : {eur(sum)} ✓
                          </p>
                        );
                      }
                      return (
                        <p className="text-[11px] text-amber font-medium">
                          {diff > 0 ? "Excédent" : "Manque"} :{" "}
                          {eur(Math.abs(diff))}
                        </p>
                      );
                    })()}
                  </div>
                )}

                {!splitEnabled && payment === "especes" && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-stretch gap-1.5">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder={`Montant remis (>= ${eur(totalTtc)})`}
                        className="h-9 text-[12.5px] tabular-nums flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => setCashReceived(String(totalTtc))}
                        title="Montant exact (pas de rendu)"
                        className="h-9 px-2.5 rounded-md bg-ink text-white text-[11px] font-semibold whitespace-nowrap hover:bg-ink-2 transition-colors"
                      >
                        = TTC
                      </button>
                    </div>
                    {/* Raccourcis billets — calculés selon le total */}
                    <div className="flex flex-wrap gap-1.5">
                      {nextBillsAbove(totalTtc).map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setCashReceived(String(amount))}
                          className="h-7 px-2.5 rounded-md bg-white border border-line hover:border-line-strong text-[11.5px] font-medium text-ink-2 tabular-nums transition-colors"
                        >
                          {amount}€
                        </button>
                      ))}
                    </div>
                    {cashReceived && Number(cashReceived) >= totalTtc && (
                      <p className="text-[11.5px] text-emerald font-medium">
                        Rendu :{" "}
                        <span className="tabular-nums font-semibold">
                          {eur(Number(cashReceived) - totalTtc)}
                        </span>
                      </p>
                    )}
                    {cashReceived && Number(cashReceived) < totalTtc && (
                      <p className="text-[11.5px] text-amber">
                        Manque {eur(totalTtc - Number(cashReceived))}
                      </p>
                    )}
                  </div>
                )}
                <div className="mt-2">
                  <Input
                    type="email"
                    value={receiptEmail}
                    onChange={(e) => setReceiptEmail(e.target.value)}
                    placeholder="Email ticket (optionnel)"
                    className="h-8 text-[12px]"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-line">
                <Button variant="primary" size="lg" className="w-full" onClick={encaisser} disabled={pending || cart.length === 0}>
                  {pending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> …
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} /> Encaisser {eur(totalTtc, true)}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </section>
      </div>

      {confirmed && (
        <Modal onClose={() => setConfirmed(null)}>
          <div className="text-center">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald to-blue text-white inline-flex items-center justify-center mb-4 mx-auto">
              <CheckCircle2 className="h-7 w-7" strokeWidth={2.4} />
            </div>
            <h2 className="text-[20px] font-semibold text-ink mb-1">Ticket encaissé</h2>
            <p className="font-mono text-[13px] text-muted mb-4">{confirmed.number}</p>
            <p className="text-[28px] font-semibold tabular-nums text-ink leading-none mb-1">
              {eur(confirmed.total_ttc, true)}
            </p>
            {confirmed.change_due != null && confirmed.change_due > 0 && (
              <p className="text-[13px] text-muted mb-2">
                Rendu :{" "}
                <span className="text-emerald font-semibold tabular-nums">
                  {eur(confirmed.change_due)}
                </span>
              </p>
            )}
            <div className="flex items-center gap-2 mt-6">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => alert("Email reçu : nécessite la clé Brevo.")}>
                <Mail className="h-3.5 w-3.5" /> Email reçu
              </Button>
              <Button variant="primary" size="sm" className="flex-1" onClick={() => setConfirmed(null)}>
                Nouveau ticket
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {closureOpen && (
        <ClosureModal
          onClose={() => setClosureOpen(false)}
          expectedCash={todayStats.byMethod.especes.amount}
          blockedDay={blockedDay ?? null}
        />
      )}

      {clientPickerOpen && (
        <ClientPickerModal
          onClose={() => setClientPickerOpen(false)}
          onPick={(c) => {
            setClient(c);
            setClientPickerOpen(false);
            if (c.email) setReceiptEmail(c.email);
          }}
        />
      )}

      {freeLineOpen && (
        <FreeLineModal
          onClose={() => setFreeLineOpen(false)}
          onAdd={(input) => {
            addFreeItem(input);
            setFreeLineOpen(false);
          }}
        />
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// Modal picker client
// ────────────────────────────────────────────────────────────────
function ClientPickerModal({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (c: ClientPick) => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ClientPick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchClientsForCaisseAction(q);
        setItems(r);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <Modal onClose={onClose}>
      <h2 className="text-[16px] font-semibold text-ink mb-3">
        Associer un client
      </h2>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nom, téléphone, email…"
          autoFocus
          className="pl-9"
        />
      </div>
      <div className="max-h-[50vh] overflow-y-auto -mx-2">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Chargement…
          </div>
        ) : items.length === 0 ? (
          <p className="text-center py-6 text-[13px] text-muted">
            Aucun client trouvé.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => onPick(c)}
                  className="w-full text-left px-2 py-2.5 hover:bg-canvas-2/50 rounded-md transition-colors"
                >
                  <p className="text-[13.5px] font-semibold text-ink">
                    {c.display_name}
                  </p>
                  <p className="text-[11.5px] text-muted mt-0.5 truncate">
                    {[c.phone, c.email, c.city].filter(Boolean).join(" · ") ||
                      "—"}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────────
// Modal ajout d'une ligne libre au ticket
// ────────────────────────────────────────────────────────────────
function FreeLineModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (input: {
    label: string;
    detail: string;
    qty: number;
    unit: number;
    unitLabel: string;
  }) => void;
}) {
  const [label, setLabel] = useState("");
  const [detail, setDetail] = useState("");
  const [qty, setQty] = useState<number>(1);
  const [unit, setUnit] = useState<number>(0);
  const [unitLabel, setUnitLabel] = useState("u");

  const submit = () => {
    if (!label.trim()) {
      alert("Désignation requise.");
      return;
    }
    if (qty <= 0) {
      alert("Quantité doit être > 0.");
      return;
    }
    if (unit < 0) {
      alert("Prix négatif interdit.");
      return;
    }
    onAdd({
      label: label.trim(),
      detail: detail.trim(),
      qty,
      unit,
      unitLabel,
    });
  };

  return (
    <Modal onClose={onClose}>
      <h2 className="text-[16px] font-semibold text-ink mb-1">
        Ligne libre au ticket
      </h2>
      <p className="text-[12px] text-muted mb-4">
        Produit hors catalogue, forfait, ou correction ponctuelle.
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
            Désignation *
          </label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ex: Retouche ourlet"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
            Description (optionnel)
          </label>
          <Input
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="ex: 2 rideaux · pose immédiate"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
              Quantité
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
              Unité
            </label>
            <select
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              className="w-full h-9 rounded-md border border-line-strong bg-white px-2 text-[13px] text-ink"
            >
              <option value="u">u</option>
              <option value="m">m</option>
              <option value="m²">m²</option>
              <option value="h">h</option>
              <option value="forfait">forfait</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
              P.U. HT €
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={unit}
              onChange={(e) => setUnit(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-line">
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button variant="primary" size="sm" onClick={submit} className="flex-1">
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Renvoie les 3 billets / coupures arrondies utiles au-dessus du total
 * (raccourcis pour la saisie espèces). Ex: total=187,40 → [190, 200, 250].
 */
function nextBillsAbove(total: number): number[] {
  if (total <= 0) return [10, 20, 50];
  const rounded = Math.ceil(total);
  const candidates = [
    Math.ceil(rounded / 10) * 10,
    Math.ceil(rounded / 20) * 20,
    Math.ceil(rounded / 50) * 50,
    Math.ceil(rounded / 100) * 100,
  ];
  // Dédup + min strict au-dessus du total
  const unique = Array.from(new Set(candidates))
    .filter((v) => v > total)
    .sort((a, b) => a - b)
    .slice(0, 3);
  return unique.length > 0 ? unique : [rounded + 10];
}

function StatCard({
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "violet" | "emerald" | "blue" | "amber";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <Card className="p-4 flex items-start gap-3">
      <ColorChip tone={tone} size="md">
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </ColorChip>
      <div className="flex-1 min-w-0">
        <p className="text-[11.5px] text-muted-2 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-[22px] font-semibold text-ink leading-tight tabular-nums mt-0.5">{value}</p>
        <p className="text-[11px] text-muted mt-0.5">{sub}</p>
      </div>
    </Card>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-2 hover:text-ink" aria-label="Fermer">
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

const DENOMS: {
  key: keyof Denominations;
  value: number;
  label: string;
  type: "billet" | "piece";
}[] = [
  { key: "b500", value: 500, label: "500 €", type: "billet" },
  { key: "b200", value: 200, label: "200 €", type: "billet" },
  { key: "b100", value: 100, label: "100 €", type: "billet" },
  { key: "b50", value: 50, label: "50 €", type: "billet" },
  { key: "b20", value: 20, label: "20 €", type: "billet" },
  { key: "b10", value: 10, label: "10 €", type: "billet" },
  { key: "b5", value: 5, label: "5 €", type: "billet" },
  { key: "p2", value: 2, label: "2 €", type: "piece" },
  { key: "p1", value: 1, label: "1 €", type: "piece" },
  { key: "c50", value: 0.5, label: "50 cts", type: "piece" },
  { key: "c20", value: 0.2, label: "20 cts", type: "piece" },
  { key: "c10", value: 0.1, label: "10 cts", type: "piece" },
  { key: "c5", value: 0.05, label: "5 cts", type: "piece" },
  { key: "c2", value: 0.02, label: "2 cts", type: "piece" },
  { key: "c1", value: 0.01, label: "1 ct", type: "piece" },
];

function ClosureModal({
  onClose,
  expectedCash,
  blockedDay,
}: {
  onClose: () => void;
  expectedCash: number;
  blockedDay?: string | null;
}) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Priorité : la clôture concerne la journée bloquée si elle existe,
  // sinon aujourd'hui.
  const date = blockedDay ?? new Date().toISOString().slice(0, 10);

  const total = useMemo(() => {
    let t = 0;
    for (const d of DENOMS) {
      t += (counts[d.key] || 0) * d.value;
    }
    return Number(t.toFixed(2));
  }, [counts]);

  const variance = total - expectedCash;
  const hasAny = DENOMS.some((d) => (counts[d.key] || 0) > 0);

  const submit = () => {
    if (!hasAny) {
      setError(
        "Renseigne le nombre de billets/pièces (comptage détaillé obligatoire).",
      );
      return;
    }
    if (!confirm(`Confirmer la clôture du ${date} avec un total compté de ${eur(total)} ?`))
      return;
    setError(null);
    startTransition(async () => {
      const denominations: Denominations = {};
      for (const d of DENOMS) {
        if ((counts[d.key] || 0) > 0) {
          (denominations as Record<string, number>)[d.key] = counts[d.key];
        }
      }
      const r = await closeCashRegisterAction(date, total, denominations, notes || undefined);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      alert(
        r.variance != null && Math.abs(r.variance) > 0.01
          ? `Clôture créée. Écart caisse : ${eur(r.variance)}`
          : "Clôture créée — caisse équilibrée.",
      );
      onClose();
      window.location.reload();
    });
  };

  const setCount = (key: string, v: string) => {
    const n = Math.max(0, Math.floor(Number(v) || 0));
    setCounts((c) => ({ ...c, [key]: n }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-2 hover:text-ink"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-[18px] font-semibold text-ink mb-1">
          Clôture du {date}
        </h2>
        <p className="text-[12.5px] text-muted mb-4">
          Espèces attendues :{" "}
          <span className="font-semibold tabular-nums">
            {eur(expectedCash, true)}
          </span>
          {" · "}Comptage détaillé <strong className="text-ink">obligatoire</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 mb-2">
              Billets
            </p>
            <div className="space-y-1.5">
              {DENOMS.filter((d) => d.type === "billet").map((d) => (
                <DenomRow
                  key={d.key}
                  label={d.label}
                  value={counts[d.key] || 0}
                  onChange={(v) => setCount(d.key, v)}
                  amount={(counts[d.key] || 0) * d.value}
                  disabled={pending}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 mb-2">
              Pièces
            </p>
            <div className="space-y-1.5">
              {DENOMS.filter((d) => d.type === "piece").map((d) => (
                <DenomRow
                  key={d.key}
                  label={d.label}
                  value={counts[d.key] || 0}
                  onChange={(v) => setCount(d.key, v)}
                  amount={(counts[d.key] || 0) * d.value}
                  disabled={pending}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 p-4 rounded-lg border border-line bg-canvas-2/40">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[13px] font-semibold text-ink">
              Total compté
            </span>
            <span className="text-[24px] font-bold text-ink tabular-nums">
              {eur(total)}
            </span>
          </div>
          {Math.abs(variance) > 0.01 && (
            <p
              className={
                "text-[12.5px] font-medium " +
                (variance < 0 ? "text-pink" : "text-emerald")
              }
            >
              Écart caisse : {variance > 0 ? "+" : ""}
              {eur(variance)}
            </p>
          )}
        </div>

        <div className="mt-4">
          <label className="block">
            <span className="block text-[11.5px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
              Notes (optionnel)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-line-strong bg-surface p-3 text-[13.5px] text-ink placeholder:text-muted-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 resize-y"
              placeholder="Raison d'un écart, événement particulier…"
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 text-[12.5px] text-pink bg-pink-soft/40 border border-pink/30 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2 pt-4 mt-4 border-t border-line">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={pending}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={submit}
            disabled={pending || !hasAny}
            className="flex-1"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Clôturer"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DenomRow({
  label,
  value,
  onChange,
  amount,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
  amount: number;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-[64px_1fr_88px] items-center gap-2">
      <span className="text-[12px] font-mono font-semibold text-ink-2 tabular-nums">
        {label}
      </span>
      <Input
        type="number"
        min="0"
        step="1"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-8 text-[12px] tabular-nums text-right"
        placeholder="0"
      />
      <span className="text-[11.5px] font-medium tabular-nums text-muted-2 text-right pr-1">
        {amount > 0 ? eur(amount) : "—"}
      </span>
    </div>
  );
}
