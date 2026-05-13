"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  ArrowUpDown,
  Calendar,
  TrendingUp,
  MoreHorizontal,
  Filter,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { StatusPill, ColorChip } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import { devisList, channelLabels, Channel } from "@/lib/mock-data";
import { eur, shortDate } from "@/lib/formatters";

type ClientRow = {
  name: string;
  city: string;
  email: string;
  phone: string;
  channel: Channel;
  devisCount: number;
  commandesCount: number;
  totalSpent: number;
  lastActivity: Date;
  since: number; // year
};

function buildClients(): ClientRow[] {
  const map = new Map<string, ClientRow>();
  devisList.forEach((d) => {
    const ex = map.get(d.client.name);
    if (ex) {
      ex.devisCount += 1;
      if (d.status === "valide" || d.status === "acompte_recu") ex.commandesCount += 1;
      ex.totalSpent += d.status === "acompte_recu" || d.status === "valide" ? d.totalTTC : 0;
      if (d.updatedAt > ex.lastActivity) ex.lastActivity = d.updatedAt;
    } else {
      map.set(d.client.name, {
        name: d.client.name,
        city: d.client.city,
        email: d.client.email,
        phone: phoneFor(d.client.name),
        channel: d.channel,
        devisCount: 1,
        commandesCount: d.status === "valide" || d.status === "acompte_recu" ? 1 : 0,
        totalSpent: d.status === "acompte_recu" || d.status === "valide" ? d.totalTTC : 0,
        lastActivity: d.updatedAt,
        since: 2022 + Math.floor(Math.random() * 4),
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
}

function phoneFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const a = String(Math.abs(h) % 90 + 10);
  const b = String(Math.abs(h * 13) % 90 + 10);
  const c = String(Math.abs(h * 17) % 90 + 10);
  const d = String(Math.abs(h * 23) % 90 + 10);
  return `06 ${a} ${b} ${c} ${d}`;
}

const channelTones: Record<Channel, "violet" | "orange" | "blue" | "pink" | "emerald"> = {
  magasin: "violet",
  leroy_merlin: "orange",
  ecommerce: "blue",
  decoratrice: "pink",
  visio: "emerald",
};

export default function ClientsPage() {
  const allClients = useMemo(() => buildClients(), []);
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<"all" | Channel>("all");

  const filtered = allClients.filter((c) => {
    if (channel !== "all" && c.channel !== channel) return false;
    if (query) {
      const q = query.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q);
    }
    return true;
  });

  const totalRevenu = allClients.reduce((acc, c) => acc + c.totalSpent, 0);
  const avgBasket = allClients.length > 0 ? totalRevenu / allClients.filter((c) => c.commandesCount > 0).length || 0 : 0;
  const channelBreakdown = allClients.reduce((acc, c) => {
    acc[c.channel] = (acc[c.channel] ?? 0) + 1;
    return acc;
  }, {} as Record<Channel, number>);

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Clients" },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Filter className="h-3.5 w-3.5" strokeWidth={2.2} /> Filtres
            </Button>
            <Button variant="primary" size="sm">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Nouveau client
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Fiches clients · CRM intégré</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1] mb-2">
            Vos clients
            <span className="ml-3 text-[24px] text-muted-2 font-semibold tabular-nums">
              {allClients.length}
            </span>
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl">
            Chaque client garde son historique complet : devis, commandes, poses, paiements.
            <strong className="text-ink font-medium"> Source du lead suivie de bout en bout.</strong>
          </p>
        </section>

        {/* KPIs */}
        <section className="px-8 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="Clients actifs" value={allClients.length.toString()} sub="9 derniers mois" tone="violet" icon={Users} />
            <MiniStat label="CA total" value={eur(totalRevenu, true)} sub={`${allClients.filter((c) => c.commandesCount > 0).length} ont commandé`} tone="emerald" icon={TrendingUp} />
            <MiniStat label="Panier moyen" value={eur(avgBasket || 0, true)} sub="par commande" tone="amber" icon={TrendingUp} />
            <MiniStat label="Leroy Merlin" value={String(channelBreakdown.leroy_merlin ?? 0)} sub={`${Math.round(((channelBreakdown.leroy_merlin ?? 0) / allClients.length) * 100)}% des leads`} tone="orange" icon={Users} />
          </div>
        </section>

        {/* Filters */}
        <section className="px-8 pb-4 flex items-center justify-between gap-4 flex-wrap">
          <nav className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setChannel("all")}
              className={
                "h-8 px-3 rounded-full text-[12.5px] font-medium transition-all " +
                (channel === "all" ? "bg-ink text-white" : "bg-white text-muted hover:text-ink border border-line")
              }
            >
              Tous
            </button>
            {(Object.keys(channelLabels) as Channel[]).map((c) => (
              <button
                key={c}
                onClick={() => setChannel(c)}
                className={
                  "h-8 px-3 rounded-full text-[12.5px] font-medium transition-all inline-flex items-center gap-1.5 " +
                  (channel === c ? "bg-ink text-white" : "bg-white text-muted hover:text-ink border border-line")
                }
              >
                <span className={`h-1.5 w-1.5 rounded-full bg-${channelTones[c]}`} />
                {channelLabels[c]}
              </button>
            ))}
          </nav>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, ville…"
              className="pl-9 w-72 text-[12.5px] rounded-full bg-white"
            />
          </div>
        </section>

        {/* Table */}
        <section className="px-8 pb-10">
          <div className="bg-white border border-line rounded-2xl overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-canvas-2/40 border-b border-line">
                  <Th sortable>Client</Th>
                  <Th>Source</Th>
                  <Th>Coordonnées</Th>
                  <Th align="right" sortable>Devis</Th>
                  <Th align="right" sortable>Commandes</Th>
                  <Th align="right" sortable>CA</Th>
                  <Th align="right" sortable>Dernière activité</Th>
                  <th className="w-10 px-4 py-2.5" aria-hidden></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const initial = c.name.includes(",")
                    ? (c.name.split(",")[1].trim()[0] ?? c.name[0])
                    : c.name[0];
                  const firstDevis = devisList.find((d) => d.client.name === c.name);
                  const clientId = firstDevis?.id ?? "1";
                  return (
                    <tr key={c.name} className="border-b border-line last:border-0 hover:bg-canvas-2/30 transition-colors group">
                      <td className="px-4 py-3">
                        <Link href={`/clients/${clientId}`} className="flex items-center gap-2.5 group/link">
                          <LetterAvatar initial={initial} tone={toneFor(c.name)} size="md" />
                          <div>
                            <p className="font-semibold text-ink leading-tight group-hover/link:underline decoration-line-strong">
                              {c.name}
                            </p>
                            <p className="ref mt-0.5">{c.city} · client depuis {c.since}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill tone={channelTones[c.channel]} dot={false}>
                          {channelLabels[c.channel]}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3 text-[11.5px] text-muted">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-muted-2" />
                          <span className="truncate max-w-[180px]">{c.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Phone className="h-3 w-3 text-muted-2" />
                          <span className="font-mono tabular-nums">{c.phone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-[13px] font-semibold text-ink tabular-nums">{c.devisCount}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-[13px] font-semibold text-ink tabular-nums">{c.commandesCount}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-[13px] font-semibold text-ink tabular-nums">{c.totalSpent > 0 ? eur(c.totalSpent, true) : "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-[12px] text-muted tabular-nums">{shortDate(c.lastActivity)}</p>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-2 hover:text-ink h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-canvas-2">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="bg-canvas-2/40 border-t border-line px-4 py-2.5 flex items-center justify-between text-[12px] text-muted">
              <span>
                <span className="font-semibold text-ink tabular-nums">{filtered.length}</span> client{filtered.length > 1 ? "s" : ""}
                <span className="text-muted-2 mx-1.5">·</span>
                <span className="font-semibold text-ink tabular-nums">{eur(filtered.reduce((a, c) => a + c.totalSpent, 0), true)}</span> CA cumulé
              </span>
              <span className="text-muted-2">Page 1 sur 1</span>
            </div>
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
  tone: "violet" | "emerald" | "amber" | "blue" | "pink" | "orange";
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
        <p className="text-[22px] font-semibold text-ink leading-tight tabular-nums mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-muted mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

function Th({
  children,
  align = "left",
  sortable = false,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  sortable?: boolean;
}) {
  return (
    <th
      className={
        "px-4 py-2.5 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2 " +
        (align === "right" ? "text-right" : "text-left")
      }
    >
      <span
        className={
          "inline-flex items-center gap-1 " + (sortable ? "cursor-pointer hover:text-ink-2" : "")
        }
      >
        {children}
        {sortable && <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </span>
    </th>
  );
}
