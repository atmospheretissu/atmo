"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Phone,
  MessageSquare,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Navigation,
  Camera,
  Wifi,
  Battery,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import { poses, poseStatusLabels, poseStatusTones, poseurs } from "@/lib/mock-data";
import { shortDate, time } from "@/lib/formatters";

export default function PosesPage() {
  const [filter, setFilter] = useState<"all" | "a_planifier" | "planifie" | "pose">("all");

  const filtered = poses.filter((p) => filter === "all" || p.status === filter || (filter === "planifie" && (p.status === "planifie" || p.status === "confirme")));

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Poses" },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Calendar className="h-3.5 w-3.5" strokeWidth={2.2} /> Planning
            </Button>
            <Button variant="primary" size="sm">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Planifier pose
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Module 6 · Gestion des poseurs</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Planning des poses
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Espace mobile pour les poseurs · contact client direct · confirmation de pose avec photo / signature.
            <strong className="text-ink font-medium"> Alerte si pose non planifiée 5j après réception.</strong>
          </p>
        </section>

        {/* Poseurs row */}
        <section className="px-8 pb-6">
          <p className="eyebrow mb-3">Équipe de pose</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {poseurs.map((p) => (
              <Card key={p.id} className="p-4 flex items-center gap-3">
                <LetterAvatar initial={p.name[0]} tone={toneFor(p.name)} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold text-ink">{p.name}</p>
                    <StatusPill tone={p.internal ? "violet" : "muted"} dot={false}>
                      {p.internal ? "Interne" : "Externe"}
                    </StatusPill>
                  </div>
                  <p className="text-[11.5px] text-muted mt-0.5 truncate">{p.zone}</p>
                  <p className="text-[11.5px] text-ink-3 mt-1">
                    <span className="font-semibold tabular-nums">{p.upcoming}</span>
                    <span className="text-muted ml-1">interventions à venir</span>
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="px-8 pb-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
          {/* LEFT — interventions */}
          <div className="space-y-4 min-w-0">
            {/* Filters */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <nav className="flex items-center gap-1.5 flex-wrap">
                {[
                  { k: "all", l: "Toutes" },
                  { k: "a_planifier", l: "À planifier" },
                  { k: "planifie", l: "Planifiées" },
                  { k: "pose", l: "Posées" },
                ].map((f) => (
                  <button
                    key={f.k}
                    onClick={() => setFilter(f.k as never)}
                    className={
                      "h-8 px-3 rounded-full text-[12.5px] font-medium transition-all " +
                      (filter === f.k
                        ? "bg-ink text-white"
                        : "bg-white text-muted hover:text-ink border border-line")
                    }
                  >
                    {f.l}
                  </button>
                ))}
              </nav>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
                <Input placeholder="Client, ville…" className="pl-9 w-60 text-[12.5px] rounded-full bg-white" />
              </div>
            </div>

            {/* Interventions list */}
            <div className="space-y-3">
              {filtered.map((p) => (
                <PoseCard key={p.id} pose={p} />
              ))}
            </div>
          </div>

          {/* RIGHT — phone mockup */}
          <div className="sticky top-20">
            <PhoneMockup />
          </div>
        </section>
      </div>
    </>
  );
}

function PoseCard({ pose: p }: { pose: typeof poses[0] }) {
  const initial = p.client.includes(",")
    ? (p.client.split(",")[1].trim()[0] ?? p.client[0])
    : p.client[0];

  const isPast = p.date < new Date();
  const isToday = p.date.toDateString() === new Date().toDateString();
  const isOverdue = p.status === "a_planifier" && p.date < new Date();

  return (
    <Card className="overflow-hidden">
      <Link href={`/poses/${p.id}`} className="block hover:bg-canvas-2/20 transition-colors">
      <div className="p-4 flex items-start gap-4">
        {/* Date block */}
        <div className="shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-canvas-2 border border-line">
          <p className="text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">
            {p.date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}
          </p>
          <p className="text-[22px] font-semibold text-ink leading-none tabular-nums">
            {p.date.getDate()}
          </p>
          <p className="text-[10px] text-muted-2 tabular-nums mt-0.5 font-mono">
            {time(p.date)}
          </p>
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <LetterAvatar initial={initial} tone={toneFor(p.client)} size="sm" />
              <p className="text-[14px] font-semibold text-ink truncate">{p.client}</p>
            </div>
            <StatusPill
              tone={poseStatusTones[p.status]}
              pulse={p.status === "confirme" && isToday}
            >
              {poseStatusLabels[p.status]}
            </StatusPill>
          </div>

          <p className="text-[12px] text-muted-2 flex items-center gap-1.5 mb-2">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{p.address}</span>
          </p>

          <p className="text-[12.5px] text-ink-2 leading-snug mb-3">
            {p.products}
          </p>

          {p.notes && (
            <div className={
              "text-[11.5px] px-2.5 py-1.5 rounded-lg mb-3 border " +
              (p.notes.includes("⚠")
                ? "bg-pink-soft border-pink/20 text-pink"
                : "bg-canvas-2/60 border-line text-ink-3")
            }>
              {p.notes}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-line">
            <div className="flex items-center gap-2 text-[12px]">
              <LetterAvatar initial={p.poseur[0]} tone={toneFor(p.poseur)} size="xs" />
              <span className="text-ink-2 font-medium">{p.poseur}</span>
              <span className="text-muted-2">·</span>
              <Clock className="h-3 w-3 text-muted-2" />
              <span className="text-muted tabular-nums">{p.duration} min</span>
            </div>

            <div className="flex items-center gap-1">
              <button className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted hover:text-ink hover:bg-canvas-2 transition-colors" aria-label="Appeler">
                <Phone className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
              <button className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted hover:text-ink hover:bg-canvas-2 transition-colors" aria-label="SMS">
                <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
              <button className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted hover:text-ink hover:bg-canvas-2 transition-colors" aria-label="Navigation">
                <Navigation className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
              {p.status === "a_planifier" && (
                <Button variant="primary" size="sm" className="ml-2">
                  <Calendar className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Planifier
                </Button>
              )}
              {p.status === "planifie" && (
                <Button variant="secondary" size="sm" className="ml-2">
                  Confirmer
                </Button>
              )}
              {p.status === "confirme" && isToday && (
                <Button variant="primary" size="sm" className="ml-2">
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Marquer posé
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      </Link>

      {isOverdue && (
        <div className="bg-amber-soft border-t border-amber/20 px-4 py-2 flex items-center gap-2 text-[11.5px] text-amber font-medium">
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.4} />
          Non planifiée — colis reçus depuis 5j
        </div>
      )}
    </Card>
  );
}

function PhoneMockup() {
  return (
    <div className="space-y-3">
      <p className="eyebrow mb-1">Aperçu mobile poseur</p>
      <div className="rounded-[34px] bg-ink p-2 mx-auto" style={{ maxWidth: 320 }}>
        <div className="relative rounded-[26px] overflow-hidden bg-white aspect-[9/19]">
          {/* Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 h-5 w-24 rounded-full bg-ink" />
          {/* Status bar */}
          <div className="absolute top-0 left-0 right-0 z-20 px-6 pt-2.5 pb-1.5 flex items-center justify-between text-[10.5px] text-ink font-semibold">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <Wifi className="h-3 w-3" strokeWidth={2.4} />
              <Battery className="h-3 w-3" strokeWidth={2.4} />
            </div>
          </div>

          {/* Content */}
          <div className="absolute inset-x-0 top-10 bottom-0 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-line">
              <p className="text-[10.5px] text-muted-2 font-semibold tracking-wider uppercase">
                Mes interventions
              </p>
              <p className="text-[18px] font-semibold text-ink leading-tight">
                Aujourd'hui · 2 poses
              </p>
            </div>

            {/* Today's pose card */}
            <div className="px-4 py-3 space-y-2.5 flex-1 overflow-hidden">
              <div className="rounded-xl border border-line p-3">
                <div className="flex items-center gap-2 mb-2">
                  <LetterAvatar initial="A" tone="green" size="sm" />
                  <p className="text-[12px] font-semibold text-ink leading-tight">M. Audebert</p>
                  <StatusPill tone="emerald" dot={false} className="ml-auto !text-[9.5px] !px-1.5">
                    Conf.
                  </StatusPill>
                </div>
                <p className="text-[10.5px] text-muted-2 leading-tight mb-1.5 flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5" />
                  Cestas
                </p>
                <p className="text-[10.5px] text-ink-2 leading-snug mb-2">
                  4 rideaux + 2 voilages
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-line">
                  <p className="text-[10.5px] font-mono text-muted-2">09:30 · 3h</p>
                  <div className="flex gap-1">
                    <span className="h-6 w-6 rounded bg-emerald-soft inline-flex items-center justify-center">
                      <Phone className="h-3 w-3 text-emerald" strokeWidth={2.4} />
                    </span>
                    <span className="h-6 w-6 rounded bg-blue-soft inline-flex items-center justify-center">
                      <Navigation className="h-3 w-3 text-blue" strokeWidth={2.4} />
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-line p-3">
                <div className="flex items-center gap-2 mb-2">
                  <LetterAvatar initial="C" tone="yellow" size="sm" />
                  <p className="text-[12px] font-semibold text-ink leading-tight">Mme Coppola</p>
                  <StatusPill tone="blue" dot={false} className="ml-auto !text-[9.5px] !px-1.5">
                    Planif.
                  </StatusPill>
                </div>
                <p className="text-[10.5px] text-muted-2 leading-tight mb-1.5 flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5" />
                  Bordeaux 33200
                </p>
                <p className="text-[10.5px] text-ink-2 leading-snug">
                  2 rideaux occultants
                </p>
              </div>

              {/* CTA pose effectuée */}
              <button className="w-full h-9 rounded-lg bg-ink text-white text-[12px] font-semibold inline-flex items-center justify-center gap-1.5">
                <Camera className="h-3.5 w-3.5" strokeWidth={2.4} />
                Pose effectuée + photo
              </button>
            </div>

            {/* Bottom tab bar */}
            <div className="border-t border-line h-12 flex items-center justify-around px-4">
              <div className="flex flex-col items-center gap-0.5">
                <Wrench className="h-4 w-4 text-ink" strokeWidth={2.4} />
                <span className="text-[8.5px] font-semibold text-ink">Poses</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <Calendar className="h-4 w-4 text-muted-2" strokeWidth={2} />
                <span className="text-[8.5px] text-muted">Planning</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <CheckCircle2 className="h-4 w-4 text-muted-2" strokeWidth={2} />
                <span className="text-[8.5px] text-muted">Historique</span>
              </div>
            </div>
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-24 rounded-full bg-ink/60" />
        </div>
      </div>

      <Card className="p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <ColorChip tone="emerald" size="sm">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.4} />
          </ColorChip>
          <p className="text-[12.5px] font-semibold text-ink">App poseur autonome</p>
        </div>
        <ul className="space-y-1.5 text-[11.5px] text-muted">
          <li className="flex items-start gap-1.5"><span className="text-emerald mt-0.5">✓</span><span>Mes interventions du jour</span></li>
          <li className="flex items-start gap-1.5"><span className="text-emerald mt-0.5">✓</span><span>SMS / appel direct depuis l'app</span></li>
          <li className="flex items-start gap-1.5"><span className="text-emerald mt-0.5">✓</span><span>Photo + signature à la pose</span></li>
          <li className="flex items-start gap-1.5"><span className="text-emerald mt-0.5">✓</span><span>Navigation GPS intégrée</span></li>
        </ul>
      </Card>
    </div>
  );
}
