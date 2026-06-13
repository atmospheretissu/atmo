import Link from "next/link";
import {
  Plus,
  Filter,
  Send,
  AlertTriangle,
  Truck,
  Package,
  CheckCircle2,
  Download,
  MoreHorizontal,
  Clock,
  Scissors,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import {
  listBons,
  getBcStats,
  listLateDossiers,
  type LateDossier,
} from "@/lib/db/bons-commande";
import { listSuppliers } from "@/lib/db/suppliers";
import { STATUS_META } from "@/lib/workflow/statuses";
import { eur, shortDate } from "@/lib/formatters";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  confirme: "Confirmé",
  expedie: "Expédié",
  recu: "Reçu",
  probleme: "Problème",
};

const statusTones: Record<string, "muted" | "blue" | "violet" | "amber" | "emerald" | "danger"> = {
  brouillon: "muted",
  envoye: "blue",
  confirme: "violet",
  expedie: "amber",
  recu: "emerald",
  probleme: "danger",
};

const flagFor: Record<string, string> = {
  FR: "🇫🇷",
  DE: "🇩🇪",
  PL: "🇵🇱",
  UA: "🇺🇦",
};

export default async function CommandesPage({
  searchParams,
}: {
  searchParams: Promise<{ supplier?: string; late?: string }>;
}) {
  const sp = await searchParams;
  const supplierFilter = sp.supplier ?? null;
  const lateOnly = sp.late === "1";

  const [bcs, stats, suppliers, lateDossiers] = await Promise.all([
    listBons({ supplierId: supplierFilter, lateOnly }),
    getBcStats(),
    listSuppliers(),
    listLateDossiers(),
  ]);
  const activeSuppliers = suppliers.filter((s) => s.active);
  const currentSupplier =
    activeSuppliers.find((s) => s.id === supplierFilter) ?? null;

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Commandes fournisseurs" },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Filter className="h-3.5 w-3.5" strokeWidth={2.2} /> Filtres
            </Button>
            <Button variant="primary" size="sm">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Nouveau BC
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Module 3 · Commandes fournisseurs</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Bons de commande
            <span className="ml-3 text-[24px] text-muted-2 font-semibold tabular-nums">
              {stats.total}
            </span>
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Générés automatiquement à la création d'un dossier (groupement par fournisseur).
            <strong className="text-ink font-medium"> Alerte si franco non atteint avant envoi.</strong>
          </p>
        </section>

        {/* KPIs */}
        <section className="px-8 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MiniStat label="Brouillons" value={String(stats.brouillon)} sub="à compléter / envoyer" tone="amber" icon={AlertTriangle} />
            <MiniStat label="Envoyés" value={String(stats.envoye)} sub="en attente livraison" tone="blue" icon={Send} />
            <MiniStat label="Reçus" value={String(stats.recu)} sub="ce mois" tone="emerald" icon={CheckCircle2} />
            <MiniStat label="Franco non atteint" value={String(stats.francoIssues)} sub="à regrouper" tone="pink" icon={Truck} />
            <MiniStat
              label="BC en retard"
              value={String(stats.bcLate)}
              sub="livraison dépassée"
              tone="pink"
              icon={Clock}
              href={stats.bcLate > 0 ? "/commandes?late=1" : undefined}
            />
            <MiniStat
              label="Confections en retard"
              value={String(lateDossiers.length)}
              sub="seuil atelier dépassé"
              tone="pink"
              icon={Scissors}
              href={lateDossiers.length > 0 ? "/confections" : undefined}
            />
          </div>
        </section>

        {/* Onglets fournisseurs */}
        {activeSuppliers.length > 0 && (
          <section className="px-8 pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <SupplierChip
                label="Tous"
                href="/commandes"
                active={!supplierFilter && !lateOnly}
              />
              <SupplierChip
                label={`En retard (${stats.bcLate})`}
                href="/commandes?late=1"
                active={lateOnly}
                tone="pink"
              />
              <span className="text-muted-2 text-[12px] px-1">·</span>
              {activeSuppliers.map((s) => (
                <SupplierChip
                  key={s.id}
                  label={s.name}
                  badge={s.language}
                  href={`/commandes?supplier=${s.id}`}
                  active={supplierFilter === s.id}
                />
              ))}
            </div>
            {currentSupplier && (
              <p className="text-[11.5px] text-muted mt-2">
                Filtré : {currentSupplier.name} ·{" "}
                {currentSupplier.country} ·{" "}
                {currentSupplier.contact_email ?? "pas d'email contact"}
              </p>
            )}
          </section>
        )}

        {/* Confections en retard (mis en évidence ici aussi) */}
        {lateDossiers.length > 0 && !supplierFilter && !lateOnly && (
          <LateConfectionsCard dossiers={lateDossiers} />
        )}

        {bcs.length === 0 ? <EmptyState /> : <BcTable bcs={bcs} />}
      </div>
    </>
  );
}

