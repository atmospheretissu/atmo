import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  Navigation,
  Camera,
  AlertTriangle,
  ChevronRight,
  ArrowRight,
  Send,
  MoreHorizontal,
  Wrench,
  Package,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import {
  poses,
  poseStatusLabels,
  poseStatusTones,
  dossiers,
} from "@/lib/mock-data";
import { shortDate, time, longDate } from "@/lib/formatters";

export default async function PoseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = poses.find((x) => x.id === id);
  if (!p) notFound();

  const initial = p.client.includes(",")
    ? (p.client.split(",")[1].trim()[0] ?? p.client[0])
    : p.client[0];

  const dossier = dossiers.find((d) => d.number === p.dossier);
  const isToday = p.date.toDateString() === new Date().toDateString();
  const dayNum = p.date.getDate();
  const dayLabel = p.date.toLocaleDateString("fr-FR", { weekday: "long" });

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Poses", href: "/poses" },
          { label: p.client },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Send className="h-3.5 w-3.5" strokeWidth={2.2} /> SMS client
            </Button>
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
            <p className="eyebrow">Intervention pose</p>
            <span className="text-muted-2">·</span>
            <StatusPill
              tone={poseStatusTones[p.status]}
              pulse={p.status === "confirme" && isToday}
            >
              {poseStatusLabels[p.status]}
            </StatusPill>
            {isToday && <StatusPill tone="amber">Aujourd'hui</StatusPill>}
          </div>

          <div className="flex items-center gap-5 flex-wrap">
            <div className="shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-canvas-2 border border-line">
              <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-2 capitalize">
                {dayLabel.replace(".", "").slice(0, 3)}
              </p>
              <p className="text-[28px] font-semibold text-ink leading-none tabular-nums">
                {dayNum}
              </p>
              <p className="text-[10.5px] text-muted-2 tabular-nums mt-0.5 font-mono">
                {time(p.date)}
              </p>
            </div>

            <div>
              <h1 className="text-[34px] font-semibold tracking-tight text-ink leading-[1.1]">
                {p.client}
              </h1>
              <p className="text-[13.5px] text-muted mt-1.5 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {p.address}
              </p>
            </div>
          </div>
        </section>

        <section className="px-8 pb-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* MAIN */}
          <div className="space-y-6 min-w-0">
            {/* Map mockup */}
            <Card className="overflow-hidden">
              <div className="relative h-[280px] overflow-hidden">
                <MapMockup />
                <div className="absolute top-4 left-4 z-10 px-3 py-2 rounded-lg bg-white shadow-md border border-line">
                  <p className="text-[10.5px] text-muted-2 font-semibold tracking-wider uppercase mb-0.5">
                    Trajet estimé
                  </p>
                  <div className="flex items-center gap-3 text-[12.5px]">
                    <span className="text-ink font-semibold tabular-nums">22 km</span>
                    <span className="text-muted">·</span>
                    <span className="text-ink font-semibold tabular-nums">28 min</span>
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5">
                  <button className="h-9 w-9 bg-white border border-line rounded-lg inline-flex items-center justify-center shadow-sm hover:bg-canvas-2 transition-colors">
                    <Navigation className="h-4 w-4 text-ink-2" strokeWidth={2.2} />
                  </button>
                  <button className="h-9 w-9 bg-white border border-line rounded-lg inline-flex items-center justify-center shadow-sm hover:bg-canvas-2 transition-colors">
                    <MapPin className="h-4 w-4 text-ink-2" strokeWidth={2.2} />
                  </button>
                </div>
              </div>
              <div className="p-4 flex items-center justify-between border-t border-line">
                <div className="flex items-center gap-2 text-[12.5px] text-ink-2">
                  <Navigation className="h-4 w-4 text-violet" strokeWidth={2.2} />
                  <span className="font-medium">{p.address}</span>
                </div>
                <Button variant="secondary" size="sm">
                  Ouvrir GPS
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>

            {/* Produits à poser */}
            <Card className="overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
                <div>
                  <p className="eyebrow mb-1">À poser sur place</p>
                  <h3 className="text-[15px] font-semibold text-ink">{p.products}</h3>
                </div>
                {dossier && (
                  <Link href={`/confections/${dossier.id}`} className="text-[12px] text-violet hover:underline font-medium inline-flex items-center gap-1">
                    Voir dossier <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
              {dossier && dossier.items.length > 0 ? (
                <div className="divide-y divide-line">
                  {dossier.items.map((item) => (
                    <div key={item.id} className="px-5 py-3 flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald shrink-0" strokeWidth={2.4} />
                      <ColorChip
                        tone={
                          item.type === "tissu"
                            ? "violet"
                            : item.type === "rail"
                            ? "blue"
                            : item.type === "accessoire"
                            ? "pink"
                            : "emerald"
                        }
                        size="sm"
                      >
                        <Package className="h-3 w-3" strokeWidth={2.4} />
                      </ColorChip>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-ink leading-tight truncate">
                          {item.label}
                        </p>
                        <p className="ref mt-0.5">
                          <span className="font-mono">{item.ref}</span>
                          <span className="text-muted-2 mx-1.5">·</span>
                          {item.supplier}
                        </p>
                      </div>
                      <span className="ref shrink-0">{item.qrCode}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-6 text-center text-muted-2 text-[12.5px]">
                  Détail des éléments dans le dossier
                </div>
              )}
            </Card>

            {/* Notes & instructions */}
            <Card className="p-5">
              <p className="eyebrow mb-3">Instructions</p>
              {p.notes ? (
                <div
                  className={
                    "p-3 rounded-lg text-[12.5px] leading-relaxed border " +
                    (p.notes.includes("⚠")
                      ? "bg-pink-soft border-pink/20 text-pink"
                      : "bg-canvas-2/60 border-line text-ink-2")
                  }
                >
                  {p.notes}
                </div>
              ) : (
                <p className="text-[12.5px] text-muted-2">Aucune instruction particulière.</p>
              )}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-line p-3">
                  <Clock className="h-4 w-4 text-muted-2 mb-1.5" strokeWidth={2.2} />
                  <p className="text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">Durée</p>
                  <p className="text-[15px] font-semibold text-ink tabular-nums">{p.duration} min</p>
                </div>
                <div className="rounded-lg border border-line p-3">
                  <Calendar className="h-4 w-4 text-muted-2 mb-1.5" strokeWidth={2.2} />
                  <p className="text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">Date</p>
                  <p className="text-[15px] font-semibold text-ink">{shortDate(p.date)}</p>
                </div>
                <div className="rounded-lg border border-line p-3">
                  <MapPin className="h-4 w-4 text-muted-2 mb-1.5" strokeWidth={2.2} />
                  <p className="text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">Zone</p>
                  <p className="text-[15px] font-semibold text-ink truncate">{p.city.split(" ")[0]}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* SIDE */}
          <div className="space-y-4">
            {/* Client contact */}
            <Card className="p-5">
              <p className="eyebrow mb-3">Contact client</p>
              <div className="flex items-center gap-3 mb-4">
                <LetterAvatar initial={initial} tone={toneFor(p.client)} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-ink truncate">{p.client}</p>
                  <p className="text-[11.5px] text-muted truncate">{p.city}</p>
                </div>
              </div>
              <div className="space-y-2">
                <ContactRow icon={Phone} value={p.phone} tone="emerald" />
                <ContactRow icon={MessageSquare} value="SMS · ATMOSPHERE" tone="blue" />
                <ContactRow icon={Mail} value="Email confirmation envoyé" tone="violet" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" className="w-full">
                  <Phone className="h-3.5 w-3.5" strokeWidth={2.2} /> Appeler
                </Button>
                <Button variant="primary" size="sm" className="w-full">
                  <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.4} /> SMS
                </Button>
              </div>
            </Card>

            {/* Poseur */}
            <Card className="p-5">
              <p className="eyebrow mb-3">Poseur assigné</p>
              <div className="flex items-center gap-3">
                <LetterAvatar initial={p.poseur[0]} tone={toneFor(p.poseur)} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-ink">{p.poseur}</p>
                  <p className="text-[11.5px] text-muted">Bordeaux Centre + 30 km</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <StatusPill tone="emerald" dot={false}>Interne</StatusPill>
                    <span className="ref">5 interventions / semaine</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <Card className="p-5">
              <p className="eyebrow mb-3">Actions</p>
              {p.status === "a_planifier" && (
                <div className="space-y-2">
                  <Button variant="primary" size="md" className="w-full">
                    <Calendar className="h-3.5 w-3.5" strokeWidth={2.4} /> Planifier la pose
                  </Button>
                  <Button variant="secondary" size="md" className="w-full">
                    <Send className="h-3.5 w-3.5" strokeWidth={2.2} /> Proposer date au client
                  </Button>
                </div>
              )}
              {p.status === "planifie" && (
                <div className="space-y-2">
                  <Button variant="primary" size="md" className="w-full">
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.4} /> Confirmer avec client
                  </Button>
                  <Button variant="secondary" size="md" className="w-full">
                    Modifier la date
                  </Button>
                </div>
              )}
              {p.status === "confirme" && (
                <div className="space-y-2">
                  <Button variant="primary" size="md" className="w-full">
                    <Camera className="h-3.5 w-3.5" strokeWidth={2.4} /> Marquer posé + photo
                  </Button>
                  <Button variant="secondary" size="md" className="w-full">
                    <Wrench className="h-3.5 w-3.5" strokeWidth={2.2} /> Reporter
                  </Button>
                </div>
              )}
              {p.status === "pose" && (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-soft text-emerald text-[12.5px] font-medium w-full">
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.4} />
                    Pose effectuée le {shortDate(p.date)}
                  </div>
                  <Button variant="secondary" size="md" className="w-full">
                    Voir le rapport
                  </Button>
                </div>
              )}
            </Card>

            {p.notes?.includes("⚠") && (
              <Card className="p-4 bg-pink-soft border-pink/30">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-pink shrink-0 mt-0.5" strokeWidth={2.4} />
                  <div>
                    <p className="text-[12.5px] font-semibold text-pink">Pose bloquée</p>
                    <p className="text-[11.5px] text-pink/80 mt-1 leading-snug">
                      Encaisser le solde avant intervention. Voir la fiche dossier.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function ContactRow({
  icon: Icon,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  value: string;
  tone: "emerald" | "blue" | "violet";
}) {
  return (
    <div className="flex items-center gap-2.5 text-[12.5px]">
      <ColorChip tone={tone} size="sm">
        <Icon className="h-3 w-3" strokeWidth={2.4} />
      </ColorChip>
      <span className="text-ink-2 truncate font-mono tabular-nums">{value}</span>
    </div>
  );
}

function MapMockup() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Map background with grid */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(at 30% 40%, rgba(139,92,246,0.05) 0%, transparent 60%), linear-gradient(135deg, #FEFEFE 0%, #F4F2EE 100%)",
        }}
      />
      <svg className="absolute inset-0 w-full h-full opacity-25" aria-hidden>
        <defs>
          <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#9ca3af" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#map-grid)" />
      </svg>

      {/* Streets — abstract lines */}
      <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M0 30 Q 50 35 100 25" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
        <path d="M0 60 L 100 65" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
        <path d="M20 0 L 25 100" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
        <path d="M70 0 L 72 100" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
        <path d="M0 80 Q 40 75 100 85" stroke="#e5e7eb" strokeWidth="1" fill="none" />
      </svg>

      {/* Route line */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path
          d="M 22 78 Q 30 55 45 50 T 73 32"
          stroke="#8B5CF6"
          strokeWidth="0.8"
          strokeDasharray="2 1.5"
          fill="none"
        />
      </svg>

      {/* Origin pin */}
      <div className="absolute" style={{ left: "20%", top: "75%" }}>
        <div className="relative">
          <div className="h-8 w-8 rounded-full bg-emerald shadow-lg flex items-center justify-center ring-4 ring-emerald/20">
            <div className="h-2 w-2 rounded-full bg-white" />
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap text-[10px] text-ink font-semibold bg-white px-1.5 py-0.5 rounded border border-line">
            Atelier
          </div>
        </div>
      </div>

      {/* Destination pin */}
      <div className="absolute" style={{ left: "72%", top: "28%" }}>
        <div className="relative">
          <div className="h-10 w-10 rounded-full bg-pink shadow-lg flex items-center justify-center ring-4 ring-pink/20 animate-pulse-soft">
            <MapPin className="h-5 w-5 text-white" strokeWidth={2.2} fill="white" />
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap text-[10px] text-ink font-semibold bg-white px-1.5 py-0.5 rounded border border-line">
            Client
          </div>
        </div>
      </div>
    </div>
  );
}
