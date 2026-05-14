"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ExternalLink, Mail, Phone, Truck, Loader2, Globe, Power } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ColorChip, StatusPill } from "@/components/ui/status-pill";
import {
  createSupplierAction,
  updateSupplierAction,
  toggleSupplierActiveAction,
  deleteSupplierAction,
} from "@/app/(platform)/parametres/actions";
import type { Supplier } from "@/lib/db/suppliers";
import { eur } from "@/lib/formatters";

type Lang = "FR" | "DE" | "PL" | "UA";
type Type = "tissu" | "rail" | "accessoire" | "autre";

const TYPE_LABELS: Record<Type, string> = {
  tissu: "Tissu",
  rail: "Rail / Mécanisme",
  accessoire: "Accessoire",
  autre: "Autre",
};

const TYPE_TONES: Record<Type, "violet" | "blue" | "pink" | "orange"> = {
  tissu: "violet",
  rail: "blue",
  accessoire: "pink",
  autre: "orange",
};

const FLAGS: Record<string, string> = { FR: "🇫🇷", DE: "🇩🇪", PL: "🇵🇱", UA: "🇺🇦" };

type Draft = {
  name: string;
  type: Type;
  country: string;
  language: Lang;
  contact_email: string;
  contact_phone: string;
  franco_ht: string;
  portal_url: string;
  notes: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  type: "tissu",
  country: "FR",
  language: "FR",
  contact_email: "",
  contact_phone: "",
  franco_ht: "",
  portal_url: "",
  notes: "",
};

function toDraft(s: Supplier): Draft {
  return {
    name: s.name,
    type: s.type as Type,
    country: s.country,
    language: s.language as Lang,
    contact_email: s.contact_email ?? "",
    contact_phone: s.contact_phone ?? "",
    franco_ht: String(s.franco_ht ?? ""),
    portal_url: s.portal_url ?? "",
    notes: s.notes ?? "",
  };
}

