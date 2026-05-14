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
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { eur } from "@/lib/formatters";
import {
  createTicketAction,
  searchCaisseCatalogAction,
  closeCashRegisterAction,
} from "./actions";
import type { TodayStats, PaymentMethod, TicketCreated } from "@/lib/db/caisse";

type CartItem = {
  ref: string;
  label: string;
  detail: string;
  unit: number;
  qty: number;
  unitLabel: string;
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

export default function CaisseClient({ todayStats }: { todayStats: TodayStats }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState<PaymentMethod>("cb");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [receiptEmail, setReceiptEmail] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState<TicketCreated | null>(null);
  const [closureOpen, setClosureOpen] = useState(false);

  const subtotal = useMemo(
    () => cart.reduce((acc, c) => acc + c.unit * c.qty, 0),
    [cart]
  );
  const totalHt = subtotal * (1 - discount / 100);
  const tva = totalHt * (TVA_RATE / 100);
  const totalTtc = totalHt + tva;

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchCaisseCatalogAction(query);
        setResults(r);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

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

  const reset = () => {
    setCart([]);
    setDiscount(0);
    setPayment("cb");
    setCashReceived("");
    setReceiptEmail("");
  };

  const encaisser = () => {
    if (cart.length === 0) {
      alert("Panier vide");
      return;
    }
    if (payment === "especes") {
      const cr = Number(cashReceived);
      if (!Number.isFinite(cr) || cr < totalTtc - 0.01) {
        alert(`Encaissement espèces : entrez un montant >= ${eur(totalTtc)}`);
        return;
      }
    }
    startTransition(async () => {
      const r = await createTicketAction({
        lines: cart.map((c) => ({
          ref: c.ref,
          label: c.label,
          qty: c.qty,
          unit_label: c.unitLabel,
          unit_price_ht: c.unit,
        })),
        payment_method: payment,
        discount_pct: discount,
        cash_received: payment === "especes" ? Number(cashReceived) : null,
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
      <Topbar
        breadcrumb={[{ label: "Atmosphère" }, { label: "Caisse" }]}
        actions={
          <Button variant="primary" size="sm" onClick={() => setClosureOpen(true)}>
            <Receipt className="h-3.5 w-3.5" strokeWidth={2.4} /> Clôture jour
          </Button>
        }
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Module · Caisse & Ventes Comptoir</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Caisse en direct
            <span className="ml-3 text-[24px] text-muted-2 font-semibold tabular-nums">
              {eur(todayStats.totalTtc, true)}
            </span>
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            {todayStats.ticketCount} ticket{todayStats.ticketCount > 1 ? "s" : ""} aujourd'hui · Clôture en fin de journée pour export Pennylane.
          </p>
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
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Référence, nom produit, fournisseur…"
                  className="pl-9 rounded-lg bg-white h-10 text-[13.5px]"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2 animate-spin" />
                )}
              </div>
            </div>

            {query.length < 2 ? (
              <Card className="py-16 px-6 text-center">
                <p className="text-[13px] text-muted">
                  Tape une référence ou un nom de produit pour rechercher dans le catalogue (47 000+ produits).
                </p>
              </Card>
            ) : results.length === 0 && !searching ? (
              <Card className="py-12 px-6 text-center">
                <p className="text-[13px] text-muted">
                  Aucun produit trouvé pour <strong className="text-ink">&quot;{query}&quot;</strong>.
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
              <p className="text-[11.5px] font-semibold tracking-wider uppercase text-muted-2">Ticket en cours</p>
              <button
                className="mt-2 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-line hover:border-line-strong text-[12.5px] text-muted hover:text-ink transition-colors"
                onClick={() => alert("Sélection client : à implémenter — sinon laisse vide pour un ticket comptoir anonyme.")}
              >
                <UserPlus className="h-3.5 w-3.5" strokeWidth={2.2} />
                Associer un client (optionnel)
              </button>
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
                <p className="text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 mb-2">
                  Mode de règlement
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["especes", "cb", "cheque", "virement"] as const).map((mode) => {
                    const Icon = PAYMENT_ICONS[mode];
                    const active = payment === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => setPayment(mode)}
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
                {payment === "especes" && (
                  <div className="mt-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder={`Montant remis (>= ${eur(totalTtc)})`}
                      className="h-9 text-[12.5px] tabular-nums"
                    />
                    {cashReceived && Number(cashReceived) >= totalTtc && (
                      <p className="mt-1.5 text-[11.5px] text-emerald font-medium">
                        Rendu : <span className="tabular-nums">{eur(Number(cashReceived) - totalTtc)}</span>
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
        />
      )}
    </>
  );
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

function ClosureModal({ onClose, expectedCash }: { onClose: () => void; expectedCash: number }) {
  const [cashCounted, setCashCounted] = useState<string>(expectedCash.toFixed(2));
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const date = new Date().toISOString().slice(0, 10);
  const variance = Number(cashCounted) - expectedCash;

  const submit = () => {
    if (!confirm("Confirmer la clôture du jour ? Les tickets seront verrouillés.")) return;
    startTransition(async () => {
      const r = await closeCashRegisterAction(date, Number(cashCounted), notes || undefined);
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      alert(
        r.variance != null && Math.abs(r.variance) > 0.01
          ? `Clôture créée. Écart caisse : ${eur(r.variance)}`
          : "Clôture créée — caisse équilibrée."
      );
      onClose();
      window.location.reload();
    });
  };

  return (
    <Modal onClose={onClose}>
      <h2 className="text-[18px] font-semibold text-ink mb-1">Clôture du {date}</h2>
      <p className="text-[12.5px] text-muted mb-4">
        Espèces attendues : <span className="font-semibold tabular-nums">{eur(expectedCash, true)}</span>
      </p>
      <div className="space-y-3">
        <label className="block">
          <span className="block text-[11.5px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
            Espèces comptées
          </span>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={cashCounted}
            onChange={(e) => setCashCounted(e.target.value)}
            className="tabular-nums"
          />
          {Math.abs(variance) > 0.01 && (
            <p className={"mt-1 text-[12px] font-medium " + (variance < 0 ? "text-pink" : "text-emerald")}>
              Écart : {variance > 0 ? "+" : ""}{eur(variance)}
            </p>
          )}
        </label>
        <label className="block">
          <span className="block text-[11.5px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
            Notes (optionnel)
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-line-strong bg-surface p-3 text-[13.5px] text-ink placeholder:text-muted-2 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 resize-y"
            placeholder="Pourquoi un écart, événement particulier…"
          />
        </label>
        <div className="flex items-center gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending} className="flex-1">
            Annuler
          </Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={pending} className="flex-1">
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Clôturer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
