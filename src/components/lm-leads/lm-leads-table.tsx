"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Mail, Phone, MapPin, Send, Loader2, Bell } from "lucide-react";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { Input } from "@/components/ui/input";
import { LetterAvatar, toneFor } from "@/components/ui/letter-avatar";
import { eur } from "@/lib/formatters";
import type { LmLeadWithClient, LeadStatus } from "@/lib/db/lm-leads";
import { triggerLeadAlertAction } from "@/app/(platform)/leads-lm/actions";

const statusTone: Record<LeadStatus, StatusTone> = {
  nouveau: "blue",
  visio_planifie: "amber",
  echantillons: "violet",
  devis_envoye: "orange",
  valide: "emerald",
  perdu: "danger",
};

const statusLabel: Record<LeadStatus, string> = {
  nouveau: "Nouveau",
  visio_planifie: "Visio planifiée",
  echantillons: "Échantillons",
  devis_envoye: "Devis envoyé",
  valide: "Validé",
  perdu: "Perdu",
};

const allStatuses: LeadStatus[] = [
  "nouveau",
  "visio_planifie",
  "echantillons",
  "devis_envoye",
  "valide",
  "perdu",
];

function shortDate(d: string | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(
    new Date(d),
  );
}

function initialFor(name: string) {
  if (!name) return "?";
  if (name.includes(",")) return name.split(",")[1]?.trim()[0] ?? name[0];
  return name[0];
}

