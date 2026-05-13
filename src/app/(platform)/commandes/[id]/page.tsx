import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Package,
  Download,
  Send,
  Mail,
  ExternalLink,
  MapPin,
  Globe,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Circle,
  CircleDashed,
  MoreHorizontal,
  ChevronRight,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import {
  bonsCommande,
  bcStatusLabels,
  bcStatusTones,
  fournisseurs,
} from "@/lib/mock-data";
import { eur, shortDate } from "@/lib/formatters";

const flagFor: Record<string, string> = {
  FR: "🇫🇷",
  DE: "🇩🇪",
  PL: "🇵🇱",
  UA: "🇺🇦",
};

export default async function CommandeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bc = bonsCommande.find((x) => x.id === id);
  if (!bc) notFound();

  const supplier = fournisseurs.find((f) => f.name === bc.supplier);
  const francoOk = bc.amount >= bc.franco;
  const francoPct = Math.min(100, (bc.amount / bc.franco) * 100);
  const francoMissing = Math.max(0, bc.franco - bc.amount);

  // Mock line items
  const lines = [
    { ref: "CAS-SAU-204", label: "Casamance Saumon — coupon 12m", qty: 1, unit: 1280, total: 1280 },
    { ref: "CAS-SAU-204-D", label: "Doublure occultante 8m", qty: 1, unit: 360, total: 360 },
  ];

  const stages = [
    { key: "brouillon", label: "Brouillon" },
    { key: "envoye", label: "Envoyé" },
    { key: "confirme", label: "Confirmé" },
    { key: "expedie", label: "Expédié" },
    { key: "recu", label: "Reçu" },
  ];
  const currentIdx = stages.findIndex((s) => s.key === bc.status);

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
            <Button variant="secondary" size="sm">
              <Mail className="h-3.5 w-3.5" strokeWidth={2.2} /> Renvoyer
            </Button>
            {bc.status === "brouillon" && (
              <Button variant="primary" size="sm">
                <Send className="h-3.5 w-3.5" strokeWidth={2.4} /> Envoyer au fournisseur
              </Button>
            )}
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        {/* HERO */}
        <section className="px-8 pt-10 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <p className="eyebrow">Bon de commande</p>
            <span className="text-muted-2">·</span>
            <StatusPill tone={bcStatusTones[bc.status]} pulse={bc.status === "envoye"}>
              {bcStatusLabels[bc.status]}
            </StatusPill>
            {!francoOk && bc.status === "brouillon" && (
              <StatusPill tone="amber">⚠ Franco non atteint</StatusPill>
            )}
          </div>

          <div className="flex items-end justify-between gap-8 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1]">
                {bc.supplier}
              </h1>
              <p className="text-[13.5px] text-muted mt-1.5 flex items-center gap-2">
                <span className="font-mono">{bc.number}</span>
                <span className="text-muted-2">·</span>
                <Link href={`/confections/d1`} className="text-violet hover:underline font-medium font-mono">
                  {bc.dossier}
                </Link>
                <span className="text-muted-2">·</span>
                <span className="inline-flex items-center gap-1">
                  {supplier?.country && flagFor[supplier.country]}
                  {supplier?.country}
                </span>
              </p>
            </div>

            <div className="text-right">
              <p className="text-[11.5px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
                Montant total
              </p>
              <p className="text-[44px] font-semibold tracking-tight tabular-nums text-ink leading-none">
                {eur(bc.amount, true)}
              </p>
              <p className="text-[11.5px] text-muted mt-1">
                {lines.length} ligne{lines.length > 1 ? "s" : ""}
                <span className="text-muted-2 mx-1.5">·</span>
                {bc.language} {flagFor[supplier?.country ?? "FR"]}
              </p>
            </div>
          </div>
        </section>

        {/* Stages stripe */}
        <section className="px-8 pb-6">
          <Card className="p-5">
            <p className="eyebrow mb-4">Avancement BC</p>
            <div className="flex items-center justify-between gap-2">
              {stages.map((s, i) => {
                const done = i < currentIdx;
                const current = i === currentIdx;
                const upcoming = i > currentIdx;
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
                    {i < stages.length - 1 && (
                      <div
                        className={
                          "flex-1 h-px " + (done ? "bg-emerald" : "bg-line")
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        <section className="px-8 pb-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* MAIN */}
          <div className="space-y-6 min-w-0">
            {/* Franco alert if needed */}
            {!francoOk && (
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
                      Il manque <span className="font-semibold tabular-nums">{eur(francoMissing, true)}</span> pour atteindre le franco de {eur(bc.franco, true)}.
                    </p>
                  </div>
                </div>

                {/* Franco progress */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted tabular-nums">{eur(bc.amount, true)}</span>
                    <span className="text-ink-2 font-semibold tabular-nums">
                      {Math.round(francoPct)}%
                    </span>
                    <span className="text-muted tabular-nums">{eur(bc.franco, true)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white overflow-hidden border border-line">
                    <div
                      className="h-full bg-amber transition-all"
                      style={{ width: `${francoPct}%` }}
                    />
                  </div>
                </div>

                <p className="text-[12px] text-ink-2 mb-3 font-medium">Suggestions de regroupement :</p>
                <div className="space-y-2">
                  {bonsCommande
                    .filter((b) => b.supplier === bc.supplier && b.id !== bc.id && b.status === "brouillon")
                    .slice(0, 3)
                    .map((b) => (
                      <div key={b.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-line">
                        <Plus className="h-3.5 w-3.5 text-emerald" strokeWidth={2.4} />
                        <span className="text-[12px] font-mono text-ink">{b.number}</span>
                        <span className="text-[11.5px] text-muted flex-1">
                          {b.dossier}
                        </span>
                        <span className="text-[12.5px] font-semibold tabular-nums text-ink">
                          {eur(b.amount, true)}
                        </span>
                      </div>
                    ))}
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Button variant="primary" size="sm">
                    Regrouper & envoyer
                  </Button>
                  <Button variant="secondary" size="sm">
                    Envoyer sans franco (validation manuelle)
                  </Button>
                </div>
              </Card>
            )}

            {/* Lines */}
            <Card className="overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
                <div>
                  <p className="eyebrow mb-1">Détail commande</p>
                  <h3 className="text-[15px] font-semibold text-ink">Lignes</h3>
                </div>
                <button className="text-[12px] text-violet hover:underline font-medium inline-flex items-center gap-1">
                  Ajouter une ligne <Plus className="h-3 w-3" />
                </button>
              </div>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-canvas-2/40 border-b border-line">
                    <th className="px-5 py-2.5 text-left text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">Réf.</th>
                    <th className="px-2 py-2.5 text-left text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">Désignation</th>
                    <th className="px-2 py-2.5 text-right text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">Qté</th>
                    <th className="px-2 py-2.5 text-right text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">P.U.</th>
                    <th className="px-5 py-2.5 text-right text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.ref} className="border-b border-line last:border-0">
                      <td className="px-5 py-3">
                        <span className="ref">{l.ref}</span>
                      </td>
                      <td className="px-2 py-3">
                        <p className="text-ink font-medium leading-tight">{l.label}</p>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <span className="text-ink-2 tabular-nums">{l.qty}</span>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <span className="text-ink-2 tabular-nums">{eur(l.unit)}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="font-semibold text-ink tabular-nums">{eur(l.total)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-canvas-2/30 px-5 py-4 flex items-center justify-between border-t border-line">
                <span className="text-[13px] font-semibold text-ink">Total commande</span>
                <span className="text-[20px] font-semibold tabular-nums text-ink">
                  {eur(bc.amount)}
                </span>
              </div>
            </Card>

            {/* QR codes preview */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="eyebrow mb-1">QR Codes générés</p>
                  <h3 className="text-[15px] font-semibold text-ink">À apposer sur le bon</h3>
                </div>
                <Button variant="secondary" size="sm">
                  <Download className="h-3.5 w-3.5" strokeWidth={2.2} /> PDF QR
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {lines.map((l, i) => (
                  <div key={l.ref} className="rounded-lg border border-line p-3 text-center">
                    <div className="aspect-square rounded-md bg-canvas-2 border border-line mb-2 grid grid-cols-7 grid-rows-7 gap-0.5 p-2">
                      {Array.from({ length: 49 }).map((_, j) => (
                        <span
                          key={j}
                          className={
                            "rounded-[1px] " + (((j * (i + 1)) % 3 === 0) ? "bg-ink" : "bg-transparent")
                          }
                        />
                      ))}
                    </div>
                    <p className="font-mono text-[10.5px] text-ink-2 font-semibold">QR-{l.ref.slice(0, 6)}</p>
                    <p className="text-[10px] text-muted-2 truncate">{l.label.split("—")[0]}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* SIDE */}
          <div className="space-y-4">
            {/* Supplier */}
            {supplier && (
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
                  <div>
                    <p className="text-[14px] font-semibold text-ink">{supplier.name}</p>
                    <p className="text-[11.5px] text-muted">
                      {flagFor[supplier.country]} {supplier.country} · {supplier.type}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-[12.5px]">
                  <div className="flex items-center gap-2.5">
                    <ColorChip tone="blue" size="sm">
                      <Mail className="h-3 w-3" strokeWidth={2.4} />
                    </ColorChip>
                    <span className="text-ink-2 truncate font-mono">{supplier.contact}</span>
                  </div>
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
                    <span className="text-ink-2">Franco · {eur(supplier.franco, true)}</span>
                  </div>
                </div>
                <Button variant="secondary" size="sm" className="w-full mt-4">
                  Portail fournisseur
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Card>
            )}

            {/* Linked dossier */}
            <Card className="overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <p className="eyebrow">Lié au dossier</p>
                <Link href={`/confections/d1`} className="text-[11.5px] text-violet hover:underline font-medium">
                  Voir →
                </Link>
              </div>
              <Link href={`/confections/d1`} className="block px-5 pb-5 group">
                <div className="rounded-lg border border-line p-3 hover:border-line-strong transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-mono text-[12px] text-ink font-medium">{bc.dossier}</p>
                    <ChevronRight className="h-3 w-3 text-muted-2 group-hover:text-ink transition-colors" />
                  </div>
                  <p className="text-[12.5px] text-ink-2 leading-tight">Mme Larochelle, Hélène</p>
                  <p className="text-[11px] text-muted mt-0.5">Bordeaux 33000</p>
                </div>
              </Link>
            </Card>

            {/* Dates */}
            <Card className="p-5">
              <p className="eyebrow mb-3">Chronologie</p>
              <div className="space-y-2.5 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Créé le</span>
                  <span className="text-ink-2 tabular-nums">{shortDate(bc.createdAt)}</span>
                </div>
                {bc.expectedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Livraison estimée</span>
                    <span className="text-ink-2 tabular-nums">{shortDate(bc.expectedAt)}</span>
                  </div>
                )}
                {bc.receivedAt && (
                  <div className="flex items-center justify-between pt-2 border-t border-line">
                    <span className="text-emerald font-medium inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" strokeWidth={2.4} />
                      Reçu le
                    </span>
                    <span className="text-emerald font-semibold tabular-nums">{shortDate(bc.receivedAt)}</span>
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
