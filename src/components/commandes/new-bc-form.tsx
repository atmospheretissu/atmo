"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Loader2, Truck, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBcAction } from "@/app/(platform)/commandes/actions";

type SupplierItem = {
  id: string;
  name: string;
  type: string;
  country: string;
  language: string;
};

type DossierItem = {
  id: string;
  number: string;
  client_name: string | null;
  status: string;
};

export function NewBcForm({
  suppliers,
  dossiers,
}: {
  suppliers: SupplierItem[];
  dossiers: DossierItem[];
}) {
  const [supplierId, setSupplierId] = useState("");
  const [dossierId, setDossierId] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!supplierId) {
      setError("Choisis un fournisseur.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await createBcAction({
        supplierId,
        dossierId: dossierId || null,
        notes,
      });
      // En cas d'OK la server action redirige. Ici on n'arrive que sur erreur.
      if (r && !r.ok) setError(r.message);
    });
  };

  return (
    <div className="space-y-4">
      {suppliers.length === 0 && (
        <div className="text-[13px] text-amber bg-amber-soft/40 border border-amber/30 rounded px-3 py-2">
          Aucun fournisseur actif.{" "}
          <Link href="/parametres" className="underline font-medium">
            Configure-en un d&apos;abord →
          </Link>
        </div>
      )}

      <div>
        <label className="block text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 mb-1.5">
          Fournisseur *
        </label>
        <div className="relative">
          <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2 pointer-events-none" />
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            disabled={pending || suppliers.length === 0}
            className="w-full pl-9 h-10 rounded-md border border-line-strong bg-white px-3 text-[13.5px] text-ink focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15 appearance-none"
          >
            <option value="">— Choisir —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.type} · {s.country}/{s.language}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 mb-1.5">
          Dossier lié (optionnel)
        </label>
        <div className="relative">
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-2 pointer-events-none" />
          <select
            value={dossierId}
            onChange={(e) => setDossierId(e.target.value)}
            disabled={pending}
            className="w-full pl-9 h-10 rounded-md border border-line-strong bg-white px-3 text-[13.5px] text-ink focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15 appearance-none"
          >
            <option value="">— BC autonome (sans dossier) —</option>
            {dossiers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.number} · {d.client_name ?? "—"} ({d.status.replace(/_/g, " ")})
              </option>
            ))}
          </select>
        </div>
        {dossierId && (
          <p className="text-[11.5px] text-emerald mt-1.5 inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" strokeWidth={2.4} />
            Les lignes seront pré-remplies automatiquement depuis le devis lié.
          </p>
        )}
      </div>

      <div>
        <label className="block text-[10.5px] uppercase tracking-wider font-semibold text-muted-2 mb-1.5">
          Notes (optionnel)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Référence externe, urgence, contraintes spécifiques…"
          disabled={pending}
          className="w-full rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] text-ink resize-none focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/15"
        />
      </div>

      {error && (
        <div className="text-[12.5px] text-pink bg-pink-soft/40 border border-pink/30 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-3 border-t border-line flex-wrap">
        <p className="text-[11.5px] text-muted">
          Le BC sera créé en <strong className="text-ink">brouillon</strong> —
          tu pourras le compléter puis l&apos;envoyer plus tard.
        </p>
        <div className="flex items-center gap-2">
          <Link href="/commandes">
            <Button variant="ghost" size="md" type="button" disabled={pending}>
              Annuler
            </Button>
          </Link>
          <Button
            variant="primary"
            size="md"
            type="button"
            onClick={submit}
            disabled={pending || !supplierId || suppliers.length === 0}
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
            ) : (
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            )}
            Enregistrer le brouillon
          </Button>
        </div>
      </div>
    </div>
  );
}
