"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ScanLine,
  QrCode,
  Camera,
  CheckCircle2,
  Package,
  Search,
  Clock,
  AlertTriangle,
  ArrowRight,
  Smartphone,
  Wifi,
  Battery,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import { dossiers } from "@/lib/mock-data";
import { shortDate, time } from "@/lib/formatters";

const today = new Date();
const recentScans = [
  { qr: "QR-A1", label: "Casamance Saumon — 12m", supplier: "Casamance", dossier: "DOS-2026-0142", client: "Mme Larochelle", at: new Date(today.getTime() - 1000 * 60 * 35), op: "Camille" },
  { qr: "QR-A2", label: "Doublure occultante — 8m", supplier: "Linder", dossier: "DOS-2026-0142", client: "Mme Larochelle", at: new Date(today.getTime() - 1000 * 60 * 60 * 2), op: "Camille" },
  { qr: "QR-B1", label: "Linder Velours Mohair — 14m", supplier: "Linder", dossier: "DOS-2026-0137", client: "M. Audebert", at: new Date(today.getTime() - 1000 * 60 * 60 * 5), op: "Théo" },
  { qr: "QR-A4", label: "Embouts laiton brossé", supplier: "Interstil", dossier: "DOS-2026-0142", client: "Mme Larochelle", at: new Date(today.getTime() - 1000 * 60 * 60 * 26), op: "Camille" },
];

const pending = dossiers
  .flatMap((d) =>
    d.items
      .filter((i) => i.status === "commande" || i.status === "en_attente")
      .map((i) => ({ ...i, dossier: d.number, client: d.client }))
  )
  .slice(0, 6);

