"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Factory,
  Loader2,
  Search,
  Send,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import {
  joursDeRetard,
  type CollectionOrder,
  type CollectionStatut,
} from "@/lib/collection/order-model";
import {
  setCollectionStatutAction,
  setCollectionReceptionAction,
  setCollectionUsineDateAction,
  setCollectionSavCommentAction,
  toggleCollectionSavAction,
} from "./actions";

const PAGE_SIZE = 15;

const STATUTS: CollectionStatut[] = [
  "En attente",
  "En confection",
  "Terminée",
  "Archivée",
  "SAV",
];

const STATUT_TONE: Record<CollectionStatut, StatusTone> = {
  "En attente": "amber",
  "En confection": "violet",
  Terminée: "emerald",
  Archivée: "muted",
  SAV: "danger",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1].slice(2)}`;
}

type Filter = CollectionStatut | "Tous" | "En retard";

export function CollectionOrdersTab({ orders }: { orders: CollectionOrder[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("Tous");
  const [atelier, setAtelier] = useState<string>("Tous");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const ateliers = useMemo(() => {
    const set = new Set<string>();
    for (const o of orders) if (o.atelierName) set.add(o.atelierName);
    return Array.from(set).sort();
  }, [orders]);

  const kpis = useMemo(() => {
    const k = {
      enAttente: 0,
      enConfection: 0,
      enRetard: 0,
      terminees: 0,
      archivees: 0,
      sav: 0,
    };
    for (const o of orders) {
      if (joursDeRetard(o)) k.enRetard++;
      if (o.statut === "En attente") k.enAttente++;
      else if (o.statut === "En confection") k.enConfection++;
      else if (o.statut === "Terminée") k.terminees++;
      else if (o.statut === "Archivée") k.archivees++;
      else if (o.statut === "SAV") k.sav++;
    }
    return k;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter === "En retard") {
        if (!joursDeRetard(o)) return false;
      } else if (filter !== "Tous" && o.statut !== filter) return false;
      if (atelier !== "Tous" && o.atelierName !== atelier) return false;
      if (!q) return true;
      return [o.ref, o.clientName, o.label, o.matiere, o.supplierName, o.notes]
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

  if (orders.length === 0) {
    return (
      <div className="px-8 pb-12">
        <Card className="p-12 text-center">
          <div className="mx-auto h-11 w-11 rounded-[10px] bg-violet-soft text-violet-strong inline-flex items-center justify-center mb-4">
            <Factory className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <h2 className="text-[18px] font-semibold text-ink mb-1.5">
            Aucune commande Collection en cours
          </h2>
          <p className="text-[13.5px] text-muted max-w-md mx-auto leading-relaxed">
            Les articles de la Collection Atmosphère arrivent ici dès qu&apos;un
            client accepte son devis. Rien à saisir à la main : vends un article
            Collection depuis la boutique, et la commande apparaît dans ce
            tableau au moment de l&apos;acceptation.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-8 pb-12 space-y-5">
      {/* Indicateurs */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi label="En attente" value={kpis.enAttente} tone="amber" sub="tissu pas encore reçu" />
        <Kpi
          label="En confection"
          value={kpis.enConfection}
          tone="violet"
          sub="à l'atelier"
        />
        <Kpi
          label="En retard"
          value={kpis.enRetard}
          tone="danger"
          sub="échéance dépassée"
        />
        <Kpi label="Terminées" value={kpis.terminees} tone="emerald" sub="confection finie" />
        <Kpi
          label="SAV"
          value={kpis.sav}
          tone={kpis.sav > 0 ? "danger" : "muted"}
          sub={`sur ${orders.length} commande${orders.length > 1 ? "s" : ""}`}
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
        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2" />
            <Input
              value={query}
              onChange={(e) => reset(() => setQuery(e.target.value))}
              placeholder="Client, réf., tissu…"
              aria-label="Rechercher une commande Collection"
              className="pl-8 w-56"
            />
          </div>
          <span className="text-[11.5px] text-muted-2 tabular-nums whitespace-nowrap">
            {filtered.length} / {orders.length}
          </span>
        </div>
      </section>

      {/* Tableau */}
      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-[150px_120px_minmax(0,1fr)_120px_110px_100px_70px_20px] gap-x-4 items-center px-4 h-11 border-b border-line bg-canvas-2/60 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-2">
          <span>Statut</span>
          <span>Client</span>
          <span>Article</span>
          <span>Atelier</span>
          <span>Tissu</span>
          <span>Échéance</span>
          <span className="text-right">Retard</span>
          <span />
        </div>

        {rows.map((o) => (
          <OrderRow
            key={o.itemId}
            order={o}
            open={openId === o.itemId}
            onToggle={() => setOpenId(openId === o.itemId ? null : o.itemId)}
          />
        ))}

        {rows.length === 0 && (
          <p className="px-4 py-12 text-center text-[13px] text-muted">
            Aucune commande ne correspond aux filtres.
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
    </div>
  );
}

/* ══════════════════════════ Ligne du tableau ══════════════════════════ */

function OrderRow({
  order,
  open,
  onToggle,
}: {
  order: CollectionOrder;
  open: boolean;
  onToggle: () => void;
}) {
  // useState et non useTransition : React 19 propage l'état « transition en
  // cours » à TOUS les useTransition de la page pendant le refetch RSC, ce
  // qui allumait un spinner sur chaque ligne à la fois (bug 05/10).
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statut, setStatut] = useState(order.statut);
  const [reception, setReception] = useState(order.dateReception);
  const [tissuRecu, setTissuRecu] = useState(order.dateReceptionTissu);
  const [expedie, setExpedie] = useState(order.dateExpeditionUsine);
  const [savDraft, setSavDraft] = useState(order.savComment ?? "");
  const [savSaved, setSavSaved] = useState(false);

  const retard = joursDeRetard({ ...order, statut, dateReception: reception });

  const run = async (fn: () => Promise<{ ok: true } | { ok: false; message: string }>) => {
    setError(null);
    setPending(true);
    try {
      const r = await fn();
      if (!r.ok) setError(r.message);
      return r.ok;
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="border-b border-line/70 last:border-b-0">
      <div
        className={cn(
          "grid grid-cols-[150px_120px_minmax(0,1fr)_120px_110px_100px_70px_20px] gap-x-4 items-center px-4 py-2.5 transition-colors",
          retard ? "bg-red-soft/40 hover:bg-red-soft/60" : "hover:bg-canvas-2/50",
          statut === "Archivée" && "opacity-70 hover:opacity-100",
        )}
      >
        <select
          value={statut}
          disabled={pending}
          onChange={async (e) => {
            const next = e.target.value as CollectionStatut;
            const prev = statut;
            setStatut(next);
            const ok = await run(() => setCollectionStatutAction(order.itemId, next));
            if (!ok) setStatut(prev);
            else if (next === "Archivée" && !reception) {
              setReception(new Date().toISOString().slice(0, 10));
            } else if (next !== "Archivée" && next !== "Terminée") {
              setReception(null);
            }
          }}
          aria-label={`Statut de la commande ${order.ref}`}
          className="h-7 w-full rounded-md border border-line bg-surface px-1.5 text-[12px] font-medium text-ink cursor-pointer outline-none hover:border-line-strong focus:border-violet disabled:opacity-50"
        >
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <span className="truncate text-[13px] font-medium text-ink" title={order.clientName}>
          {order.clientName}
        </span>

        <button onClick={onToggle} className="min-w-0 text-left">
          <p className="truncate text-[13px] text-ink-2">{order.label}</p>
          <p className="truncate text-[11px] text-muted-2 font-mono">
            {order.ref} · {order.dossierNumber}
          </p>
        </button>

        <span className="truncate text-[12px] text-muted">{order.atelierName ?? "—"}</span>
        <span className="truncate text-[12px] text-muted">{order.matiere ?? "—"}</span>
        <span className="text-[12px] text-muted tabular-nums">{fmtDate(order.dateButoir)}</span>
        <span
          className={cn(
            "text-right text-[12px] tabular-nums",
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

      {error && (
        <p className="px-4 pb-2 text-[11.5px] text-red">{error}</p>
      )}

      {open && (
        <div className="px-4 py-4 bg-canvas-2/40 border-t border-line/60 space-y-4">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="eyebrow mb-1.5">Détail de l&apos;article</p>
              <p className="text-[13px] text-ink-2 whitespace-pre-line">
                {order.notes ?? order.label}
              </p>
              <p className="text-[12px] text-muted mt-2 tabular-nums">
                {order.qty} {order.unitLabel}
                {order.supplierName ? ` · fournisseur ${order.supplierName}` : ""}
              </p>
              {order.devisId && (
                <Link
                  href={`/devis/${order.devisId}`}
                  className="inline-flex items-center gap-1 mt-3 text-[12px] font-medium text-violet-strong hover:underline"
                >
                  Voir le devis d&apos;origine →
                </Link>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Detail label="Commande" value={fmtDate(order.dateCommande)} />
              <Detail label="Envoi atelier" value={fmtDate(order.dateEnvoiAtelier)} />
              <Detail label="Livraison prévue" value={fmtDate(order.datePrevue)} />
              <Detail
                label="Échéance atelier"
                value={fmtDate(order.dateButoir)}
                valueClass={retard ? "text-red font-semibold" : undefined}
              />
              <div className="col-span-2">
                <dt className="eyebrow mb-1">Réception constatée (Atmosphère)</dt>
                <dd>
                  <input
                    type="date"
                    value={reception ?? ""}
                    disabled={pending}
                    onChange={async (e) => {
                      const v = e.target.value || null;
                      const prev = reception;
                      setReception(v);
                      const ok = await run(() =>
                        setCollectionReceptionAction(order.itemId, v),
                      );
                      if (!ok) setReception(prev);
                      else if (v) setStatut("Archivée");
                    }}
                    className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-[12.5px] text-ink tabular-nums outline-none focus:border-emerald disabled:opacity-50"
                  />
                  {reception && (
                    <p className="mt-1 text-[11px] text-emerald">
                      → commande archivée
                    </p>
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
              {!tissuRecu && !expedie && (
                <StatusPill tone="violet" className="ml-auto" dot={false}>
                  Action requise
                </StatusPill>
              )}
            </div>
            <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
              <DateUsine
                icon={<Truck className="h-3.5 w-3.5" strokeWidth={2.3} />}
                label="Réception du tissu"
                hint="Quand le tissu d'éditeur arrive à l'usine"
                value={tissuRecu}
                disabled={pending}
                onChange={async (v) => {
                  const prev = tissuRecu;
                  setTissuRecu(v);
                  const ok = await run(() =>
                    setCollectionUsineDateAction(order.itemId, "tissu_recu", v),
                  );
                  if (!ok) setTissuRecu(prev);
                }}
              />
              <DateUsine
                icon={<Send className="h-3.5 w-3.5" strokeWidth={2.3} />}
                label="Expédition des confections"
                hint="Quand l'usine expédie la production"
                value={expedie}
                disabled={pending}
                onChange={async (v) => {
                  const prev = expedie;
                  setExpedie(v);
                  const ok = await run(() =>
                    setCollectionUsineDateAction(order.itemId, "expedie", v),
                  );
                  if (!ok) setExpedie(prev);
                }}
              />
            </div>
          </div>

          {/* Zone SAV */}
          <div
            className={cn(
              "rounded-xl border overflow-hidden",
              statut === "SAV" ? "border-red/30 bg-red-soft/50" : "border-line bg-surface",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 border-b",
                statut === "SAV" ? "border-red/20 bg-red-soft/60" : "border-line bg-canvas-2/50",
              )}
            >
              <AlertTriangle
                className={cn(
                  "h-3.5 w-3.5",
                  statut === "SAV" ? "text-red" : "text-muted-2",
                )}
                strokeWidth={2.3}
              />
              <p
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.14em]",
                  statut === "SAV" ? "text-red" : "text-muted-2",
                )}
              >
                SAV — problème sur la commande
              </p>
              <button
                disabled={pending}
                onClick={async () => {
                  const enable = statut !== "SAV";
                  const prev = statut;
                  setStatut(enable ? "SAV" : expedie || reception ? "Terminée" : "En confection");
                  const ok = await run(() =>
                    toggleCollectionSavAction(order.itemId, enable),
                  );
                  if (!ok) setStatut(prev);
                }}
                className={cn(
                  "ml-auto h-7 px-3 rounded-full text-[11.5px] font-semibold transition-colors disabled:opacity-50",
                  statut === "SAV"
                    ? "bg-red text-white hover:bg-red/90"
                    : "border border-line bg-surface text-ink hover:bg-canvas-2",
                )}
              >
                {statut === "SAV" ? "Clôturer le SAV" : "Passer en SAV"}
              </button>
            </div>
            {statut === "SAV" && (
              <div className="px-4 py-4">
                <label
                  htmlFor={`sav-${order.itemId}`}
                  className="eyebrow text-red mb-1.5 block"
                >
                  Commentaire Atmosphère — lu par l&apos;usine
                </label>
                <textarea
                  id={`sav-${order.itemId}`}
                  value={savDraft}
                  rows={3}
                  disabled={pending}
                  onChange={(e) => {
                    setSavDraft(e.target.value);
                    setSavSaved(false);
                  }}
                  onBlur={async () => {
                    if (savDraft === (order.savComment ?? "")) return;
                    const ok = await run(() =>
                      setCollectionSavCommentAction(order.itemId, savDraft),
                    );
                    if (ok) setSavSaved(true);
                  }}
                  placeholder="Décrire le problème constaté…"
                  className="w-full rounded-lg border border-red/25 bg-surface px-3 py-2 text-[13px] text-ink outline-none placeholder:text-muted-2 focus:border-red/50 disabled:opacity-50"
                />
                <p className="mt-1.5 text-[11px]">
                  {savSaved ? (
                    <span className="text-emerald">Commentaire enregistré.</span>
                  ) : savDraft.trim() ? (
                    <span className="text-muted-2">
                      Enregistré en quittant le champ.
                    </span>
                  ) : (
                    <span className="text-red">Un commentaire est attendu pour l&apos;usine.</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════ Petits composants ══════════════════════════ */

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
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
          {label}
        </span>
        <span
          className={cn(
            "ml-auto text-[10px] font-semibold uppercase tracking-[0.12em]",
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
