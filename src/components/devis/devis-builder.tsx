"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Send,
  Loader2,
  AlertCircle,
  Sparkles,
  Search,
  Check,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Hint } from "@/components/ui/input";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import { channelLabels, type Channel } from "@/lib/validation/client";
import type { DevisFormState } from "@/app/(platform)/devis/actions";

type ClientPick = {
  id: string;
  display_name: string;
  city: string | null;
  channel: string;
  email: string | null;
};

type Line = {
  id: string;
  ref: string;
  label: string;
  detail: string;
  qty: number;
  unit_label: string;
  unit_price_ht: number;
};

const EMPTY_LINE = (): Line => ({
  id: crypto.randomUUID(),
  ref: "",
  label: "",
  detail: "",
  qty: 1,
  unit_label: "u",
  unit_price_ht: 0,
});

const eurFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const channelTones: Record<Channel, "violet" | "orange" | "blue" | "pink" | "emerald"> = {
  magasin: "violet",
  leroy_merlin: "orange",
  saint_maclou: "orange",
  ecommerce: "blue",
  decoratrice: "pink",
  visio: "emerald",
};

export function DevisBuilder({
  clients,
  action,
  initialClientId,
  decoratrices = [],
}: {
  clients: ClientPick[];
  action: (prev: DevisFormState, formData: FormData) => Promise<DevisFormState>;
  initialClientId?: string | null;
  decoratrices?: { id: string; full_name: string }[];
}) {
  const initial =
    (initialClientId && clients.find((c) => c.id === initialClientId)) || null;
  const [selectedClient, setSelectedClient] = useState<ClientPick | null>(initial);
  const [clientQuery, setClientQuery] = useState("");
  const [productSummary, setProductSummary] = useState("Rideaux sur mesure");
  const [productDetail, setProductDetail] = useState("");
  const [tvaRate, setTvaRate] = useState(20);
  const [workshopNotes, setWorkshopNotes] = useState("");
  const [channel, setChannel] = useState<Channel>("magasin");
  const [decoratriceId, setDecoratriceId] = useState<string>("");
  const [lines, setLines] = useState<Line[]>([
    {
      id: crypto.randomUUID(),
      ref: "",
      label: "",
      detail: "",
      qty: 1,
      unit_label: "u",
      unit_price_ht: 0,
    },
  ]);
  const [submitState, setSubmitState] = useState<DevisFormState>(undefined);
  const [isPending, setIsPending] = useState(false);

  const filteredClients = useMemo(() => {
    if (!clientQuery) return clients.slice(0, 8);
    const q = clientQuery.toLowerCase();
    return clients
      .filter(
        (c) =>
          c.display_name.toLowerCase().includes(q) ||
          (c.city?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 8);
  }, [clients, clientQuery]);

  const totals = useMemo(() => {
    const total_ht = lines.reduce(
      (acc, l) => acc + Math.round(l.qty * l.unit_price_ht * 100) / 100,
      0
    );
    const tva = Math.round(total_ht * (tvaRate / 100) * 100) / 100;
    const total_ttc = Math.round((total_ht + tva) * 100) / 100;
    const acompte = Math.round((total_ttc / 2) * 100) / 100;
    return { total_ht, tva, total_ttc, acompte, solde: total_ttc - acompte };
  }, [lines, tvaRate]);

  const updateLine = (id: string, patch: Partial<Line>) => {
    setLines((arr) => arr.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const removeLine = (id: string) => {
    setLines((arr) => (arr.length > 1 ? arr.filter((l) => l.id !== id) : arr));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClient) {
      setSubmitState({ ok: false, errors: { client_id: "Sélectionne un client" }, message: "Un client est requis." });
      return;
    }
    if (lines.length === 0 || lines.every((l) => !l.label.trim())) {
      setSubmitState({ ok: false, errors: { lines: "Ajoute au moins une ligne" }, message: "Au moins une ligne avec un label requise." });
      return;
    }

    const fd = new FormData();
    fd.set("client_id", selectedClient.id);
    fd.set("channel", channel);
    fd.set("decoratrice_id", decoratriceId);
    fd.set("product_summary", productSummary);
    fd.set("product_detail", productDetail);
    fd.set("tva_rate", String(tvaRate));
    fd.set("workshop_notes", workshopNotes);
    fd.set(
      "lines",
      JSON.stringify(
        lines
          .filter((l) => l.label.trim())
          .map((l) => ({
            ref: l.ref,
            label: l.label,
            detail: l.detail,
            qty: l.qty,
            unit_label: l.unit_label,
            unit_price_ht: l.unit_price_ht,
          }))
      )
    );

    setIsPending(true);
    try {
      const result = await action(undefined, fd);
      if (result && !result.ok) {
        setSubmitState(result);
        setIsPending(false);
      }
      // Si OK, la Server Action redirect — pas besoin de gérer le succès ici
    } catch (err) {
      setSubmitState({
        ok: false,
        errors: {},
        message: err instanceof Error ? err.message : "Erreur réseau",
      });
      setIsPending(false);
    }
  };

  const errors = submitState && !submitState.ok ? submitState.errors : {};
  const message = submitState && !submitState.ok ? submitState.message : undefined;

  return (
    <form onSubmit={handleSubmit}>
      {/* Header */}
      <header className="mb-6">
        <Link
          href="/devis"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-ink-2 mb-2"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={2.2} /> Devis
        </Link>
        <div className="flex items-end justify-between gap-8 flex-wrap">
          <div>
            <p className="eyebrow mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-violet" />
              Simulateur · chiffrage temps réel
            </p>
            <h1 className="text-[34px] font-semibold tracking-tight text-ink leading-[1.1]">
              Devis rapide
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill tone="amber" pulse>
              Brouillon
            </StatusPill>
            <Button variant="primary" size="md" type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Création…
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Créer le devis
                </>
              )}
            </Button>
          </div>
        </div>
        <p className="text-[13.5px] text-muted mt-2 max-w-2xl">
          Saisis les lignes du chiffrage. Le total et l'acompte 50 % se calculent en temps réel.
          Le numéro DEV-{new Date().getFullYear()}-XXXX est généré automatiquement.
        </p>
      </header>

      {message && (
        <div className="mb-4 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-soft text-red text-[12.5px] border border-red/15">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" strokeWidth={2.4} />
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {/* Client */}
          <Card className="p-5">
            <p className="eyebrow mb-3">01 · Client</p>
            {selectedClient ? (
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-canvas-2/50 border border-line">
                <div className="flex items-center gap-3 min-w-0">
                  <LetterAvatar
                    initial={
                      selectedClient.display_name.includes(",")
                        ? (selectedClient.display_name.split(",")[1].trim()[0] ?? selectedClient.display_name[0])
                        : selectedClient.display_name[0]
                    }
                    tone={toneFor(selectedClient.display_name)}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-ink truncate">{selectedClient.display_name}</p>
                    <p className="text-[11.5px] text-muted">
                      {selectedClient.city ?? "—"} · {channelLabels[selectedClient.channel as Channel]}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  className="text-[11.5px] text-muted hover:text-ink-2"
                >
                  Changer
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
                  <Input
                    placeholder="Chercher un client par nom ou ville…"
                    value={clientQuery}
                    onChange={(e) => setClientQuery(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>
                <div className="mt-2 max-h-[260px] overflow-y-auto divide-y divide-line border border-line rounded-md bg-white">
                  {filteredClients.length === 0 ? (
                    <div className="px-3 py-6 text-center text-[12.5px] text-muted-2">
                      Aucun client trouvé.{" "}
                      <Link href="/clients/new" className="text-violet hover:underline">
                        Créer une fiche →
                      </Link>
                    </div>
                  ) : (
                    filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClient(c);
                          // Ne PAS écraser le canal du devis avec celui de la
                          // source d'origine du client (bug review 23/07/2026 :
                          // un devis fait en magasin pour un client LM
                          // s'affichait « Leroy Merlin »). Le canal du devis
                          // reste piloté par l'utilisateur via le Select ci-dessous.
                        }}
                        className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-canvas-2/40 text-left transition-colors"
                      >
                        <LetterAvatar
                          initial={
                            c.display_name.includes(",")
                              ? (c.display_name.split(",")[1].trim()[0] ?? c.display_name[0])
                              : c.display_name[0]
                          }
                          tone={toneFor(c.display_name)}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-ink truncate">{c.display_name}</p>
                          <p className="text-[11px] text-muted truncate">{c.city ?? "—"}</p>
                        </div>
                        <StatusPill tone={channelTones[c.channel as Channel]} dot={false}>
                          {channelLabels[c.channel as Channel]}
                        </StatusPill>
                      </button>
                    ))
                  )}
                </div>
                {errors?.client_id && <Hint className="text-red mt-1">{errors.client_id}</Hint>}
                <Hint className="mt-2">
                  Le client n'est pas dans la liste ?{" "}
                  <Link href="/clients/new" className="text-violet hover:underline">
                    Créer une nouvelle fiche
                  </Link>
                </Hint>
              </>
            )}
          </Card>

          {/* Produit */}
          <Card className="p-5 space-y-4">
            <p className="eyebrow mb-1">02 · Produit</p>
            <div>
              <Label htmlFor="product_summary">Résumé *</Label>
              <Input
                id="product_summary"
                value={productSummary}
                onChange={(e) => setProductSummary(e.target.value)}
                placeholder="Rideaux sur mesure"
                required
              />
            </div>
            <div>
              <Label htmlFor="product_detail">Détail</Label>
              <Input
                id="product_detail"
                value={productDetail}
                onChange={(e) => setProductDetail(e.target.value)}
                placeholder="Salon + chambre · Casamance Saumon"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="channel">Canal du devis</Label>
                <Select
                  id="channel"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as Channel)}
                >
                  {Object.entries(channelLabels).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="tva_rate">TVA (%)</Label>
                <Input
                  id="tva_rate"
                  type="number"
                  step="0.1"
                  value={tvaRate}
                  onChange={(e) => setTvaRate(Number(e.target.value))}
                />
              </div>
            </div>
            {decoratrices.length > 0 && (
              <div>
                <Label htmlFor="decoratrice_id">Décoratrice suivante</Label>
                <Select
                  id="decoratrice_id"
                  value={decoratriceId}
                  onChange={(e) => setDecoratriceId(e.target.value)}
                >
                  <option value="">— Aucune —</option>
                  {decoratrices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </Card>

          {/* Lignes */}
          <Card className="overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <p className="eyebrow">03 · Lignes du devis</p>
              <button
                type="button"
                onClick={() => setLines([...lines, EMPTY_LINE()])}
                className="inline-flex items-center gap-1.5 text-[12px] text-violet hover:underline font-medium"
              >
                <Plus className="h-3 w-3" /> Ajouter une ligne
              </button>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-canvas-2/40 border-y border-line">
                  <th className="px-3 py-2 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 text-left">Réf.</th>
                  <th className="px-3 py-2 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 text-left">Désignation *</th>
                  <th className="px-3 py-2 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 text-right w-24">Qté</th>
                  <th className="px-3 py-2 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 text-left w-16">Unité</th>
                  <th className="px-3 py-2 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 text-right w-28">P.U. HT</th>
                  <th className="px-3 py-2 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 text-right w-28">Total HT</th>
                  <th className="w-8 px-1 py-2" aria-hidden></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const totalLineHt = Math.round(l.qty * l.unit_price_ht * 100) / 100;
                  return (
                    <tr key={l.id} className="border-b border-line last:border-0 group">
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={l.ref}
                          onChange={(e) => updateLine(l.id, { ref: e.target.value })}
                          placeholder="—"
                          className="w-20 bg-transparent text-[12px] font-mono text-ink-2 px-1 py-1 rounded focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={l.label}
                          onChange={(e) => updateLine(l.id, { label: e.target.value })}
                          placeholder="Ex: Rideau plis flamand · Salon baie vitrée"
                          className="w-full bg-transparent text-[13px] text-ink px-1 py-1 rounded focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted-2"
                        />
                        <input
                          type="text"
                          value={l.detail}
                          onChange={(e) => updateLine(l.id, { detail: e.target.value })}
                          placeholder="Détail (tissu, dimensions…)"
                          className="w-full bg-transparent text-[11.5px] text-muted px-1 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted-2"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={l.qty}
                          onChange={(e) => updateLine(l.id, { qty: Number(e.target.value) || 0 })}
                          className="w-20 bg-transparent text-[13px] font-mono text-right text-ink-2 px-1 py-1 rounded focus:outline-none focus:ring-1 focus:ring-accent tabular-nums"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={l.unit_label}
                          onChange={(e) => updateLine(l.id, { unit_label: e.target.value })}
                          className="bg-transparent text-[12px] font-mono text-muted px-1 py-1 rounded focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                          <option value="u">u</option>
                          <option value="m">m</option>
                          <option value="m²">m²</option>
                          <option value="h">h</option>
                          <option value="forfait">forfait</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={l.unit_price_ht}
                          onChange={(e) => updateLine(l.id, { unit_price_ht: Number(e.target.value) || 0 })}
                          className="w-24 bg-transparent text-[13px] font-mono text-right text-ink-2 px-1 py-1 rounded focus:outline-none focus:ring-1 focus:ring-accent tabular-nums"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <span className="font-semibold text-ink tabular-nums">
                          {eurFmt.format(totalLineHt)}
                        </span>
                      </td>
                      <td className="px-1 py-1.5">
                        <button
                          type="button"
                          onClick={() => removeLine(l.id)}
                          disabled={lines.length === 1}
                          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red transition-opacity disabled:hidden"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {errors?.lines && (
              <div className="px-5 py-2 text-[12px] text-red">{errors.lines}</div>
            )}
          </Card>

          {/* Notes */}
          <Card className="p-5">
            <p className="eyebrow mb-3">04 · Notes atelier</p>
            <textarea
              value={workshopNotes}
              onChange={(e) => setWorkshopNotes(e.target.value)}
              rows={3}
              placeholder="Instructions pour la couturière, ourlet 8cm, raccord motif centré sur baie…"
              className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-[13.5px] text-ink placeholder:text-muted-2 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
            />
          </Card>
        </div>

        {/* Live preview */}
        <div className="sticky top-20">
          <Card className="overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
              <div>
                <p className="eyebrow mb-1">Synthèse · temps réel</p>
                <h3 className="text-[14.5px] font-semibold text-ink">Devis chiffré</h3>
              </div>
              <ColorChip tone="violet" size="sm">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
              </ColorChip>
            </div>

            <div className="px-5 py-4 space-y-2 text-[12.5px]">
              <Row label="Lignes" value={String(lines.filter((l) => l.label.trim()).length)} />
              <Row label="Sous-total HT" value={eurFmt.format(totals.total_ht)} />
              <Row label={`TVA ${tvaRate}%`} value={eurFmt.format(totals.tva)} muted />
            </div>

            <div className="px-5 py-3 border-t border-line bg-canvas-2/40 flex items-baseline justify-between">
              <span className="text-[13px] font-semibold text-ink">Total TTC</span>
              <span className="text-[24px] font-semibold tabular-nums text-ink leading-none">
                {eurFmt.format(totals.total_ttc)}
              </span>
            </div>

            <div className="m-3 rounded-xl overflow-hidden bg-ink text-white p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-[10.5px] font-semibold tracking-wider uppercase opacity-70 mb-0.5">
                    Règle 50% · Stripe
                  </p>
                </div>
                <div className="text-[28px] font-bold leading-none">50%</div>
              </div>
              <div className="bg-white/10 rounded-lg p-2.5 space-y-1.5 border border-white/10">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="opacity-80">Acompte Stripe</span>
                  <span className="font-semibold tabular-nums">{eurFmt.format(totals.acompte)}</span>
                </div>
                <div className="flex items-center justify-between text-[11.5px] opacity-75">
                  <span>Solde avant pose</span>
                  <span className="tabular-nums">{eurFmt.format(totals.solde)}</span>
                </div>
              </div>
              <p className="text-[10.5px] opacity-60 text-center mt-2.5 leading-snug">
                Stripe sera branché à la prochaine étape du dev
              </p>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted" : "text-ink-2"}>{label}</span>
      <span className={`font-mono tabular-nums ${muted ? "text-muted" : "text-ink"}`}>{value}</span>
    </div>
  );
}
