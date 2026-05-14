import Link from "next/link";
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { ColorChip } from "@/components/ui/status-pill";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import { QrScanner } from "@/components/reception/qr-scanner";
import {
  getPendingReceptionItems,
  getRecentReceptions,
} from "@/app/(platform)/reception/actions";
import { time } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export default async function ReceptionPage() {
  const [pending, recents] = await Promise.all([
    getPendingReceptionItems(),
    getRecentReceptions(),
  ]);

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Réception" },
        ]}
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Module 4 · Réception QR Code</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Scanner les colis
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Scanne un QR code (caméra mobile ou pistolet USB) pour marquer un élément comme reçu.
            Le statut du dossier se met à jour automatiquement.
          </p>
        </section>

        <section className="px-8 pb-10 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">
          {/* LEFT — scanner */}
          <div className="space-y-4 lg:sticky lg:top-20">
            <QrScanner />

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <ColorChip tone="emerald" size="sm">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
                </ColorChip>
                <h3 className="text-[13px] font-semibold text-ink">Comment ça marche</h3>
              </div>
              <ul className="space-y-1.5 text-[11.5px] text-muted">
                <li>
                  • Chaque <strong className="text-ink-2">ligne de dossier</strong> a un QR code
                  unique généré à l'ouverture.
                </li>
                <li>
                  • Tu peux scanner avec la <strong className="text-ink-2">caméra</strong> du
                  téléphone/tablette, un <strong className="text-ink-2">pistolet USB</strong> ou
                  saisir le code à la main.
                </li>
                <li>
                  • Quand <strong className="text-ink-2">tous les items</strong> d'un dossier
                  sont reçus + le solde est réglé, le dossier passe en{" "}
                  <strong className="text-emerald">"Prêt pour pose"</strong>.
                </li>
              </ul>
            </Card>
          </div>

          {/* RIGHT — KPIs + listes */}
          <div className="space-y-4 min-w-0">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MiniStat label="À scanner" value={String(pending.length)} sub="en attente" tone="amber" icon={Package} />
              <MiniStat label="Scannés ce jour" value={String(recents.length)} sub="aujourd'hui" tone="emerald" icon={CheckCircle2} />
              <MiniStat label="Dossiers actifs" value="—" sub="voir confections" tone="violet" icon={QrCode} />
            </div>

            <Card className="overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
                <div>
                  <p className="eyebrow mb-1">À scanner</p>
                  <h3 className="text-[15px] font-semibold text-ink">En attente de réception</h3>
                </div>
                <span className="inline-flex items-center justify-center h-6 px-2 rounded-full bg-amber-soft text-amber text-[11px] font-semibold">
                  {pending.length}
                </span>
              </div>
              {pending.length === 0 ? (
                <div className="px-5 py-10 text-center text-[12.5px] text-muted-2">
                  Aucun élément en attente. Tout est reçu !
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {pending.map((p) => {
                    const initial = p.clientName[0] ?? "?";
                    return (
                      <div key={p.id} className="px-5 py-3 flex items-center gap-3 hover:bg-canvas-2/30 transition-colors">
                        <div className="h-9 w-9 rounded-md bg-canvas-2 border border-line inline-flex items-center justify-center shrink-0">
                          <QrCode className="h-4 w-4 text-ink-3" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-ink leading-tight truncate">
                            {p.label}
                          </p>
                          <p className="text-[11px] text-muted-2 font-mono mt-0.5 truncate">
                            {p.qr_code}
                            {p.ref && <> · {p.ref}</>}
                          </p>
                        </div>
                        <div className="hidden md:flex items-center gap-2 shrink-0">
                          <LetterAvatar
                            initial={initial}
                            tone={toneFor(p.clientName)}
                            size="sm"
                          />
                          <div className="leading-tight">
                            <p className="text-[11.5px] font-medium text-ink-2 truncate max-w-[140px]">
                              {p.clientName}
                            </p>
                            <p className="ref">{p.dossierNumber}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {recents.length > 0 && (
              <Card className="overflow-hidden">
                <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
                  <div>
                    <p className="eyebrow mb-1">Aujourd'hui</p>
                    <h3 className="text-[15px] font-semibold text-ink">Réceptions récentes</h3>
                  </div>
                  <Link
                    href="/confections"
                    className="text-[12px] text-violet hover:underline font-medium inline-flex items-center gap-1"
                  >
                    Confections <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="divide-y divide-line">
                  {recents.map((r) => (
                    <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                      <ColorChip tone="emerald" size="md">
                        <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />
                      </ColorChip>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-ink leading-tight truncate">
                          {r.label}
                        </p>
                        <p className="text-[11px] text-muted-2 font-mono mt-0.5 truncate">
                          {r.qr_code} · {r.clientName} · {r.dossierNumber}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] text-muted-2 font-mono">
                          {r.received_at ? time(r.received_at) : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
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
  tone: "violet" | "emerald" | "amber";
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
