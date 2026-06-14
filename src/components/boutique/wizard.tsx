"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  Sparkles,
  Search,
  Check,
  ChevronRight,
  ChevronLeft,
  Home,
  ShoppingBag,
  Package,
  Scissors,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import { channelLabels, type Channel } from "@/lib/validation/client";
import {
  createBoutiqueDevisAction,
  type BoutiquePiece,
  type BoutiquePieceArticle,
  type BoutiqueFormState,
} from "@/app/(platform)/boutique/actions";
import { AddArticleModal } from "@/components/boutique/add-article-modal";

const eurFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

type ClientPick = {
  id: string;
  display_name: string;
  city: string | null;
  channel: string;
  email: string | null;
};

const channelTones: Record<Channel, "violet" | "orange" | "blue" | "pink" | "emerald"> = {
  magasin: "violet",
  leroy_merlin: "orange",
  ecommerce: "blue",
  decoratrice: "pink",
  visio: "emerald",
};

const STEPS = [
  { num: 1, label: "Client" },
  { num: 2, label: "Pièces & articles" },
  { num: 3, label: "Récapitulatif" },
];

export function BoutiqueWizard({
  clients,
  initialClientId,
}: {
  clients: ClientPick[];
  initialClientId?: string | null;
}) {
  const initial =
    (initialClientId && clients.find((c) => c.id === initialClientId)) || null;
  const [step, setStep] = useState<1 | 2 | 3>(initial ? 2 : 1);

  // Step 1
  const [selectedClient, setSelectedClient] = useState<ClientPick | null>(initial);
  const [clientQuery, setClientQuery] = useState("");
  const [channel, setChannel] = useState<Channel>("magasin");

  // Step 2
  const [pieces, setPieces] = useState<BoutiquePiece[]>([]);
  const [addingPiece, setAddingPiece] = useState(false);
  const [newPieceName, setNewPieceName] = useState("");
  const [articleModalPieceIdx, setArticleModalPieceIdx] = useState<number | null>(null);

  // Step 3
  const [workshopNotes, setWorkshopNotes] = useState("");
  const [acomptePct, setAcomptePct] = useState<50 | 100>(50);
  const [hideMeasurementsForClient, setHideMeasurementsForClient] = useState(false);
  const tvaRate = 20;

  const [submitState, setSubmitState] = useState<BoutiqueFormState>(undefined);
  const [isPending, startTransition] = useTransition();

  // Filtered clients (step 1 search)
  const filteredClients = useMemo(() => {
    if (!clientQuery) return clients.slice(0, 10);
    const q = clientQuery.toLowerCase();
    return clients
      .filter(
        (c) =>
          c.display_name.toLowerCase().includes(q) ||
          (c.city?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 10);
  }, [clients, clientQuery]);

  // Totals (step 3 live)
  const totals = useMemo(() => {
    let totalHt = 0;
    for (const p of pieces) {
      for (const a of p.articles) {
        totalHt += Math.round(a.qty * a.unitPriceHt * 100) / 100;
      }
    }
    const tva = Math.round(totalHt * (tvaRate / 100) * 100) / 100;
    const totalTtc = Math.round((totalHt + tva) * 100) / 100;
    return {
      totalHt,
      tva,
      totalTtc,
      acompte: Math.round(((totalTtc * acomptePct) / 100) * 100) / 100,
      solde:
        Math.round(((totalTtc * (100 - acomptePct)) / 100) * 100) / 100,
      articlesCount: pieces.reduce((acc, p) => acc + p.articles.length, 0),
    };
  }, [pieces, acomptePct]);

  const canGoNext = (s: 1 | 2 | 3): boolean => {
    if (s === 1) return Boolean(selectedClient);
    if (s === 2) return pieces.some((p) => p.articles.length > 0);
    return true;
  };

  const handleAddPiece = () => {
    const name = newPieceName.trim();
    if (!name) return;
    setPieces([...pieces, { name, articles: [] }]);
    setNewPieceName("");
    setAddingPiece(false);
  };

  const handleRemovePiece = (idx: number) => {
    setPieces(pieces.filter((_, i) => i !== idx));
  };

  const handleAddArticles = (pieceIdx: number, articles: BoutiquePieceArticle[]) => {
    setPieces((p) => {
      const next = [...p];
      next[pieceIdx] = {
        ...next[pieceIdx],
        articles: [...next[pieceIdx].articles, ...articles],
      };
      return next;
    });
    setArticleModalPieceIdx(null);
  };

  const handleRemoveArticle = (pieceIdx: number, articleIdx: number) => {
    setPieces((p) => {
      const next = [...p];
      next[pieceIdx] = {
        ...next[pieceIdx],
        articles: next[pieceIdx].articles.filter((_, i) => i !== articleIdx),
      };
      return next;
    });
  };

  const handleSubmit = () => {
    if (!selectedClient) {
      setSubmitState({ ok: false, message: "Client requis." });
      return;
    }
    if (totals.articlesCount === 0) {
      setSubmitState({ ok: false, message: "Aucun article — ajoute au moins une pièce avec un article." });
      return;
    }

    startTransition(async () => {
      try {
        const result = await createBoutiqueDevisAction({
          clientId: selectedClient.id,
          channel,
          tvaRate,
          workshopNotes,
          pieces,
          acomptePct,
          hideMeasurementsForClient,
        });
        if (result && !result.ok) setSubmitState(result);
        // Sinon, la Server Action redirige
      } catch (err) {
        setSubmitState({
          ok: false,
          message: err instanceof Error ? err.message : "Erreur réseau",
        });
      }
    });
  };

  return (
    <>
      {/* Header + stepper */}
      <header className="mb-6">
        <Link
          href="/boutique"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-ink-2 mb-2"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={2.2} /> Boutique
        </Link>
        <div className="flex items-end justify-between gap-8 flex-wrap mb-6">
          <div>
            <p className="eyebrow mb-2 flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-violet" />
              Boutique · Simulateur complet
            </p>
            <h1 className="text-[34px] font-semibold tracking-tight text-ink leading-[1.1]">
              Devis boutique
            </h1>
          </div>
          <StatusPill tone="amber" pulse>
            Étape {step} / 3
          </StatusPill>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-0">
          {STEPS.map((s, idx) => {
            const isActive = s.num === step;
            const isPast = s.num < step;
            return (
              <div key={s.num} className="flex items-center flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={
                      "h-7 w-7 rounded-full inline-flex items-center justify-center text-[12px] font-semibold shrink-0 " +
                      (isPast
                        ? "bg-emerald text-white"
                        : isActive
                        ? "bg-ink text-white"
                        : "bg-canvas-2 text-muted-2 border border-line")
                    }
                  >
                    {isPast ? <Check className="h-3.5 w-3.5" strokeWidth={2.6} /> : s.num}
                  </span>
                  <span
                    className={
                      "text-[12.5px] font-medium whitespace-nowrap " +
                      (isActive ? "text-ink" : isPast ? "text-emerald" : "text-muted-2")
                    }
                  >
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-3 ${isPast ? "bg-emerald" : "bg-line"}`} />
                )}
              </div>
            );
          })}
        </div>
      </header>

      {/* Error banner */}
      {submitState && !submitState.ok && (
        <div className="mb-4 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-soft text-red text-[12.5px] border border-red/15">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" strokeWidth={2.4} />
          <span>{submitState.message}</span>
        </div>
      )}

      {/* Step 1 — Client */}
      {step === 1 && (
        <Card className="p-6">
          <div className="mb-4">
            <p className="eyebrow mb-1">Étape 1</p>
            <h2 className="text-[18px] font-semibold text-ink">Sélectionne le client</h2>
            <p className="text-[12.5px] text-muted mt-1">
              Cherche dans tes fiches ou crée un nouveau client en parallèle.
            </p>
          </div>

          {selectedClient ? (
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-canvas-2/50 border border-line">
              <div className="flex items-center gap-3 min-w-0">
                <LetterAvatar
                  initial={initialOf(selectedClient.display_name)}
                  tone={toneFor(selectedClient.display_name)}
                  size="lg"
                />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-ink truncate">
                    {selectedClient.display_name}
                  </p>
                  <p className="text-[11.5px] text-muted">
                    {selectedClient.city ?? "—"} ·{" "}
                    {channelLabels[selectedClient.channel as Channel]}
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
                  placeholder="Chercher par nom ou ville…"
                  value={clientQuery}
                  onChange={(e) => setClientQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <div className="mt-2 max-h-[320px] overflow-y-auto divide-y divide-line border border-line rounded-md bg-white">
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
                        setChannel(c.channel as Channel);
                      }}
                      className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-canvas-2/40 text-left transition-colors"
                    >
                      <LetterAvatar
                        initial={initialOf(c.display_name)}
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
              <p className="text-[11.5px] text-muted mt-2">
                Pas dans la liste ?{" "}
                <Link href="/clients/new" className="text-violet hover:underline font-medium">
                  Créer une nouvelle fiche
                </Link>
              </p>
            </>
          )}
        </Card>
      )}

      {/* Step 2 — Pièces & articles */}
      {step === 2 && (
        <div className="space-y-4">
          {pieces.length === 0 && !addingPiece && (
            <Card className="py-12 px-6 text-center">
              <Home className="h-10 w-10 text-muted-2 mx-auto mb-3" strokeWidth={1.5} />
              <h3 className="text-[15px] font-semibold text-ink mb-1">Aucune pièce</h3>
              <p className="text-[12.5px] text-muted mb-5 max-w-md mx-auto">
                Commence par ajouter une pièce (ex : "Salon", "Chambre parentale"). Tu pourras
                ensuite y ajouter des articles.
              </p>
              <Button variant="primary" size="md" onClick={() => setAddingPiece(true)}>
                <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
                Ajouter une pièce
              </Button>
            </Card>
          )}

          {pieces.map((piece, idx) => (
            <Card key={idx} className="overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between border-b border-line bg-canvas-2/30">
                <div className="flex items-center gap-2.5">
                  <ColorChip tone="violet" size="md">
                    <Home className="h-4 w-4" strokeWidth={2.2} />
                  </ColorChip>
                  <div>
                    <p className="text-[14.5px] font-semibold text-ink">{piece.name}</p>
                    <p className="text-[11.5px] text-muted">
                      {piece.articles.length} article{piece.articles.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePiece(idx)}
                  className="text-muted-2 hover:text-red transition-colors"
                  aria-label="Supprimer la pièce"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {piece.articles.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <p className="text-[12.5px] text-muted mb-3">Aucun article pour cette pièce.</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setArticleModalPieceIdx(idx)}
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
                    Ajouter un article
                  </Button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-line">
                    {piece.articles.map((a, aIdx) => (
                      <div key={aIdx} className="px-5 py-3 flex items-start gap-3">
                        <ColorChip tone={articleTone(a.type)} size="md">
                          {articleIcon(a.type)}
                        </ColorChip>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-ink leading-tight">
                            {a.designation}
                          </p>
                          {a.ref && (
                            <p className="text-[11px] text-muted-2 font-mono mt-0.5">{a.ref}</p>
                          )}
                          {a.detail && (
                            <p className="text-[11.5px] text-muted mt-0.5">{a.detail}</p>
                          )}
                        </div>
                        <div className="text-right text-[12.5px] shrink-0">
                          <p className="font-mono text-muted-2">
                            {a.qty} {a.unitLabel} × {eurFmt.format(a.unitPriceHt)}
                          </p>
                          <p className="font-semibold text-ink tabular-nums mt-0.5">
                            {eurFmt.format(a.qty * a.unitPriceHt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveArticle(idx, aIdx)}
                          className="text-muted-2 hover:text-red transition-colors mt-0.5"
                          aria-label="Supprimer l'article"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setArticleModalPieceIdx(idx)}
                    className="w-full px-5 py-2.5 text-[12.5px] text-violet hover:bg-canvas-2/40 inline-flex items-center justify-center gap-1.5 font-medium border-t border-line transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Ajouter un article
                  </button>
                </>
              )}
            </Card>
          ))}

          {addingPiece && (
            <Card className="p-5">
              <Label htmlFor="newPieceName">Nom de la pièce</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="newPieceName"
                  value={newPieceName}
                  onChange={(e) => setNewPieceName(e.target.value)}
                  placeholder="Salon, Chambre parentale, Bureau…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddPiece();
                    }
                  }}
                  autoFocus
                />
                <Button variant="primary" size="md" type="button" onClick={handleAddPiece}>
                  Créer
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  type="button"
                  onClick={() => {
                    setAddingPiece(false);
                    setNewPieceName("");
                  }}
                >
                  Annuler
                </Button>
              </div>
            </Card>
          )}

          {pieces.length > 0 && !addingPiece && (
            <button
              type="button"
              onClick={() => setAddingPiece(true)}
              className="w-full text-[12.5px] text-muted hover:text-ink py-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line hover:border-line-strong transition-colors bg-white"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter une autre pièce
            </button>
          )}

          {/* Article modal */}
          {articleModalPieceIdx !== null && (
            <AddArticleModal
              onClose={() => setArticleModalPieceIdx(null)}
              onAdd={(articles) => handleAddArticles(articleModalPieceIdx, articles)}
            />
          )}
        </div>
      )}

      {/* Step 3 — Récap */}
      {step === 3 && selectedClient && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="space-y-4">
            <Card className="p-5">
              <p className="eyebrow mb-3">Client</p>
              <div className="flex items-center gap-3">
                <LetterAvatar
                  initial={initialOf(selectedClient.display_name)}
                  tone={toneFor(selectedClient.display_name)}
                  size="lg"
                />
                <div>
                  <p className="text-[14px] font-semibold text-ink">{selectedClient.display_name}</p>
                  <p className="text-[11.5px] text-muted">
                    {selectedClient.city ?? "—"} ·{" "}
                    {channelLabels[selectedClient.channel as Channel]}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-line">
                <p className="eyebrow mb-1">Détail des pièces</p>
                <h3 className="text-[15px] font-semibold text-ink">
                  {pieces.length} pièce{pieces.length > 1 ? "s" : ""} ·{" "}
                  {totals.articlesCount} article{totals.articlesCount > 1 ? "s" : ""}
                </h3>
              </div>
              <div className="divide-y divide-line">
                {pieces.map((piece, idx) => {
                  const pieceTotal = piece.articles.reduce(
                    (acc, a) => acc + a.qty * a.unitPriceHt,
                    0
                  );
                  return (
                    <div key={idx} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[14px] font-semibold text-ink">{piece.name}</p>
                        <span className="font-mono text-[13px] tabular-nums text-ink-2">
                          {eurFmt.format(pieceTotal)}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {piece.articles.map((a, aIdx) => (
                          <div
                            key={aIdx}
                            className="flex items-start justify-between gap-3 text-[12.5px]"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-ink-2 truncate">{a.designation}</p>
                              {a.detail && (
                                <p className="text-[11px] text-muted-2 truncate">{a.detail}</p>
                              )}
                            </div>
                            <span className="text-muted tabular-nums shrink-0">
                              {a.qty} {a.unitLabel} × {eurFmt.format(a.unitPriceHt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-5">
              <Label htmlFor="workshopNotes">Notes atelier (optionnel)</Label>
              <textarea
                id="workshopNotes"
                value={workshopNotes}
                onChange={(e) => setWorkshopNotes(e.target.value)}
                rows={3}
                placeholder="Instructions, raccord, contraintes spécifiques…"
                className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-[13.5px] text-ink placeholder:text-muted-2 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
              />
            </Card>
          </div>

          {/* Right — totals & action */}
          <div className="sticky top-20 space-y-4">
            <Card className="overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
                <div>
                  <p className="eyebrow mb-1">Total</p>
                  <h3 className="text-[14.5px] font-semibold text-ink">Synthèse</h3>
                </div>
                <ColorChip tone="violet" size="sm">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
                </ColorChip>
              </div>
              <div className="px-5 py-4 space-y-2 text-[12.5px]">
                <Row label="Articles" value={String(totals.articlesCount)} />
                <Row label="Sous-total HT" value={eurFmt.format(totals.totalHt)} />
                <Row label={`TVA ${tvaRate}%`} value={eurFmt.format(totals.tva)} muted />
              </div>
              <div className="px-5 py-3 border-t border-line bg-canvas-2/40 flex items-baseline justify-between">
                <span className="text-[13px] font-semibold text-ink">Total TTC</span>
                <span className="text-[24px] font-semibold tabular-nums text-ink leading-none">
                  {eurFmt.format(totals.totalTtc)}
                </span>
              </div>
              <div className="m-3 rounded-xl overflow-hidden bg-ink text-white p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-[10.5px] font-semibold tracking-wider uppercase opacity-70">
                    Règle {acomptePct}% · Stripe
                  </p>
                  <div className="text-[24px] font-bold leading-none">{acomptePct}%</div>
                </div>
                <div className="bg-white/10 rounded-lg p-2.5 space-y-1.5 border border-white/10">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="opacity-80">Acompte</span>
                    <span className="font-semibold tabular-nums">
                      {eurFmt.format(totals.acompte)}
                    </span>
                  </div>
                  {acomptePct < 100 && (
                    <div className="flex items-center justify-between text-[11.5px] opacity-75">
                      <span>Solde avant pose</span>
                      <span className="tabular-nums">{eurFmt.format(totals.solde)}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex gap-1 bg-white/5 rounded-md p-0.5">
                  <button
                    type="button"
                    onClick={() => setAcomptePct(50)}
                    className={`flex-1 text-[11px] py-1 rounded-[5px] font-semibold transition-colors ${
                      acomptePct === 50 ? "bg-white text-ink" : "text-white/70 hover:text-white"
                    }`}
                  >
                    50% acompte
                  </button>
                  <button
                    type="button"
                    onClick={() => setAcomptePct(100)}
                    className={`flex-1 text-[11px] py-1 rounded-[5px] font-semibold transition-colors ${
                      acomptePct === 100 ? "bg-white text-ink" : "text-white/70 hover:text-white"
                    }`}
                  >
                    100% à la commande
                  </button>
                </div>
                {acomptePct === 100 && (
                  <p className="mt-2 text-[10.5px] opacity-70 leading-tight">
                    Petits montants (peinture, papier peint…) — paiement intégral, pas de solde.
                  </p>
                )}
              </div>

              {/* Option masquer mesures sur PDF client */}
              <div className="m-3 mt-0 rounded-xl border border-line p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideMeasurementsForClient}
                    onChange={(e) => setHideMeasurementsForClient(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-line-strong accent-violet"
                  />
                  <div className="flex-1">
                    <p className="text-[12.5px] font-semibold text-ink leading-tight">
                      Masquer les mesures sur le PDF client
                    </p>
                    <p className="text-[11px] text-muted-2 mt-0.5 leading-snug">
                      Les dimensions / laize ne sont pas affichées au client (visibles
                      côté Atmosphère).
                    </p>
                  </div>
                </label>
              </div>
            </Card>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" strokeWidth={2.4} />
                  Créer le devis
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Footer nav (Précédent / Suivant) */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="secondary"
          size="md"
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
          disabled={step === 1}
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Précédent
        </Button>
        {step < 3 ? (
          <Button
            variant="primary"
            size="md"
            onClick={() => setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s))}
            disabled={!canGoNext(step)}
          >
            Suivant <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <span />
        )}
      </div>
    </>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted" : "text-ink-2"}>{label}</span>
      <span className={`font-mono tabular-nums ${muted ? "text-muted" : "text-ink"}`}>
        {value}
      </span>
    </div>
  );
}

function initialOf(name: string) {
  if (name.includes(",")) return name.split(",")[1].trim()[0] ?? name[0];
  return name[0];
}

function articleTone(type: BoutiquePieceArticle["type"]) {
  if (type === "rideau") return "violet";
  if (type === "store") return "blue";
  if (type === "rideau_serie") return "pink";
  return "orange";
}

function articleIcon(type: BoutiquePieceArticle["type"]) {
  const props = { className: "h-4 w-4", strokeWidth: 2.2 };
  if (type === "rideau") return <Scissors {...props} />;
  if (type === "store") return <Layers {...props} />;
  if (type === "rideau_serie") return <ShoppingBag {...props} />;
  return <Package {...props} />;
}
