import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Package,
  Download,
  Mail,
  ExternalLink,
  Globe,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Circle,
  CircleDashed,
  ChevronRight,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { BcStatusActions } from "@/components/commandes/bc-status-actions";
import { BcLinesEditor } from "@/components/commandes/bc-lines-editor";
import { getBcDetail } from "@/lib/db/bons-commande";
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

const STAGES = [
  { key: "brouillon", label: "Brouillon" },
  { key: "envoye", label: "Envoyé" },
  { key: "confirme", label: "Confirmé" },
  { key: "expedie", label: "Expédié" },
  { key: "recu", label: "Reçu" },
];

export default async function CommandeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getBcDetail(id);
  if (!detail) notFound();
  const { bc, supplier, dossier, client, lines } = detail;

  const amount = Number(bc.amount_ht ?? 0);
  const franco = Number(supplier?.franco_ht ?? 0);
  const francoOk = franco === 0 || amount >= franco;
  const francoPct = franco > 0 ? Math.min(100, (amount / franco) * 100) : 100;
  const francoMissing = Math.max(0, franco - amount);

  const currentIdx = bc.status === "probleme" ? -1 : STAGES.findIndex((s) => s.key === bc.status);
  const canEdit = bc.status === "brouillon";

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Commandes", href: "/commandes" },
          { label: bc.number },
        ]}
        actions={
          <>
            <Button variant="ghost" size="sm">
              <Download className="h-3.5 w-3.5" strokeWidth={2.2} /> PDF
            </Button>
            <BcStatusActions bcId={bc.id} status={bc.status} francoOk={francoOk} />
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <p className="eyebrow">Bon de commande</p>
            <span className="text-muted-2">·</span>
            <StatusPill tone={statusTones[bc.status] ?? "muted"} pulse={bc.status === "envoye"}>
              {statusLabels[bc.status] ?? bc.status}
            </StatusPill>
            {!francoOk && bc.status === "brouillon" && (
              <StatusPill tone="amber">⚠ Franco non atteint</StatusPill>
            )}
            {bc.franco_override && (
              <StatusPill tone="violet">Franco override</StatusPill>
            )}
          </div>

          <div className="flex items-end justify-between gap-8 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1]">
                {supplier?.name ?? <span className="text-muted-2">Fournisseur inconnu</span>}
              </h1>
              <p className="text-[13.5px] text-muted mt-1.5 flex items-center gap-2 flex-wrap">
                <span className="font-mono">{bc.number}</span>
                {dossier && (
                  <>
                    <span className="text-muted-2">·</span>
                    <Link
                      href={`/confections/${dossier.id}`}
                      className="text-violet hover:underline font-medium font-mono"
                    >
                      {dossier.number}
                    </Link>
                  </>
                )}
                {client && (
                  <>
                    <span className="text-muted-2">·</span>
                    <span>{client.display_name}</span>
                  </>
                )}
                {supplier?.country && (
                  <>
                    <span className="text-muted-2">·</span>
                    <span className="inline-flex items-center gap-1">
                      {flagFor[supplier.country] ?? ""}
                      {supplier.country}
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[11.5px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                Montant HT
              </p>
              <p className="text-[44px] font-semibold tracking-tight tabular-nums text-ink leading-none">
                {eur(amount, true)}
              </p>
              <p className="text-[11.5px] text-muted mt-1">
                {lines.length} ligne{lines.length > 1 ? "s" : ""}
                {supplier && (
                  <>
                    <span className="text-muted-2 mx-1.5">·</span>
                    {bc.language} {flagFor[supplier.country] ?? ""}
                  </>
                )}
              </p>
            </div>
          </div>
        </section>

        {bc.status !== "probleme" && (
          <section className="px-8 pb-6">
            <Card className="p-5">
              <p className="eyebrow mb-4">Avancement BC</p>
              <div className="flex items-center justify-between gap-2">
                {STAGES.map((s, i) => {
                  const done = i < currentIdx;
                  const current = i === currentIdx;
                  return (
                    <div key={s.key} className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex flex-col items-center gap-1.5 shrink-0">
                        <div
                          className={
                            "h-8 w-8 rounded-full inline-flex items-center justify-center transition-colors " +
                            (done
                              ? "bg-emerald text-white"
                              : current
                                ? "bg-violet text-white ring-4 ring-violet-soft"
                                : "bg-canvas-2 border border-line text-muted-2")
                          }
                        >
                          {done ? (
                            <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />
                          ) : current ? (
                            <Circle className="h-3 w-3 fill-current" strokeWidth={0} />
                          ) : (
                            <CircleDashed className="h-3.5 w-3.5" strokeWidth={2.2} />
                          )}
                        </div>
                        <p
                          className={
                            "text-[11px] font-semibold whitespace-nowrap " +
                            (current ? "text-ink" : done ? "text-emerald" : "text-muted-2")
                          }
                        >
                          {s.label}
                        </p>
                      </div>
                      {i < STAGES.length - 1 && (
                        <div className={"flex-1 h-px " + (done ? "bg-emerald" : "bg-line")} />
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>
        )}

        <section className="px-8 pb-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="space-y-6 min-w-0">
            {!francoOk && bc.status === "brouillon" && (
              <Card className="p-5 bg-amber-soft border-amber/30">
                <div className="flex items-start gap-3 mb-4">
                  <ColorChip tone="amber" size="md">
                    <AlertTriangle className="h-4 w-4" strokeWidth={2.4} />
                  </ColorChip>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-ink leading-tight">
                      Franco non atteint
                    </p>
                    <p className="text-[12.5px] text-amber mt-1">
                      Il manque{" "}
                      <span className="font-semibold tabular-nums">
                        {eur(francoMissing, true)}
                      </span>{" "}
                      pour atteindre le franco de {eur(franco, true)}.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted tabular-nums">{eur(amount, true)}</span>
                    <span className="text-ink-2 font-semibold tabular-nums">
                      {Math.round(francoPct)}%
                    </span>
                    <span className="text-muted tabular-nums">{eur(franco, true)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white overflow-hidden border border-line">
                    <div
                      className="h-full bg-amber transition-all"
                      style={{ width: `${francoPct}%` }}
                    />
                  </div>
                </div>
              </Card>
            )}

            {bc.status === "probleme" && bc.notes && (
              <Card className="p-5 bg-danger-soft border-danger/30">
                <div className="flex items-start gap-3">
                  <ColorChip tone="pink" size="md">
                    <AlertTriangle className="h-4 w-4" strokeWidth={2.4} />
                  </ColorChip>
                  <div>
                    <p className="text-[14px] font-semibold text-ink mb-1">Problème signalé</p>
                    <p className="text-[12.5px] text-ink-2 whitespace-pre-wrap">{bc.notes}</p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-line">
                <p className="eyebrow mb-1">Détail commande</p>
                <h3 className="text-[15px] font-semibold text-ink">Lignes</h3>
              </div>
              <BcLinesEditor bcId={bc.id} lines={lines} canEdit={canEdit} />
              <div className="bg-canvas-2/30 px-5 py-4 flex items-center justify-between border-t border-line">
                <span className="text-[13px] font-semibold text-ink">Total HT</span>
                <span className="text-[20px] font-semibold tabular-nums text-ink">
                  {eur(amount, true)}
                </span>
              </div>
            </Card>

            {bc.notes && bc.status !== "probleme" && (
              <Card className="p-5">
                <p className="eyebrow mb-2">Notes internes</p>
                <p className="text-[12.5px] text-ink-2 whitespace-pre-wrap leading-relaxed">{bc.notes}</p>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            {supplier ? (
              <Card className="p-5">
                <p className="eyebrow mb-3">Fournisseur</p>
                <div className="flex items-center gap-3 mb-4">
                  <ColorChip
                    tone={
                      supplier.type === "tissu"
                        ? "violet"
                        : supplier.type === "rail"
                          ? "blue"
                          : supplier.type === "accessoire"
                            ? "pink"
                            : "orange"
                    }
                    size="lg"
                  >
                    <Package className="h-4 w-4" strokeWidth={2.2} />
                  </ColorChip>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-ink truncate">{supplier.name}</p>
                    <p className="text-[11.5px] text-muted">
                      {flagFor[supplier.country] ?? ""} {supplier.country} · {supplier.type}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-[12.5px]">
                  {supplier.contact_email && (
                    <div className="flex items-center gap-2.5">
                      <ColorChip tone="blue" size="sm">
                        <Mail className="h-3 w-3" strokeWidth={2.4} />
                      </ColorChip>
                      <span className="text-ink-2 truncate font-mono">{supplier.contact_email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <ColorChip tone="emerald" size="sm">
                      <Globe className="h-3 w-3" strokeWidth={2.4} />
                    </ColorChip>
                    <span className="text-ink-2">Langue · {supplier.language}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <ColorChip tone="amber" size="sm">
                      <Truck className="h-3 w-3" strokeWidth={2.4} />
                    </ColorChip>
                    <span className="text-ink-2 tabular-nums">
                      Franco · {eur(Number(supplier.franco_ht), true)}
                    </span>
                  </div>
                </div>
                {supplier.portal_url && (
                  <a href={supplier.portal_url} target="_blank" rel="noreferrer">
                    <Button variant="secondary" size="sm" className="w-full mt-4">
                      Portail fournisseur
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                )}
              </Card>
            ) : (
              <Card className="p-5">
                <p className="eyebrow mb-2">Fournisseur</p>
                <p className="text-[12.5px] text-muted">Aucun fournisseur lié à ce BC.</p>
              </Card>
            )}

            {dossier && (
              <Card className="overflow-hidden">
                <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                  <p className="eyebrow">Lié au dossier</p>
                  <Link
                    href={`/confections/${dossier.id}`}
                    className="text-[11.5px] text-violet hover:underline font-medium"
                  >
                    Voir →
                  </Link>
                </div>
                <Link href={`/confections/${dossier.id}`} className="block px-5 pb-5 group">
                  <div className="rounded-lg border border-line p-3 hover:border-line-strong transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-mono text-[12px] text-ink font-medium">{dossier.number}</p>
                      <ChevronRight className="h-3 w-3 text-muted-2 group-hover:text-ink transition-colors" />
                    </div>
                    {client && (
                      <>
                        <p className="text-[12.5px] text-ink-2 leading-tight">{client.display_name}</p>
                        {client.city && <p className="text-[11px] text-muted mt-0.5">{client.city}</p>}
                      </>
                    )}
                  </div>
                </Link>
              </Card>
            )}

            <Card className="p-5">
              <p className="eyebrow mb-3">Chronologie</p>
              <div className="space-y-2.5 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Créé le</span>
                  <span className="text-ink-2 tabular-nums">{shortDate(bc.created_at)}</span>
                </div>
                {bc.sent_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Envoyé le</span>
                    <span className="text-ink-2 tabular-nums">{shortDate(bc.sent_at)}</span>
                  </div>
                )}
                {bc.expected_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Livraison estimée</span>
                    <span className="text-ink-2 tabular-nums">{shortDate(bc.expected_at)}</span>
                  </div>
                )}
                {bc.received_at && (
                  <div className="flex items-center justify-between pt-2 border-t border-line">
                    <span className="text-emerald font-medium inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" strokeWidth={2.4} />
                      Reçu le
                    </span>
                    <span className="text-emerald font-semibold tabular-nums">
                      {shortDate(bc.received_at)}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </>
  );
}