function BcTable({ bcs }: { bcs: Awaited<ReturnType<typeof listBons>> }) {
  return (
    <section className="px-8 pb-10">
      <div className="bg-white border border-line rounded-2xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-canvas-2/40 border-b border-line">
              <Th>BC</Th>
              <Th>Fournisseur</Th>
              <Th>Dossier · Client</Th>
              <Th align="right">Montant HT</Th>
              <Th>Franco</Th>
              <Th>Statut</Th>
              <Th align="right">Créé</Th>
              <Th align="right">Réception</Th>
              <th className="w-10 px-4 py-2.5" aria-hidden></th>
            </tr>
          </thead>
          <tbody>
            {bcs.map((bc) => {
              const francoOk = Number(bc.amount_ht ?? 0) >= Number(bc.supplier?.franco_ht ?? 0);
              const francoPct = bc.supplier?.franco_ht
                ? Math.min(100, (Number(bc.amount_ht ?? 0) / Number(bc.supplier.franco_ht)) * 100)
                : 100;
              return (
                <tr key={bc.id} className="border-b border-line last:border-0 hover:bg-canvas-2/30 transition-colors group">
                  <td className="px-4 py-3">
                    <Link href={`/commandes/${bc.id}`} className="font-mono text-[12.5px] text-ink font-medium hover:text-violet">
                      {bc.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {bc.supplier ? (
                      <div className="flex items-center gap-2">
                        <p className="text-ink font-medium">{bc.supplier.name}</p>
                        <span className="text-[10.5px] font-mono font-semibold px-1.5 rounded bg-canvas-2 text-muted">
                          {bc.supplier.language}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-2">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {bc.dossier ? (
                      <Link href={`/confections/${bc.dossier.id}`} className="font-mono text-[12px] text-violet hover:underline">
                        {bc.dossier.number}
                      </Link>
                    ) : (
                      <span className="text-muted-2">—</span>
                    )}
                    {bc.client && (
                      <p className="text-[11px] text-muted truncate">{bc.client.display_name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-semibold text-ink tabular-nums">{eur(Number(bc.amount_ht ?? 0), true)}</p>
                    {bc.supplier && (
                      <p className="ref">vs {eur(Number(bc.supplier.franco_ht), true)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-28 space-y-1">
                      <div className="flex items-center gap-1.5">
                        {francoOk ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald" strokeWidth={2.4} />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-amber" strokeWidth={2.4} />
                        )}
                        <span className={`text-[10.5px] font-medium ${francoOk ? "text-emerald" : "text-amber"}`}>
                          {francoOk ? "Atteint" : `${eur(Number(bc.supplier?.franco_ht ?? 0) - Number(bc.amount_ht ?? 0), true)} manque`}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-canvas-2 overflow-hidden">
                        <div
                          className={`h-full ${francoOk ? "bg-emerald" : "bg-amber"}`}
                          style={{ width: `${francoPct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill tone={statusTones[bc.status] ?? "muted"}>
                      {statusLabels[bc.status] ?? bc.status}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-[12px] text-ink-3 tabular-nums">{shortDate(bc.created_at)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {bc.received_at ? (
                      <p className="text-[12px] text-emerald font-medium tabular-nums">{shortDate(bc.received_at)}</p>
                    ) : bc.expected_at ? (
                      <p className="text-[12px] text-muted tabular-nums">est. {shortDate(bc.expected_at)}</p>
                    ) : (
                      <span className="text-muted-2 text-[12px]">—</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-0.5">
                      <Link href={`/commandes/${bc.id}/pdf?inline=1`} target="_blank" aria-label="PDF" className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-2 hover:text-ink hover:bg-canvas-2">
                        <Download className="h-3.5 w-3.5" />
                      </Link>
                      <Link href={`/commandes/${bc.id}`} aria-label="Ouvrir" className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-2 hover:text-ink hover:bg-canvas-2">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="px-8 pb-16">
      <Card className="py-16 px-6 flex flex-col items-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet to-pink text-white inline-flex items-center justify-center mb-4">
          <Package className="h-6 w-6" strokeWidth={2} />
        </div>
        <h2 className="text-[18px] font-semibold text-ink mb-1">Aucun bon de commande</h2>
        <p className="text-[13.5px] text-muted max-w-md mb-6 leading-relaxed">
          Les BC fournisseurs sont créés automatiquement à l'ouverture d'un dossier de
          confection (groupés par fournisseur). Configure d'abord tes fournisseurs dans
          Paramètres.
        </p>
        <Link href="/parametres">
          <Button variant="primary" size="md">
            Configurer les fournisseurs
          </Button>
        </Link>
      </Card>
    </section>
  );
}

function MiniStat({
  label,
  value,
  tone,
  sub,
  icon: Icon,
  href,
}: {
  label: string;
  value: string;
  tone: "violet" | "emerald" | "amber" | "blue" | "pink";
  sub?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  href?: string;
}) {
  const inner = (
    <Card className="p-4 flex items-start gap-3 hover:border-line-strong transition-colors">
      <ColorChip tone={tone} size="md">
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </ColorChip>
      <div className="flex-1 min-w-0">
        <p className="text-[11.5px] text-muted-2 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-[20px] font-semibold text-ink leading-tight tabular-nums mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-muted mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

function SupplierChip({
  label,
  href,
  active,
  badge,
  tone = "neutral",
}: {
  label: string;
  href: string;
  active: boolean;
  badge?: string;
  tone?: "neutral" | "pink";
}) {
  const base =
    "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] font-medium border transition-colors";
  const cls = active
    ? tone === "pink"
      ? "bg-pink text-white border-pink"
      : "bg-ink text-white border-ink"
    : tone === "pink"
      ? "bg-pink-soft/40 text-pink border-pink/30 hover:bg-pink-soft"
      : "bg-canvas-2/40 text-ink-2 border-line hover:border-line-strong";
  return (
    <Link href={href} className={`${base} ${cls}`}>
      {label}
      {badge && (
        <span
          className={`font-mono text-[10px] font-semibold px-1 rounded ${
            active ? "bg-white/15" : "bg-white"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

function LateConfectionsCard({ dossiers }: { dossiers: LateDossier[] }) {
  return (
    <section className="px-8 pb-6">
      <Card className="overflow-hidden border-pink/30">
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-line bg-pink-soft/30">
          <div className="flex items-center gap-2">
            <ColorChip tone="pink" size="sm">
              <Scissors className="h-3.5 w-3.5" strokeWidth={2.4} />
            </ColorChip>
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-pink">
                Confections en retard
              </p>
              <h3 className="text-[14px] font-semibold text-ink leading-tight">
                {dossiers.length} dossier{dossiers.length > 1 ? "s" : ""} dépassé{dossiers.length > 1 ? "s" : ""}
              </h3>
            </div>
          </div>
        </div>
        <div className="divide-y divide-line">
          {dossiers.slice(0, 5).map((d) => {
            const meta = STATUS_META[d.status];
            return (
              <Link
                key={d.id}
                href={`/confections/${d.id}`}
                className="px-5 py-3 flex items-center gap-3 hover:bg-canvas-2/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-ink truncate">
                    {d.client_name ?? "—"}{" "}
                    <span className="font-mono text-muted-2 font-normal text-[11.5px] ml-1">
                      {d.number}
                    </span>
                  </p>
                  <p className="text-[11.5px] text-muted">
                    {meta.label} · seuil {d.threshold}j
                  </p>
                </div>
                <StatusPill tone="pink">
                  {d.age_days}j en cours (+{d.age_days - d.threshold}j)
                </StatusPill>
              </Link>
            );
          })}
          {dossiers.length > 5 && (
            <Link
              href="/confections"
              className="block text-center px-5 py-2.5 text-[12px] text-violet font-medium hover:bg-canvas-2/40"
            >
              Voir les {dossiers.length} dossiers en retard →
            </Link>
          )}
        </div>
      </Card>
    </section>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={
        "px-4 py-2.5 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 " +
        (align === "right" ? "text-right" : "text-left")
      }
    >
      {children}
    </th>
  );
}
