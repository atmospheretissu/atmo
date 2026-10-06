"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Factory,
  Loader2,
  Plus,
  Search,
  Send,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import {
  STATUTS,
  collectionAteliers,
  collectionStats,
  formatDate,
  joursDeRetard,
  statutEffectif,
  type CollectionOrder,
  type CollectionStatut,
} from "@/lib/collection/order-model";
import {
  createCollectionOrderAction,
  deleteCollectionOrderAction,
  updateCollectionOrderAction,
  type EditableField,
} from "./actions";

const PAGE_SIZE = 15;

const STATUT_TONE: Record<CollectionStatut, StatusTone> = {
  "En cours": "violet",
  Terminée: "emerald",
  Archivée: "muted",
  SAV: "danger",
  Annulé: "neutral",
};

type Filter = CollectionStatut | "Tous" | "En retard";

export function CollectionOrdersTab({
  orders,
  usineOnly = false,
}: {
  orders: CollectionOrder[];
  /** Rôle usine : lecture seule, sauf ses deux dates. */
  usineOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("Tous");
  const [atelier, setAtelier] = useState<string>("Tous");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const ateliers = useMemo(() => collectionAteliers(orders), [orders]);
  const kpis = useMemo(() => collectionStats(orders), [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter === "En retard") {
        if (!joursDeRetard(o)) return false;
      } else if (filter !== "Tous" && statutEffectif(o) !== filter) return false;
      if (atelier !== "Tous" && o.atelier !== atelier) return false;
      if (!q) return true;
      return [o.ref, o.clientName, o.description, o.fournisseur, o.commentaire]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [orders, query, filter, atelier]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <div className="px-8 pb-12 space-y-5">
      {/* Indicateurs */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="En cours" value={kpis.enCours} tone="violet" sub="commandes en confection" />
        <Kpi label="En retard" value={kpis.enRetard} tone="danger" sub="à suivre en priorité" />
        <Kpi label="Terminées" value={kpis.terminees} tone="emerald" sub="confection finie" />
        <Kpi label="Archivées" value={kpis.archivees} tone="muted" sub="réception confirmée" />
        <Kpi
          label="SAV"
          value={kpis.sav}
          tone={kpis.sav > 0 ? "danger" : "muted"}
          sub="problèmes signalés"
        />
        <Kpi
          label="Annulées"
          value={kpis.annulees}
          tone="neutral"
          sub={`sur ${kpis.total} au total`}
        />
      </section>

      {/* Filtres */}
      <section className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(["Tous", ...STATUTS, "En retard"] as Filter[]).map((f) => (
            <Chip
              key={f}
              active={filter === f}
              danger={f === "En retard" || f === "SAV"}
              onClick={() => reset(() => setFilter(f))}
            >
              {f}
            </Chip>
          ))}
        </div>
        {ateliers.length > 0 && (
          <>
            <span className="mx-1 h-5 w-px bg-line" />
            <div className="flex flex-wrap gap-1.5">
              <Chip active={atelier === "Tous"} onClick={() => reset(() => setAtelier("Tous"))}>
                Atelier · tous
              </Chip>
              {ateliers.map((a) => (
                <Chip key={a} active={atelier === a} onClick={() => reset(() => setAtelier(a))}>
                  {a}
                </Chip>
              ))}
            </div>
          </>
        )}
        <div className="ml-auto flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2" />
            <Input
              value={query}
              onChange={(e) => reset(() => setQuery(e.target.value))}
              placeholder="Client, réf., tissu…"
              aria-label="Rechercher une commande"
              className="pl-8 w-52"
            />
          </div>
          {!usineOnly && (
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Nouvelle commande
            </Button>
          )}
        </div>
      </section>

      {/* Tableau */}
      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-[120px_120px_130px_80px_95px_minmax(0,1fr)_125px_90px_62px_18px] gap-x-3 items-center px-4 h-11 border-b border-line bg-canvas-2/60 text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-2">
          <span>Statut</span>
          <span>Réf. conf.</span>
          <span>Client</span>
          <span>Cmd.</span>
          <span>Atelier</span>
          <span>Description</span>
          <span>Fournisseur tissu</span>
          <span>Livraison prév.</span>
          <span className="text-right text-red">Retard</span>
          <span />
        </div>

        {rows.map((o) => (
          <OrderRow
            key={o.id}
            order={o}
            usineOnly={usineOnly}
            open={openId === o.id}
            onToggle={() => setOpenId(openId === o.id ? null : o.id)}
          />
        ))}

        {rows.length === 0 && (
          <p className="px-4 py-12 text-center text-[13px] text-muted">
            {orders.length === 0
              ? "Aucune commande pour l'instant. Les articles Collection arrivent ici dès qu'un client accepte son devis."
              : "Aucune commande ne correspond aux filtres."}
          </p>
        )}

        {pageCount > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-canvas-2/40 border-t border-line">
            <span className="text-[11.5px] text-muted-2 tabular-nums">
              {(current - 1) * PAGE_SIZE + 1}–
              {Math.min(current * PAGE_SIZE, filtered.length)} sur {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <PageBtn disabled={current === 1} onClick={() => setPage(current - 1)}>
                Précédent
              </PageBtn>
              {Array.from({ length: pageCount }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === pageCount || Math.abs(n - current) <= 1)
                .map((n, i, arr) => (
                  <span key={n} className="flex items-center gap-1">
                    {i > 0 && (arr[i - 1] ?? 0) < n - 1 && (
                      <span className="px-0.5 text-[11px] text-muted-2">…</span>
                    )}
                    <PageBtn active={n === current} onClick={() => setPage(n)}>
                      {n}
                    </PageBtn>
                  </span>
                ))}
              <PageBtn disabled={current === pageCount} onClick={() => setPage(current + 1)}>
                Suivant
              </PageBtn>
            </div>
          </div>
        )}
      </Card>

      {showForm && <NouvelleCommande ateliers={ateliers} onClose={() => setShowForm(false)} />}
    </div>
  );
}

/* ══════════════════════════ Ligne du tableau ══════════════════════════ */

function OrderRow({
  order,
  usineOnly,
  open,
  onToggle,
}: {
  order: CollectionOrder;
  usineOnly: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  // useState et non useTransition : React 19 propage l'état « transition en
  // cours » à tous les useTransition de la page pendant le refetch RSC, ce
  // qui allumait un spinner sur chaque ligne à la fois.
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [o, setO] = useState(order);

  const statut = statutEffectif(o);
  const retard = joursDeRetard(o);

  const patch = async (field: EditableField, value: string | null) => {
    const before = { ...o };
    // Reflet optimiste : le tableau reste fluide, et on revient en arrière
    // si le serveur refuse.
    setO((prev) => ({ ...prev, ...localPatch(field, value) }));
    setError(null);
    setPending(true);
    try {
      const r = await updateCollectionOrderAction(o.id, field, value);
      if (!r.ok) {
        setO(before);
        setError(r.message);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="border-b border-line/70 last:border-b-0">
      <div
        className={cn(
          "grid grid-cols-[120px_120px_130px_80px_95px_minmax(0,1fr)_125px_90px_62px_18px] gap-x-3 items-center px-4 py-2.5 transition-colors",
          retard ? "bg-red-soft/40 hover:bg-red-soft/60" : "hover:bg-canvas-2/50",
          (statut === "Archivée" || statut === "Annulé") && "opacity-70 hover:opacity-100",
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              "h-2 w-2 rounded-full shrink-0",
              statut === "En cours" && "bg-violet",
              statut === "Terminée" && "bg-emerald",
              statut === "Archivée" && "bg-emerald/50",
              statut === "SAV" && "bg-red",
              statut === "Annulé" && "bg-muted-2",
            )}
          />
          {usineOnly ? (
            <span className="truncate text-[12px] font-medium text-ink-2">{statut}</span>
          ) : (
          <select
            value={statut}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.value as CollectionStatut;
              if (next === "Archivée" && !o.dateReception) {
                void patch("date_reception", new Date().toISOString().slice(0, 10));
                return;
              }
              void patch("statut", next);
            }}
            aria-label={`Statut de la commande ${o.ref ?? o.clientName}`}
            className="h-7 w-full min-w-0 rounded-md border border-line bg-surface px-1 text-[11.5px] font-medium text-ink cursor-pointer outline-none hover:border-line-strong focus:border-violet disabled:opacity-50"
          >
            {STATUTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          )}
        </div>

        <span className="truncate text-[11.5px] font-mono text-muted-2" title={o.ref ?? ""}>
          {o.ref || "—"}
        </span>
        <span className="truncate text-[13px] font-medium text-ink" title={o.clientName}>
          {o.clientName}
        </span>
        <span className="text-[11.5px] text-muted-2 tabular-nums">
          {formatDate(o.dateCommande)}
        </span>
        <span className="truncate text-[12px] text-muted">{o.atelier ?? "—"}</span>

        <button onClick={onToggle} className="min-w-0 text-left">
          <p className="truncate text-[13px] text-ink-2">
            {o.description?.split("\n")[0] || "—"}
          </p>
          {o.commentaire && (
            <p className="truncate text-[11px] text-muted-2">{o.commentaire}</p>
          )}
        </button>

        <span className="truncate text-[11.5px] text-muted" title={o.fournisseur ?? ""}>
          {o.fournisseur ?? "—"}
        </span>
        <span className="text-[11.5px] text-muted-2 tabular-nums">
          {formatDate(o.dateButoir)}
        </span>
        <span
          className={cn(
            "text-right text-[11.5px] tabular-nums",
            retard ? "font-semibold text-red" : "text-muted-2",
          )}
        >
          {retard ? `+${retard} j` : "—"}
        </span>

        <button
          onClick={onToggle}
          aria-label={open ? "Replier le détail" : "Déplier le détail"}
          className="text-muted-2 hover:text-ink"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {error && <p className="px-4 pb-2 text-[11.5px] text-red">{error}</p>}

      {open && (
        <div className="px-4 py-4 bg-canvas-2/40 border-t border-line/60 space-y-4">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="eyebrow mb-1.5">Description complète</p>
              <p className="text-[13px] text-ink-2 whitespace-pre-line">
                {o.description ?? "—"}
              </p>
              {o.commentaire && (
                <>
                  <p className="eyebrow mt-4 mb-1.5">Commentaire</p>
                  <p className="text-[13px] text-ink-2">{o.commentaire}</p>
                </>
              )}
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <SourceBadge source={o.source} />
                {o.devisId && (
                  <Link
                    href={`/devis/${o.devisId}`}
                    className="text-[12px] font-medium text-violet-strong hover:underline"
                  >
                    Voir le devis →
                  </Link>
                )}
                {o.dossierId && (
                  <Link
                    href={`/confections/${o.dossierId}`}
                    className="text-[12px] font-medium text-violet-strong hover:underline"
                  >
                    Voir le dossier →
                  </Link>
                )}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Detail label="Envoi atelier" value={formatDate(o.dateEnvoi)} />
              <Detail label="Prévu" value={formatDate(o.datePrevue)} />
              <Detail
                label="Butoir"
                value={formatDate(o.dateButoir)}
                valueClass={retard ? "text-red font-semibold" : undefined}
              />
              <Detail
                label="Retard"
                value={retard ? `${retard} jours` : "—"}
                valueClass={retard ? "text-red font-semibold" : undefined}
              />
              <div className="col-span-2">
                <dt className="eyebrow mb-1">Réception (Atmosphère)</dt>
                <dd>
                  <input
                    type="date"
                    value={o.dateReception ?? ""}
                    readOnly={usineOnly}
                    disabled={pending || usineOnly}
                    onChange={(e) => void patch("date_reception", e.target.value || null)}
                    aria-label="Date de réception — archive la commande"
                    className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-[12.5px] text-ink tabular-nums outline-none focus:border-emerald disabled:opacity-50"
                  />
                  {o.dateReception && (
                    <p className="mt-1 text-[11px] text-emerald">→ commande archivée</p>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Zone usine */}
          <div className="rounded-xl border border-violet/25 bg-violet-soft/50 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-violet/20 bg-violet-soft/60">
              <Factory className="h-3.5 w-3.5 text-violet-strong" strokeWidth={2.3} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-strong">
                À renseigner par l&apos;usine
              </p>
              {!o.dateReceptionTissu && !o.dateExpeditionUsine && (
                <StatusPill tone="violet" className="ml-auto" dot={false}>
                  Action requise
                </StatusPill>
              )}
            </div>
            <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
              <DateUsine
                icon={<Truck className="h-3.5 w-3.5" strokeWidth={2.3} />}
                label="Réception tissu (tissu d'éditeur)"
                hint="Quand le tissu arrive à l'usine"
                value={o.dateReceptionTissu}
                disabled={pending}
                onChange={(v) => void patch("date_reception_tissu", v)}
              />
              <DateUsine
                icon={<Send className="h-3.5 w-3.5" strokeWidth={2.3} />}
                label="Expédition des confections"
                hint="Quand l'usine expédie la production"
                value={o.dateExpeditionUsine}
                disabled={pending}
                onChange={(v) => void patch("date_expedition_usine", v)}
              />
            </div>
          </div>

          {/* Zone SAV */}
          <SavZone
            order={o}
            statut={statut}
            pending={pending}
            readOnly={usineOnly}
            patch={patch}
          />

          {!usineOnly && o.source !== "devis" && (
            <DeleteRow id={o.id} label={o.clientName} />
          )}
        </div>
      )}
    </div>
  );
}

/** Applique localement la modification pour le reflet optimiste. */
function localPatch(field: EditableField, value: string | null): Partial<CollectionOrder> {
  switch (field) {
    case "statut":
      return { statut: (value ?? "En cours") as CollectionStatut };
    case "date_reception":
      return value
        ? { dateReception: value, statut: "Archivée" }
        : { dateReception: null };
    case "date_reception_tissu":
      return { dateReceptionTissu: value };
    case "date_expedition_usine":
      return { dateExpeditionUsine: value };
    case "commentaire_sav":
      return { commentaireSav: value };
    case "atelier":
      return { atelier: value };
    default:
      return {};
  }
}

function SavZone({
  order,
  statut,
  pending,
  readOnly,
  patch,
}: {
  order: CollectionOrder;
  statut: CollectionStatut;
  pending: boolean;
  /** L'usine doit LIRE le problème signalé, pas le déclarer ni le clore. */
  readOnly: boolean;
  patch: (f: EditableField, v: string | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState(order.commentaireSav ?? "");
  const [saved, setSaved] = useState(false);
  const isSav = statut === "SAV";

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        isSav ? "border-red/30 bg-red-soft/50" : "border-line bg-surface",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 border-b",
          isSav ? "border-red/20 bg-red-soft/60" : "border-line bg-canvas-2/50",
        )}
      >
        <AlertTriangle
          className={cn("h-3.5 w-3.5", isSav ? "text-red" : "text-muted-2")}
          strokeWidth={2.3}
        />
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.14em]",
            isSav ? "text-red" : "text-muted-2",
          )}
        >
          SAV — problème sur la commande
        </p>
        {!readOnly && (
          <button
            disabled={pending}
            onClick={() => void patch("statut", isSav ? "En cours" : "SAV")}
            className={cn(
              "ml-auto h-7 px-3 rounded-full text-[11.5px] font-semibold transition-colors disabled:opacity-50",
              isSav
                ? "bg-red text-white hover:bg-red/90"
                : "border border-line bg-surface text-ink hover:bg-canvas-2",
            )}
          >
            {isSav ? "Clôturer le SAV" : "Passer en SAV"}
          </button>
        )}
      </div>
      {isSav && (
        <div className="px-4 py-4">
          <label htmlFor={`sav-${order.id}`} className="eyebrow text-red mb-1.5 block">
            Commentaire Atmosphère — lu par l&apos;usine
          </label>
          <textarea
            id={`sav-${order.id}`}
            value={draft}
            rows={3}
            readOnly={readOnly}
            disabled={pending || readOnly}
            onChange={(e) => {
              setDraft(e.target.value);
              setSaved(false);
            }}
            onBlur={async () => {
              if (draft === (order.commentaireSav ?? "")) return;
              await patch("commentaire_sav", draft);
              setSaved(true);
            }}
            placeholder="Décrire le problème constaté…"
            className="w-full rounded-lg border border-red/25 bg-surface px-3 py-2 text-[13px] text-ink outline-none placeholder:text-muted-2 focus:border-red/50 disabled:opacity-50"
          />
          <p className="mt-1.5 text-[11px]">
            {saved ? (
              <span className="text-emerald">Commentaire enregistré.</span>
            ) : draft.trim() ? (
              <span className="text-muted-2">Enregistré en quittant le champ.</span>
            ) : (
              <span className="text-red">Un commentaire est attendu pour l&apos;usine.</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

function DeleteRow({ id, label }: { id: string; label: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 text-[12px] text-muted-2 hover:text-red transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" /> Supprimer cette commande
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[12.5px] text-ink-2">
        Supprimer la commande de <strong>{label}</strong> ? C&apos;est définitif.
      </span>
      <button
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const r = await deleteCollectionOrderAction(id);
          if (!r.ok) {
            setError(r.message);
            setPending(false);
            setConfirming(false);
          }
        }}
        className="h-7 px-3 rounded-full bg-red text-white text-[11.5px] font-semibold hover:bg-red/90 disabled:opacity-50"
      >
        {pending ? "Suppression…" : "Oui, supprimer"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="h-7 px-3 rounded-full border border-line bg-surface text-[11.5px] font-semibold text-ink hover:bg-canvas-2"
      >
        Annuler
      </button>
      {error && <span className="text-[11.5px] text-red">{error}</span>}
    </div>
  );
}

/* ══════════════════════════ Nouvelle commande ══════════════════════════ */

function NouvelleCommande({
  ateliers,
  onClose,
}: {
  ateliers: string[];
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    client_name: "",
    ref: "",
    atelier: "",
    fournisseur: "",
    date_commande: "",
    date_butoir: "",
    description: "",
    commentaire: "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Les usines connues, plus celles déjà présentes dans le suivi.
  const choixAteliers = useMemo(() => {
    const set = new Set<string>(["Pologne", "Ukraine", ...ateliers]);
    return Array.from(set).sort();
  }, [ateliers]);

  const valid = form.client_name.trim().length > 0;

  const field =
    "h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13px] text-ink outline-none focus:border-violet disabled:opacity-50";
  const label = "eyebrow mb-1 block";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4"
      onClick={() => !pending && onClose()}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid || pending) return;
          setError(null);
          setPending(true);
          const r = await createCollectionOrderAction(form);
          if (r.ok) onClose();
          else {
            setError(r.message);
            setPending(false);
          }
        }}
        className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-xl border border-line"
      >
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-[20px] font-semibold tracking-tight text-ink">
            Nouvelle commande
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-md inline-flex items-center justify-center text-muted-2 hover:text-ink hover:bg-canvas-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="f-client">Client *</label>
            <input
              id="f-client"
              className={field}
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div>
            <label className={label} htmlFor="f-ref">Réf. conf.</label>
            <input
              id="f-ref"
              className={field}
              placeholder="conf 9450 137"
              value={form.ref}
              onChange={(e) => setForm({ ...form, ref: e.target.value })}
            />
          </div>
          <div>
            <label className={label} htmlFor="f-atelier">Atelier</label>
            <select
              id="f-atelier"
              className={field}
              value={form.atelier}
              onChange={(e) => setForm({ ...form, atelier: e.target.value })}
            >
              <option value="">—</option>
              {choixAteliers.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="f-fourn">Fournisseur tissu</label>
            <input
              id="f-fourn"
              className={field}
              value={form.fournisseur}
              onChange={(e) => setForm({ ...form, fournisseur: e.target.value })}
            />
          </div>
          <div>
            <label className={label} htmlFor="f-date">Date commande</label>
            <input
              id="f-date"
              type="date"
              className={field}
              value={form.date_commande}
              onChange={(e) => setForm({ ...form, date_commande: e.target.value })}
            />
          </div>
          <div>
            <label className={label} htmlFor="f-butoir">Date butoir</label>
            <input
              id="f-butoir"
              type="date"
              className={field}
              value={form.date_butoir}
              onChange={(e) => setForm({ ...form, date_butoir: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className={label} htmlFor="f-desc">Description</label>
            <input
              id="f-desc"
              className={field}
              placeholder="2 paires de rideaux"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className={label} htmlFor="f-com">Commentaire</label>
            <input
              id="f-com"
              className={field}
              value={form.commentaire}
              onChange={(e) => setForm({ ...form, commentaire: e.target.value })}
            />
          </div>
        </div>

        {error && <p className="mt-3 text-[12.5px] text-red">{error}</p>}

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={!valid || pending}>
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            )}
            Créer
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ══════════════════════════ Petits composants ══════════════════════════ */

function SourceBadge({ source }: { source: CollectionOrder["source"] }) {
  if (source === "devis")
    return <StatusPill tone="emerald" dot={false}>Issue d&apos;un devis accepté</StatusPill>;
  if (source === "import")
    return <StatusPill tone="muted" dot={false}>Reprise du suivi existant</StatusPill>;
  return <StatusPill tone="blue" dot={false}>Saisie manuelle</StatusPill>;
}

function Kpi({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: number;
  tone: StatusTone;
  sub: string;
}) {
  return (
    <Card className="p-4">
      <StatusPill tone={tone}>{label}</StatusPill>
      <p className="mt-2.5 text-[30px] font-semibold tracking-tight text-ink leading-none tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-[11.5px] text-muted-2">{sub}</p>
    </Card>
  );
}

function Chip({
  active,
  danger,
  onClick,
  children,
}: {
  active: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 px-3 rounded-full text-[12px] font-medium border transition-colors",
        active
          ? danger
            ? "bg-red text-white border-red"
            : "bg-ink text-white border-ink"
          : danger
            ? "bg-surface text-red border-red/25 hover:bg-red-soft/50"
            : "bg-surface text-ink-2 border-line hover:bg-canvas-2",
      )}
    >
      {children}
    </button>
  );
}

function PageBtn({
  active,
  disabled,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-7 min-w-7 px-2 rounded-md text-[11.5px] font-medium border border-line transition-colors",
        active
          ? "bg-ink text-white border-ink"
          : "bg-surface text-ink-2 hover:bg-canvas-2 disabled:opacity-40 disabled:hover:bg-surface",
      )}
    >
      {children}
    </button>
  );
}

function Detail({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className={cn("mt-0.5 text-[12.5px] text-ink-2 tabular-nums", valueClass)}>
        {value}
      </dd>
    </div>
  );
}

function DateUsine({
  icon,
  label,
  hint,
  value,
  disabled,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  value: string | null;
  disabled: boolean;
  onChange: (v: string | null) => void;
}) {
  const filled = Boolean(value);
  return (
    <label className="block rounded-lg border border-violet/20 bg-surface p-3">
      <span className="flex items-center gap-1.5 text-violet-strong">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">{label}</span>
        <span
          className={cn(
            "ml-auto text-[10px] font-semibold uppercase tracking-[0.12em] shrink-0",
            filled ? "text-emerald" : "text-violet-strong/70",
          )}
        >
          {filled ? "Renseigné" : "À remplir"}
        </span>
      </span>
      <span className="mt-1 block text-[11px] text-muted-2">{hint}</span>
      <input
        type="date"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
        className="mt-2 h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-[12.5px] text-ink tabular-nums outline-none focus:border-violet disabled:opacity-50"
      />
    </label>
  );
}
