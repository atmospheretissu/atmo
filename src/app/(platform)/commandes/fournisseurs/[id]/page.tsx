import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Send,
  AlertTriangle,
  Truck,
  CheckCircle2,
  Clock,
  ChevronLeft,
  Mail,
  Phone,
  Globe,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { listBons, getBcStats } from "@/lib/db/bons-commande";
import { getSupplierById } from "@/lib/db/suppliers";
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
  IT: "🇮🇹",
};

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplier = await getSupplierById(id);
  if (!supplier) notFound();

  const [allBcs, stats] = await Promise.all([
    listBons({ supplierId: id }),
    getBcStats(),
  ]);

  const bcs = allBcs.filter((b) => b.supplier?.id === id);
  const totalThisYear = bcs.reduce((s, b) => s + Number(b.amount_ht ?? 0), 0);
  const draftCount = bcs.filter((b) => b.status === "brouillon").length;
  const sentCount = bcs.filter((b) => b.status === "envoye").length;
  const receivedCount = bcs.filter((b) => b.status === "recu").length;
  const today = new Date().toISOString().slice(0, 10);
  const overdueCount = bcs.filter(
    (b) =>
      b.expected_at &&
      String(b.expected_at) < today &&
      ["envoye", "confirme", "expedie"].includes(b.status),
  ).length;

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Commandes fournisseurs", href: "/commandes" },
          { label: supplier.name },
        ]}
      />
      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <Link
            href="/commandes"
            className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-ink mb-3"
          >
            <ChevronLeft className="h-3 w-3" strokeWidth={2.4} />
            Tous les fournisseurs
          </Link>
          <div className="flex items-end justify-between gap-8 flex-wrap mb-2">
            <div>
              <p className="eyebrow mb-2">Fournisseur</p>
              <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] flex items-center gap-3">
                {supplier.name}
                <span className="text-[20px] font-mono text-muted-2 font-medium">
                  {flagFor[supplier.country] ?? supplier.country}
                </span>
              </h1>
              <p className="text-[13.5px] text-muted mt-2 flex items-center gap-3 flex-wrap">
                <span>Type : {supplier.type}</span>
                {supplier.language && (
                  <>
                    <span className="text-muted-2">·</span>
                    <span>Langue : {supplier.language}</span>
                  </>
                )}
                {supplier.franco_ht > 0 && (
                  <>
                    <span className="text-muted-2">·</span>
                    <span>
                      Franco : <strong className="text-ink">{eur(Number(supplier.franco_ht), true)}</strong>
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {supplier.portal_url && (
                <a href={supplier.portal_url} target="_blank" rel="noopener">
                  <Button variant="secondary" size="sm">
                    <Globe className="h-3.5 w-3.5" strokeWidth={2.2} />
                    Portail pro
                  </Button>
                </a>
              )}
              {supplier.contact_email && (
                <a href={`mailto:${supplier.contact_email}`}>
                  <Button variant="ghost" size="sm">
                    <Mail className="h-3.5 w-3.5" strokeWidth={2.2} />
                    Email
                  </Button>
                </a>
              )}
              {supplier.contact_phone && (
                <a href={`tel:${supplier.contact_phone}`}>
                  <Button variant="ghost" size="sm">
                    <Phone className="h-3.5 w-3.5" strokeWidth={2.2} />
                    {supplier.contact_phone}
                  </Button>
                </a>
              )}
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="px-8 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <MiniStat label="BC totaux" value={String(bcs.length)} sub="depuis le début" tone="violet" icon={Truck} />
            <MiniStat label="Brouillons" value={String(draftCount)} sub="à compléter / envoyer" tone="amber" icon={Clock} />
            <MiniStat label="Envoyés" value={String(sentCount)} sub="en attente livraison" tone="blue" icon={Send} />
            <MiniStat label="Reçus" value={String(receivedCount)} sub="ce mois" tone="emerald" icon={CheckCircle2} />
            <MiniStat label="En retard" value={String(overdueCount)} sub="livraison dépassée" tone="pink" icon={AlertTriangle} />
          </div>
          <p className="text-[12px] text-muted-2 mt-3">
            Volume HT cumulé : <strong className="text-ink">{eur(totalThisYear, true)}</strong>
            {stats.francoIssues > 0 && (
              <>
                {" · "}
                <span className="text-amber">
                  {stats.francoIssues} BC en franco non atteint
                </span>
              </>
            )}
          </p>
        </section>

        {/* Historique BC */}
        <section className="px-8 pb-10">
          <h2 className="text-[18px] font-semibold text-ink tracking-tight mb-3">
            Historique des bons de commande
          </h2>
          {bcs.length === 0 ? (
            <Card className="py-14 px-6 text-center">
              <Truck className="h-8 w-8 text-muted-2 mx-auto mb-3" />
              <p className="text-[13.5px] text-ink-2 font-medium">
                Aucun BC pour ce fournisseur pour l&apos;instant
              </p>
              <p className="text-[11.5px] text-muted-2 mt-1">
                Les BCs sont auto-générés à la création d&apos;un dossier (acompte reçu).
              </p>
            </Card>
          ) : (
            <div className="bg-white border border-line rounded-2xl overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-canvas-2/40 border-b border-line">
                    <Th>BC</Th>
                    <Th>Dossier · Client</Th>
                    <Th align="right">Montant HT</Th>
                    <Th>Statut</Th>
                    <Th align="right">Créé</Th>
                    <Th align="right">Réception</Th>
                  </tr>
                </thead>
                <tbody>
                  {bcs.map((bc) => (
                    <tr key={bc.id} className="border-b border-line last:border-0 hover:bg-canvas-2/30">
                      <td className="px-4 py-3">
                        <Link
                          href={`/commandes/${bc.id}`}
                          className="font-mono text-[12.5px] text-ink font-medium hover:text-violet"
                        >
                          {bc.number}
                        </Link>
                        {(bc as { routing?: string }).routing &&
                          (bc as { routing?: string }).routing !== "standard" && (
                            <p className="text-[10.5px] text-muted-2 mt-0.5 font-mono">
                              {(bc as { routing: string }).routing.toUpperCase()}
                            </p>
                          )}
                      </td>
                      <td className="px-4 py-3">
                        {bc.dossier ? (
                          <Link
                            href={`/confections/${bc.dossier.id}`}
                            className="font-mono text-[12px] text-violet hover:underline"
                          >
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function MiniStat({
  label,
  value,
  tone,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: "violet" | "emerald" | "amber" | "blue" | "pink";
  sub?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <Card className="p-4 flex items-start gap-3">
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
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
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