export function SuppliersTab({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const openNew = () => {
    setDraft(EMPTY_DRAFT);
    setEditing("new");
  };

  const openEdit = (s: Supplier) => {
    setDraft(toDraft(s));
    setEditing(s.id);
  };

  const cancel = () => {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
  };

  const submit = () => {
    if (!draft.name.trim()) {
      alert("Nom requis");
      return;
    }
    startTransition(async () => {
      const payload = {
        name: draft.name,
        type: draft.type,
        country: draft.country,
        language: draft.language,
        contact_email: draft.contact_email,
        contact_phone: draft.contact_phone,
        franco_ht: Number(draft.franco_ht || 0),
        portal_url: draft.portal_url,
        notes: draft.notes,
      };
      const r =
        editing === "new"
          ? await createSupplierAction(payload)
          : await updateSupplierAction(editing as string, payload);
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      cancel();
      router.refresh();
    });
  };

  const toggle = (s: Supplier) => {
    startTransition(async () => {
      const r = await toggleSupplierActiveAction(s.id, !s.active);
      if (!r.ok) {
        alert(`Erreur : ${r.message}`);
        return;
      }
      router.refresh();
    });
  };

  const remove = (s: Supplier) => {
    if (!confirm(`Supprimer ${s.name} ?`)) return;
    startTransition(async () => {
      const r = await deleteSupplierAction(s.id);
      if (!r.ok) {
        alert(`${r.message}`);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-muted">
          Fournisseurs tissus, rails et accessoires. Utilisés pour l'auto-création des BC depuis les
          dossiers de confection.
        </p>
        <Button variant="primary" size="sm" onClick={openNew} disabled={pending || editing === "new"}>
          <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Nouveau fournisseur
        </Button>
      </div>

      {editing === "new" && (
        <SupplierForm
          draft={draft}
          setDraft={setDraft}
          onSubmit={submit}
          onCancel={cancel}
          pending={pending}
          title="Nouveau fournisseur"
        />
      )}

      {suppliers.length === 0 && editing !== "new" ? (
        <Card className="py-12 px-6 flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet to-pink text-white inline-flex items-center justify-center mb-4">
            <Truck className="h-6 w-6" strokeWidth={2} />
          </div>
          <h2 className="text-[16px] font-semibold text-ink mb-1">Aucun fournisseur</h2>
          <p className="text-[12.5px] text-muted max-w-md mb-4">
            Ajoute au moins un fournisseur par type (tissu, rail, accessoire) pour que les BC se
            créent automatiquement à l'ouverture d'un dossier.
          </p>
          <Button variant="primary" size="sm" onClick={openNew}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Ajouter un fournisseur
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {suppliers.map((s) => {
            if (editing === s.id) {
              return (
                <SupplierForm
                  key={s.id}
                  draft={draft}
                  setDraft={setDraft}
                  onSubmit={submit}
                  onCancel={cancel}
                  pending={pending}
                  title={`Modifier · ${s.name}`}
                />
              );
            }
            const t = (s.type as Type) ?? "autre";
            return (
              <Card key={s.id} className={"p-4 " + (s.active ? "" : "opacity-60")}>
                <div className="flex items-start gap-4">
                  <ColorChip tone={TYPE_TONES[t]} size="lg">
                    <Truck className="h-4 w-4" strokeWidth={2.2} />
                  </ColorChip>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[14px] font-semibold text-ink">{s.name}</p>
                      <StatusPill tone={TYPE_TONES[t]}>{TYPE_LABELS[t]}</StatusPill>
                      <span className="text-[11.5px] text-muted">
                        {FLAGS[s.country] ?? ""} {s.country} · {s.language}
                      </span>
                      {!s.active && <StatusPill tone="muted">Inactif</StatusPill>}
                    </div>
                    <div className="mt-2 flex items-center gap-4 flex-wrap text-[12px] text-muted-2">
                      {s.contact_email && (
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="h-3 w-3" /> {s.contact_email}
                        </span>
                      )}
                      {s.contact_phone && (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3 w-3" /> {s.contact_phone}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <Truck className="h-3 w-3" /> Franco : <span className="tabular-nums text-ink-2 font-medium">{eur(Number(s.franco_ht ?? 0), true)}</span>
                      </span>
                      {s.portal_url && (
                        <a
                          href={s.portal_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-violet hover:underline"
                        >
                          <Globe className="h-3 w-3" /> Portail <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                    {s.notes && (
                      <p className="mt-2 text-[12px] text-muted whitespace-pre-wrap">{s.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon-sm" aria-label={s.active ? "Désactiver" : "Réactiver"} disabled={pending} onClick={() => toggle(s)}>
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Modifier" disabled={pending} onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Supprimer" disabled={pending} onClick={() => remove(s)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SupplierForm({
  draft,
  setDraft,
  onSubmit,
  onCancel,
  pending,
  title,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSubmit: () => void;
  onCancel: () => void;
  pending: boolean;
  title: string;
}) {
  return (
    <Card className="p-5 ring-2 ring-violet-soft">
      <p className="eyebrow mb-3">{title}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <Field label="Nom *">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Casamance, Houlès, Forest…"
            autoFocus
            className="flex h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-[13.5px] text-ink placeholder:text-muted-2 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
        </Field>
        <Field label="Type *">
          <select
            value={draft.type}
            onChange={(e) => setDraft({ ...draft, type: e.target.value as Type })}
            className="flex h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-[13.5px] text-ink placeholder:text-muted-2 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          >
            <option value="tissu">Tissu</option>
            <option value="rail">Rail / Mécanisme</option>
            <option value="accessoire">Accessoire</option>
            <option value="autre">Autre</option>
          </select>
        </Field>
        <Field label="Pays *">
          <select
            value={draft.country}
            onChange={(e) => setDraft({ ...draft, country: e.target.value })}
            className="flex h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-[13.5px] text-ink placeholder:text-muted-2 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          >
            <option value="FR">🇫🇷 France</option>
            <option value="DE">🇩🇪 Allemagne</option>
            <option value="PL">🇵🇱 Pologne</option>
            <option value="UA">🇺🇦 Ukraine</option>
            <option value="IT">🇮🇹 Italie</option>
            <option value="ES">🇪🇸 Espagne</option>
            <option value="BE">🇧🇪 Belgique</option>
          </select>
        </Field>
        <Field label="Langue BC">
          <select
            value={draft.language}
            onChange={(e) => setDraft({ ...draft, language: e.target.value as Lang })}
            className="flex h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-[13.5px] text-ink placeholder:text-muted-2 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          >
            <option value="FR">Français</option>
            <option value="DE">Deutsch</option>
            <option value="PL">Polski</option>
            <option value="UA">Українська</option>
          </select>
        </Field>
        <Field label="Email contact">
          <input
            type="email"
            value={draft.contact_email}
            onChange={(e) => setDraft({ ...draft, contact_email: e.target.value })}
            placeholder="commandes@fournisseur.com"
            className="flex h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-[13.5px] text-ink placeholder:text-muted-2 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
        </Field>
        <Field label="Téléphone">
          <input
            value={draft.contact_phone}
            onChange={(e) => setDraft({ ...draft, contact_phone: e.target.value })}
            placeholder="+33 5 ..."
            className="flex h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-[13.5px] text-ink placeholder:text-muted-2 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
        </Field>
        <Field label="Franco HT (€)">
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.franco_ht}
            onChange={(e) => setDraft({ ...draft, franco_ht: e.target.value })}
            placeholder="1500"
            className="input tabular-nums"
          />
        </Field>
        <Field label="Portail fournisseur (URL)">
          <input
            type="url"
            value={draft.portal_url}
            onChange={(e) => setDraft({ ...draft, portal_url: e.target.value })}
            placeholder="https://b2b.fournisseur.com"
            className="flex h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-[13.5px] text-ink placeholder:text-muted-2 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
        </Field>
      </div>
      <Field label="Notes internes">
        <textarea
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          placeholder="Délais habituels, contact direct, conditions particulières…"
          rows={2}
          className="w-full rounded-md border border-line-strong bg-surface p-3 text-[13.5px] text-ink placeholder:text-muted-2 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 resize-y"
        />
      </Field>
      <div className="flex items-center justify-end gap-2 mt-4">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Annuler
        </Button>
        <Button variant="primary" size="sm" onClick={onSubmit} disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Enregistrer"}
        </Button>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] text-muted-2 font-semibold uppercase tracking-wider mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