export function LmLeadsTable({
  initialLeads,
  statusCounts,
}: {
  initialLeads: LmLeadWithClient[];
  statusCounts: Record<LeadStatus, number>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | LeadStatus>("all");

  const filtered = useMemo(() => {
    return initialLeads.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          l.number.toLowerCase().includes(q) ||
          l.region.toLowerCase().includes(q) ||
          l.product_summary.toLowerCase().includes(q) ||
          (l.clients?.display_name.toLowerCase().includes(q) ?? false) ||
          (l.clients?.city?.toLowerCase().includes(q) ?? false) ||
          (l.clients?.email?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [initialLeads, status, query]);

  return (
    <>
      <section className="px-8 pb-4 flex items-center justify-between gap-4 flex-wrap">
        <nav className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setStatus("all")}
            className={
              "h-8 px-3 rounded-full text-[12.5px] font-medium transition-all " +
              (status === "all"
                ? "bg-ink text-white"
                : "bg-white text-muted hover:text-ink border border-line")
            }
          >
            Tous · {initialLeads.length}
          </button>
          {allStatuses.map((s) => {
            const n = statusCounts[s];
            if (!n) return null;
            return (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={
                  "h-8 px-3 rounded-full text-[12.5px] font-medium transition-all inline-flex items-center gap-1.5 " +
                  (status === s
                    ? "bg-ink text-white"
                    : "bg-white text-muted hover:text-ink border border-line")
                }
              >
                <span
                  className={
                    "h-1.5 w-1.5 rounded-full " +
                    (s === "nouveau"
                      ? "bg-blue"
                      : s === "visio_planifie"
                        ? "bg-amber"
                        : s === "echantillons"
                          ? "bg-violet"
                          : s === "devis_envoye"
                            ? "bg-orange"
                            : s === "valide"
                              ? "bg-emerald"
                              : "bg-red")
                  }
                />
                {statusLabel[s]} · {n}
              </button>
            );
          })}
        </nav>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2 pointer-events-none" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Recherche : numéro, nom, magasin, ville…"
            className="pl-9 w-[320px]"
          />
        </div>
      </section>

      <section className="px-8 pb-10">
        <div className="card overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line bg-canvas-2/40 text-left">
                <th className="px-5 py-2.5 eyebrow w-[140px]">N°</th>
                <th className="px-5 py-2.5 eyebrow">Client</th>
                <th className="px-5 py-2.5 eyebrow">Magasin LM</th>
                <th className="px-5 py-2.5 eyebrow">Produit</th>
                <th className="px-5 py-2.5 eyebrow text-right">Montant</th>
                <th className="px-5 py-2.5 eyebrow">Statut</th>
                <th className="px-5 py-2.5 eyebrow">Reçu</th>
                <th className="px-5 py-2.5 eyebrow text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const c = l.clients;
                const name = c?.display_name ?? "—";
                return (
                  <tr
                    key={l.id}
                    className="border-b border-line/60 last:border-0 hover:bg-canvas-2/30 transition-colors"
                  >
                    <td className="px-5 py-3 align-top">
                      <div className="font-mono text-[11.5px] text-muted">{l.number}</div>
                      {l.notes && l.notes.includes("Atmolead ref") && (
                        <div className="mt-0.5 font-mono text-[10.5px] text-muted-2">
                          {l.notes.split("·")[0]?.replace("Atmolead ref:", "").trim()}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 align-top">
                      <div className="flex items-center gap-2.5">
                        <LetterAvatar
                          tone={toneFor(name)}
                          size="sm"
                          initial={initialFor(name).toUpperCase()}
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-ink truncate">{name}</div>
                          {(c?.email || c?.phone) && (
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-muted">
                              {c?.email && (
                                <span className="inline-flex items-center gap-1">
                                  <Mail className="h-3 w-3" /> {c.email}
                                </span>
                              )}
                              {c?.phone && (
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="h-3 w-3" /> {c.phone}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 align-top">
                      <div className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-2" /> {l.region}
                      </div>
                      {c?.postal_code && (
                        <div className="mt-0.5 text-[11px] text-muted">
                          {c.postal_code} {c.city}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 align-top max-w-xs">
                      <span className="text-[12.5px] text-ink-2" title={l.product_summary}>
                        {l.product_summary}
                      </span>
                    </td>
                    <td className="px-5 py-3 align-top text-right">
                      {l.amount ? (
                        <span className="font-medium tabular-nums text-ink">
                          {eur(Number(l.amount))}
                        </span>
                      ) : (
                        <span className="text-muted-2">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 align-top">
                      <StatusPill tone={statusTone[l.status]}>{statusLabel[l.status]}</StatusPill>
                    </td>
                    <td className="px-5 py-3 align-top text-[11.5px] text-muted">
                      {shortDate(l.created_at)}
                    </td>
                    <td className="px-5 py-3 align-top text-right">
                      <TriggerAlertButton leadId={l.id} leadNumber={l.number} />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-[13px] text-muted">
                    Aucun lead pour ce filtre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function TriggerAlertButton({ leadId, leadNumber }: { leadId: string; leadNumber: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    | { ok: true; summary: string; alreadyProcessed?: boolean }
    | { ok: false; message: string }
    | null
  >(null);

  const send = (force = false) => {
    setResult(null);
    startTransition(async () => {
      const r = await triggerLeadAlertAction(leadId, { force });
      if (!r.ok) {
        setResult({ ok: false, message: r.message });
        return;
      }
      if (r.alreadyProcessed) {
        setResult({
          ok: true,
          alreadyProcessed: true,
          summary: "Déjà traité — clique à nouveau pour forcer le renvoi",
        });
        return;
      }
      const parts: string[] = [];
      if (r.smsFired) {
        parts.push(r.smsOk ? "SMS ✓" : `SMS ✗ (${r.smsMessage ?? "?"})`);
      } else if (r.smsMessage) {
        parts.push(`SMS · ${r.smsMessage}`);
      }
      if (r.emailFired) {
        parts.push(r.emailOk ? "Email ✓" : `Email ✗ (${r.emailMessage ?? "?"})`);
      } else if (r.emailMessage) {
        parts.push(`Email · ${r.emailMessage}`);
      }
      if (r.alertsMatched > 0)
        parts.push(`${r.alertsMatched} alerte(s) → ${r.alertsSent.sms} SMS, ${r.alertsSent.email} email`);
      const summary = parts.length > 0 ? parts.join(" · ") : "Aucune règle Architecture";
      setResult({ ok: true, summary });
    });
  };

  // Si le résultat précédent dit "déjà traité", un 2e clic force le renvoi.
  const isForceState = result?.ok && result.alreadyProcessed;

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        onClick={() => send(isForceState ?? false)}
        disabled={pending}
        title={
          isForceState
            ? `Forcer le renvoi pour ${leadNumber}`
            : `Envoyer alertes/SMS/email configurés pour ${leadNumber}`
        }
        className={
          "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-white text-[11.5px] font-semibold transition-colors disabled:opacity-50 " +
          (isForceState ? "bg-amber hover:bg-amber/90" : "bg-violet hover:bg-violet/90")
        }
      >
        {pending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Bell className="h-3 w-3" strokeWidth={2.4} />
        )}
        {isForceState ? "Forcer renvoi" : "Déclencher"}
      </button>
      {result && (
        <p
          className={
            "text-[10.5px] text-right max-w-[200px] leading-tight " +
            (result.ok ? (result.alreadyProcessed ? "text-amber" : "text-emerald") : "text-pink")
          }
        >
          {result.ok ? result.summary : `✗ ${result.message}`}
        </p>
      )}
    </div>
  );
}