export default function ReceptionPage() {
  const [query, setQuery] = useState("");
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
            1 QR code par ligne de commande. Caméra mobile ou pistolet USB. Le statut du dossier se met à jour automatiquement.
            <strong className="text-ink font-medium"> SMS client envoyé dès que tout est reçu.</strong>
          </p>
        </section>

        <section className="px-8 pb-10 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">
          {/* LEFT — phone mockup with scanner */}
          <div className="space-y-4 sticky top-20">
            <PhoneScanner />

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <ColorChip tone="violet" size="sm">
                  <Smartphone className="h-3.5 w-3.5" strokeWidth={2.4} />
                </ColorChip>
                <h3 className="text-[13px] font-semibold text-ink">Outils de scan</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-canvas-2/40 text-[12px]">
                  <span className="text-ink-2">📷 Caméra mobile / tablette</span>
                  <StatusPill tone="emerald" dot={false}>Actif</StatusPill>
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-canvas-2/40 text-[12px]">
                  <span className="text-ink-2">🔫 Pistolet USB / Bluetooth</span>
                  <StatusPill tone="emerald" dot={false}>Connecté</StatusPill>
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-canvas-2/40 text-[12px]">
                  <span className="text-ink-2">⌨️ Saisie manuelle code</span>
                  <span className="text-muted text-[11.5px]">Fallback</span>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT — KPIs + lists */}
          <div className="space-y-4 min-w-0">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat label="À scanner" value={String(pending.length)} tone="amber" sub="aujourd'hui" icon={Package} />
              <MiniStat label="Scannés ce jour" value="4" tone="emerald" sub="2 dossiers" icon={CheckCircle2} />
              <MiniStat label="En retard fournisseur" value="2" tone="pink" sub="6j+ d'attente" icon={AlertTriangle} />
              <MiniStat label="Dossiers prêts" value="1" tone="violet" sub="après ce scan" icon={QrCode} />
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Chercher un QR (QR-A1, QR-B3…) ou un dossier"
                className="pl-9 rounded-full bg-white"
              />
            </div>

            {/* Pending receptions */}
            <Card className="overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
                <div>
                  <p className="eyebrow mb-1">En attente de réception</p>
                  <h3 className="text-[15px] font-semibold text-ink">À scanner</h3>
                </div>
                <span className="inline-flex items-center justify-center h-6 px-2 rounded-full bg-amber-soft text-amber text-[11px] font-semibold">
                  {pending.length}
                </span>
              </div>
              <div className="divide-y divide-line">
                {pending.map((p) => {
                  const initial = p.client.includes(",")
                    ? (p.client.split(",")[1].trim()[0] ?? p.client[0])
                    : p.client[0];
                  return (
                    <div key={p.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-canvas-2/30 transition-colors group">
                      <div className="h-10 w-10 rounded-md bg-canvas-2 border border-line inline-flex items-center justify-center shrink-0">
                        <QrCode className="h-4.5 w-4.5 text-ink-3" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-ink leading-tight truncate">
                          {p.label}
                        </p>
                        <p className="text-[11.5px] text-muted mt-0.5 truncate">
                          <span className="font-mono">{p.qrCode}</span>
                          <span className="text-muted-2 mx-1.5">·</span>
                          {p.supplier}
                        </p>
                      </div>
                      <div className="hidden md:flex items-center gap-2 shrink-0">
                        <LetterAvatar initial={initial} tone={toneFor(p.client)} size="sm" />
                        <div className="leading-tight">
                          <p className="text-[12px] font-medium text-ink-2 truncate max-w-[140px]">
                            {p.client}
                          </p>
                          <p className="ref">{p.dossier}</p>
                        </div>
                      </div>
                      <Button variant="primary" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="h-3.5 w-3.5" strokeWidth={2.4} />
                        Scanner
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Recent scans */}
            <Card className="overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-line">
                <div>
                  <p className="eyebrow mb-1">Aujourd'hui</p>
                  <h3 className="text-[15px] font-semibold text-ink">Réceptions récentes</h3>
                </div>
                <Link href="#" className="text-[12px] text-violet hover:underline font-medium inline-flex items-center gap-1">
                  Historique <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y divide-line">
                {recentScans.map((s) => (
                  <div key={s.qr} className="px-5 py-3.5 flex items-center gap-3">
                    <ColorChip tone="emerald" size="md">
                      <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />
                    </ColorChip>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-ink leading-tight truncate">
                        {s.label}
                      </p>
                      <p className="text-[11.5px] text-muted mt-0.5 truncate">
                        <span className="font-mono">{s.qr}</span>
                        <span className="text-muted-2 mx-1.5">·</span>
                        {s.client}
                        <span className="text-muted-2 mx-1.5">·</span>
                        <span className="font-mono">{s.dossier}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11.5px] text-muted-2 font-mono">
                        {time(s.at)}
                      </p>
                      <p className="ref">{s.op}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </>
  );
}

function PhoneScanner() {
  return (
    <div className="rounded-[34px] bg-ink p-2 mx-auto" style={{ maxWidth: 320 }}>
      <div className="relative rounded-[26px] overflow-hidden bg-canvas-2 aspect-[9/19]">
        {/* Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 h-5 w-24 rounded-full bg-ink" />
        {/* Status bar */}
        <div className="absolute top-0 left-0 right-0 z-20 px-6 pt-2.5 pb-1.5 flex items-center justify-between text-[10.5px] text-white font-semibold">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <Wifi className="h-3 w-3" strokeWidth={2.4} />
            <Battery className="h-3 w-3" strokeWidth={2.4} />
          </div>
        </div>

        {/* Camera viewfinder mockup */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(at 50% 50%, #1f2937 0%, #0f172a 60%, #000 100%)",
          }}
        />

        {/* Scan square */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="relative h-44 w-44 rounded-2xl">
            {/* Corners */}
            <div className="absolute top-0 left-0 h-8 w-8 border-t-2 border-l-2 border-emerald rounded-tl-xl" />
            <div className="absolute top-0 right-0 h-8 w-8 border-t-2 border-r-2 border-emerald rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-emerald rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-emerald rounded-br-xl" />
            {/* Scan line */}
            <div
              className="absolute left-2 right-2 h-0.5 bg-emerald shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse-soft"
              style={{ top: "50%" }}
            />
            {/* QR mockup */}
            <div className="absolute inset-6 grid grid-cols-7 grid-rows-7 gap-0.5 opacity-30">
              {Array.from({ length: 49 }).map((_, i) => (
                <span
                  key={i}
                  className={
                    "rounded-[1px] " + (Math.random() > 0.5 ? "bg-emerald" : "bg-transparent")
                  }
                />
              ))}
            </div>
          </div>
        </div>

        {/* Top label */}
        <div className="absolute top-12 left-0 right-0 z-20 text-center">
          <p className="text-[11px] text-white/70 font-medium uppercase tracking-wider">
            Placez le QR dans le cadre
          </p>
        </div>

        {/* Bottom label */}
        <div className="absolute bottom-32 left-4 right-4 z-20">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3">
            <p className="text-[10.5px] text-white/70 font-mono mb-1">Dernier scanné</p>
            <p className="text-[13px] text-white font-semibold leading-tight">
              Casamance Saumon — 12m
            </p>
            <p className="text-[10.5px] text-white/70 mt-0.5 font-mono">
              QR-A1 · DOS-2026-0142
            </p>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-8 flex items-center justify-around">
          <button className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-md inline-flex items-center justify-center">
            <Clock className="h-4 w-4 text-white" strokeWidth={2.4} />
          </button>
          <button className="h-16 w-16 rounded-full bg-white inline-flex items-center justify-center shadow-lg">
            <div className="h-12 w-12 rounded-full bg-white border-4 border-white ring-2 ring-ink/20" />
          </button>
          <button className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-md inline-flex items-center justify-center">
            <ScanLine className="h-4 w-4 text-white" strokeWidth={2.4} />
          </button>
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 h-1 w-24 rounded-full bg-white/60" />
      </div>
    </div>
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
        <p className="text-[11.5px] text-muted-2 font-medium uppercase tracking-wider">
          {label}
        </p>
        <p className="text-[22px] font-semibold text-ink leading-tight tabular-nums mt-0.5">
          {value}
        </p>
        {sub && <p className="text-[11px] text-muted mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}
