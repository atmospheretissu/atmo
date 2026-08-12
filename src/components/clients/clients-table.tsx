"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Search,
  Mail,
  Phone,
  ArrowUpDown,
  MoreHorizontal,
} from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { Input } from "@/components/ui/input";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import { eur } from "@/lib/formatters";
import { channelLabels, type Channel } from "@/lib/validation/client";
import type { Client } from "@/lib/db/clients";

const channelTones: Record<Channel, "violet" | "orange" | "blue" | "pink" | "emerald"> = {
  magasin: "violet",
  leroy_merlin: "orange",
  saint_maclou: "orange",
  ecommerce: "blue",
  decoratrice: "pink",
  visio: "emerald",
};

function shortDate(d: string | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(d));
}

function initialFor(name: string) {
  if (name.includes(",")) return name.split(",")[1].trim()[0] ?? name[0];
  return name[0];
}

export function ClientsTable({ initialClients }: { initialClients: Client[] }) {
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<"all" | Channel>("all");

  const filtered = useMemo(() => {
    return initialClients.filter((c) => {
      if (channel !== "all" && c.channel !== channel) return false;
      if (query) {
        const q = query.toLowerCase().trim();
        if (!q) return true;
        const norm = (s: string) => s.replace(/[\s.+\-/()]/g, "").toLowerCase();
        return (
          c.display_name.toLowerCase().includes(q) ||
          (c.city?.toLowerCase().includes(q) ?? false) ||
          (c.email?.toLowerCase().includes(q) ?? false) ||
          (c.phone ? norm(c.phone).includes(norm(query)) : false)
        );
      }
      return true;
    });
  }, [initialClients, channel, query]);

  return (
    <>
      {/* Filters */}
      <section className="px-8 pb-4 flex items-center justify-between gap-4 flex-wrap">
        <nav className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setChannel("all")}
            className={
              "h-8 px-3 rounded-full text-[12.5px] font-medium transition-all " +
              (channel === "all"
                ? "bg-ink text-white"
                : "bg-white text-muted hover:text-ink border border-line")
            }
          >
            Tous · {initialClients.length}
          </button>
          {(Object.keys(channelLabels) as Channel[]).map((c) => (
            <button
              key={c}
              onClick={() => setChannel(c)}
              className={
                "h-8 px-3 rounded-full text-[12.5px] font-medium transition-all inline-flex items-center gap-1.5 " +
                (channel === c
                  ? "bg-ink text-white"
                  : "bg-white text-muted hover:text-ink border border-line")
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
            placeholder="Nom, email, téléphone, ville…"
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
                <Th>Ville</Th>
                <Th align="right" sortable>Créé</Th>
                <Th align="right" sortable>Modifié</Th>
                <th className="w-10 px-4 py-2.5" aria-hidden></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const initial = initialFor(c.display_name);
                return (
                  <tr key={c.id} className="border-b border-line last:border-0 hover:bg-canvas-2/30 transition-colors group">
                    <td className="px-4 py-3">
                      <Link href={`/clients/${c.id}`} className="flex items-center gap-2.5 group/link">
                        <LetterAvatar initial={initial} tone={toneFor(c.display_name)} size="md" />
                        <div>
                          <p className="font-semibold text-ink leading-tight group-hover/link:underline decoration-line-strong">
                            {c.display_name}
                          </p>
                          <p className="ref mt-0.5">
                            {c.created_at ? `créé ${shortDate(c.created_at)}` : "—"}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={channelTones[c.channel as Channel]} dot={false}>
                        {channelLabels[c.channel as Channel]}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-[11.5px] text-muted">
                      {c.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-muted-2" />
                          <span className="truncate max-w-[180px]">{c.email}</span>
                        </div>
                      )}
                      {c.phone && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Phone className="h-3 w-3 text-muted-2" />
                          <span className="font-mono tabular-nums">{c.phone}</span>
                        </div>
                      )}
                      {!c.email && !c.phone && <span className="text-muted-2">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-ink-2">
                      {c.city ?? <span className="text-muted-2">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-[12px] text-muted tabular-nums">{shortDate(c.created_at)}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-[12px] text-muted tabular-nums">{shortDate(c.updated_at)}</p>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <Link
                        href={`/clients/${c.id}`}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-2 hover:text-ink h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-canvas-2"
                        aria-label="Plus"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[12.5px] text-muted-2">
                    Aucun résultat pour ce filtre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="bg-canvas-2/40 border-t border-line px-4 py-2.5 flex items-center justify-between text-[12px] text-muted">
            <span>
              <span className="font-semibold text-ink tabular-nums">{filtered.length}</span> client{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
              {filtered.length !== initialClients.length && (
                <span className="text-muted-2 ml-1">sur {initialClients.length}</span>
              )}
            </span>
            <span className="text-muted-2">Page 1 sur 1</span>
          </div>
        </div>
      </section>
    </>
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
