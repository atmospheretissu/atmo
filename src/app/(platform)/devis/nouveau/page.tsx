"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Sparkles,
  Send,
  Save,
  Plus,
  Trash2,
  ChevronDown,
  X,
  FileText,
  Receipt,
  Layers,
  Library,
  Zap,
  Scissors,
  Truck,
  Smartphone,
} from "lucide-react";
import { ColorChip } from "@/components/ui/status-pill";
import { Topbar } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Hint } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  tissus,
  teteRideau,
  doublures,
  rails,
} from "@/lib/mock-data";
import { eur } from "@/lib/formatters";

type RoomItem = {
  id: string;
  piece: string;
  largeur: number;
  hauteur: number;
  qty: number;
  tete: string;
  cassé: number;
  doubled: boolean;
};

const initialRooms: RoomItem[] = [
  { id: "r1", piece: "Salon · Baie vitrée", largeur: 280, hauteur: 245, qty: 2, tete: "flamand", cassé: 1, doubled: true },
  { id: "r2", piece: "Chambre parentale", largeur: 180, hauteur: 230, qty: 2, tete: "vague", cassé: 0, doubled: true },
];

export default function SimulatorPage() {
  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Devis", href: "/devis" },
          { label: "Nouveau" },
        ]}
      />
      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Simulateur · chiffrage temps réel</p>
          <div className="flex items-end justify-between gap-8 flex-wrap">
            <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1]">
              Nouveau devis
              <span className="ml-3 text-[18px] text-muted-2 font-mono tracking-wide">
                DEV-2026-0143
              </span>
            </h1>
            <div className="flex items-center gap-2">
              <StatusPill tone="amber" pulse>Brouillon · auto-enregistré</StatusPill>
              <Button variant="secondary" size="sm">
                <Save className="h-3.5 w-3.5" strokeWidth={2.2} />
                Enregistrer
              </Button>
              <Button variant="primary" size="sm">
                <Send className="h-3.5 w-3.5" strokeWidth={2.4} />
                Générer & envoyer
              </Button>
            </div>
          </div>
          <p className="text-[13.5px] text-muted mt-3 max-w-2xl">
            Configurez chaque pièce. Le prix se met à jour en temps réel. À la validation : envoi PDF, lien Stripe 50%, et déclenchement automatique de la chaîne aval.
          </p>
        </section>

        <div className="px-8 pb-10 max-w-[1400px]">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
            <div className="space-y-6 min-w-0">
              <ClientCard />
              <ProductTabs />
            </div>
            <LivePreview />
          </div>
        </div>
      </div>
    </>
  );
}

function ClientCard() {
  return (
    <Card>
      <CardHeader>
        <div>
          <p className="eyebrow">01 · Client</p>
          <CardTitle className="mt-1 text-[14px]">Fiche client</CardTitle>
        </div>
        <button className="text-[11.5px] text-accent hover:underline">
          Choisir un client existant →
        </button>
      </CardHeader>
      <div className="p-5 grid grid-cols-2 gap-4">
        <div>
          <Label>Nom complet</Label>
          <Input defaultValue="Mme Larochelle, Hélène" />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" defaultValue="h.larochelle@orange.fr" />
        </div>
        <div>
          <Label>Téléphone</Label>
          <Input defaultValue="06 12 34 56 78" />
        </div>
        <div>
          <Label>Canal d'entrée</Label>
          <Select defaultValue="magasin">
            <option value="magasin">Magasin</option>
            <option value="leroy_merlin">Leroy Merlin</option>
            <option value="visio">Visio</option>
            <option value="decoratrice">Décoratrice</option>
            <option value="ecommerce">E-commerce</option>
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Adresse de pose</Label>
          <Input defaultValue="42 cours du Maréchal Foch · 33000 Bordeaux" />
        </div>
      </div>
    </Card>
  );
}

function ProductTabs() {
  const [tab, setTab] = useState("rideau");
  return (
    <Card>
      <div className="px-5 pt-4">
        <p className="eyebrow mb-3">02 · Produit</p>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="rideau">
              <FileText className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
              Rideau sur mesure
            </TabsTrigger>
            <TabsTrigger value="store">
              <Layers className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
              Store sur mesure
            </TabsTrigger>
            <TabsTrigger value="autre">
              <Receipt className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
              Autre produit
            </TabsTrigger>
            <TabsTrigger value="collection">
              <Library className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
              Collection Atmosphère
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rideau" className="pt-6 pb-5">
            <RideauForm />
          </TabsContent>
          <TabsContent value="store" className="pt-6 pb-5">
            <Placeholder
              title="Configurateur store sur mesure"
              hint="Panneau plat · Bateau · Vénitien · Enrouleur · Roman"
            />
          </TabsContent>
          <TabsContent value="autre" className="pt-6 pb-5">
            <Placeholder
              title="Autre produit"
              hint="Peinture, papier peint, recouvrement, banquette, coussin, moustiquaire"
            />
          </TabsContent>
          <TabsContent value="collection" className="pt-6 pb-5">
            <Placeholder
              title="Catalogue Collection Atmosphère"
              hint="Stocks Pologne / Ukraine · prix réduits · rideaux, stores, banquettes, coussins"
            />
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}

function Placeholder({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="border-2 border-dashed border-line rounded-md py-16 px-6 text-center">
      <p className="display-serif text-[20px] text-ink mb-2">{title}</p>
      <p className="text-[12.5px] text-muted max-w-md mx-auto">{hint}</p>
      <p className="font-mono text-[10.5px] text-muted-2 uppercase tracking-[0.14em] mt-6">
        Module · à connecter
      </p>
    </div>
  );
}

function RideauForm() {
  const [rooms, setRooms] = useState(initialRooms);
  const [tissuRef, setTissuRef] = useState(tissus[0].ref);
  const [doublureId, setDoublureId] = useState("occultante");
  const [railId, setRailId] = useState("ds");
  const [discount, setDiscount] = useState(0);

  const tissu = tissus.find((t) => t.ref === tissuRef)!;
  const tete = teteRideau[0];
  const doublure = doublures.find((d) => d.id === doublureId)!;
  const rail = rails.find((r) => r.id === railId)!;

  const lineTotals = rooms.map((r) => {
    const teteCoef = teteRideau.find((t) => t.id === r.tete)?.coef ?? 2.4;
    const metragePiece =
      (((r.largeur * teteCoef) / tissu.width) * (r.hauteur + 25 + r.cassé)) /
        100 +
      0.4;
    const prixTissu = metragePiece * tissu.price * r.qty;
    const prixDoublure = r.doubled
      ? ((r.largeur * 1.2) / tissu.width) *
        (r.hauteur + 15) *
        0.01 *
        doublure.price *
        r.qty
      : 0;
    const prixRail = (r.largeur * rail.priceCm) / 1;
    const confection = 65 * r.qty;
    return {
      id: r.id,
      metrage: Math.round(metragePiece * 10) / 10,
      prixTissu,
      prixDoublure,
      prixRail,
      confection,
      total: prixTissu + prixDoublure + prixRail + confection,
    };
  });

  const totalHT = lineTotals.reduce((acc, l) => acc + l.total, 0) * (1 - discount / 100);
  const tva = totalHT * 0.2;
  const totalTTC = totalHT + tva;
  const acompte = totalTTC * 0.5;

  return (
    <div className="space-y-6">
      {/* Tissu choisi */}
      <div>
        <Label>Tissu principal</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
          {tissus.slice(0, 6).map((t) => {
            const active = tissuRef === t.ref;
            return (
              <button
                key={t.ref}
                onClick={() => setTissuRef(t.ref)}
                className={
                  "group text-left p-3 border rounded-md transition-all " +
                  (active
                    ? "border-ink bg-paper-2/60 shadow-[inset_0_0_0_1px_var(--color-ink)]"
                    : "border-line hover:border-line-strong")
                }
              >
                <div className="flex items-start gap-3">
                  <div
                    className="h-10 w-10 rounded-sm shrink-0 border border-line"
                    style={{ background: tissuColor(t.ref) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium text-ink leading-tight truncate">
                      {t.name}
                    </p>
                    <p className="ref mt-0.5">{t.ref} · laize {t.width}cm</p>
                    <p className="font-mono text-[11.5px] text-ink-2 mt-1">
                      {eur(t.price)} <span className="text-muted">/ m</span>
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <Hint>Raccord {tissu.raccord}cm · laize {tissu.width}cm pris en compte automatiquement</Hint>
      </div>

      {/* Pièces */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="mb-0">Pièces à équiper</Label>
          <button
            onClick={() => setRooms([...rooms, { id: `r${Date.now()}`, piece: "Nouvelle pièce", largeur: 200, hauteur: 240, qty: 2, tete: "flamand", cassé: 0, doubled: true }])}
            className="text-[11.5px] text-accent hover:underline inline-flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Ajouter une pièce
          </button>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-paper-2/50 border-b border-line text-left">
                <th className="px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">Pièce</th>
                <th className="px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">Larg. tringle</th>
                <th className="px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">Haut. finie</th>
                <th className="px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">Qté</th>
                <th className="px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">Tête</th>
                <th className="px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">Cassé</th>
                <th className="px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">Doublé</th>
                <th className="px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted text-right">Métrage</th>
                <th className="px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted text-right">Sous-total</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r, i) => {
                const lt = lineTotals[i];
                return (
                  <tr key={r.id} className="border-b border-line last:border-0 group hover:bg-paper-2/30">
                    <td className="px-3 py-1.5">
                      <input
                        defaultValue={r.piece}
                        className="bg-transparent text-ink w-full focus:outline-none focus:ring-1 focus:ring-accent rounded px-1 py-0.5"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <CellInput value={r.largeur} suffix="cm" onChange={(v) => updateRoom(rooms, setRooms, r.id, { largeur: v })} />
                    </td>
                    <td className="px-3 py-1.5">
                      <CellInput value={r.hauteur} suffix="cm" onChange={(v) => updateRoom(rooms, setRooms, r.id, { hauteur: v })} />
                    </td>
                    <td className="px-3 py-1.5">
                      <CellInput value={r.qty} onChange={(v) => updateRoom(rooms, setRooms, r.id, { qty: v })} small />
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        value={r.tete}
                        onChange={(e) => updateRoom(rooms, setRooms, r.id, { tete: e.target.value })}
                        className="h-7 text-[12px] bg-transparent border border-transparent hover:border-line rounded px-1.5 focus:outline-none focus:border-accent"
                      >
                        {teteRideau.map((t) => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <CellInput value={r.cassé} suffix="cm" onChange={(v) => updateRoom(rooms, setRooms, r.id, { cassé: v })} small />
                    </td>
                    <td className="px-3 py-1.5">
                      <Toggle
                        checked={r.doubled}
                        onChange={(v) => updateRoom(rooms, setRooms, r.id, { doubled: v })}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <span className="font-mono text-ink">{lt.metrage} m</span>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <span className="font-mono text-ink tabular-nums">{eur(lt.total, true)}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => setRooms(rooms.filter((x) => x.id !== r.id))}
                        className="opacity-0 group-hover:opacity-60 hover:opacity-100 hover:text-danger transition-opacity"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Doublure</Label>
          <Select value={doublureId} onChange={(e) => setDoublureId(e.target.value)}>
            {doublures.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}{d.price > 0 ? ` · +${d.price} €/m` : ""}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Rail / tringle</Label>
          <Select value={railId} onChange={(e) => setRailId(e.target.value)}>
            {rails.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} · {r.priceCm.toFixed(2)} €/cm
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Remise commerciale</Label>
          <div className="relative">
            <Input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted font-mono text-[12px]">
              %
            </span>
          </div>
        </div>
      </div>

      <div>
        <Label>Instructions atelier · notes confection</Label>
        <textarea
          className="w-full min-h-[80px] rounded-md border border-line-strong bg-surface px-3 py-2 text-[13px] hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          placeholder="Ex : raccord centré, ourlet bas 8cm, ruflette anneaux espacés à 12cm…"
          defaultValue="Raccord motif centré sur baie. Ourlet bas 8cm. Plis flamand 10cm."
        />
      </div>
    </div>
  );
}

function CellInput({
  value,
  suffix,
  onChange,
  small,
}: {
  value: number;
  suffix?: string;
  onChange: (v: number) => void;
  small?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={
          "bg-transparent text-ink font-mono text-right focus:outline-none focus:ring-1 focus:ring-accent rounded px-1 py-0.5 tabular-nums " +
          (small ? "w-10" : "w-14")
        }
      />
      {suffix && <span className="font-mono text-[11px] text-muted">{suffix}</span>}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={
        "relative h-4 w-7 rounded-full transition-colors " +
        (checked ? "bg-ink" : "bg-line-strong")
      }
      aria-pressed={checked}
    >
      <span
        className={
          "absolute top-0.5 h-3 w-3 bg-paper rounded-full transition-all shadow-sm " +
          (checked ? "left-3.5" : "left-0.5")
        }
      />
    </button>
  );
}

function updateRoom(
  rooms: RoomItem[],
  setRooms: (r: RoomItem[]) => void,
  id: string,
  patch: Partial<RoomItem>
) {
  setRooms(rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)));
}

function tissuColor(ref: string) {
  const map: Record<string, string> = {
    "CAS-204": "linear-gradient(135deg, #f4a48b, #d97a5b)",
    "CAS-301": "linear-gradient(135deg, #6b7a8a, #3f4a55)",
    "LIN-V12": "linear-gradient(135deg, #9b5a6e, #6d3a4a)",
    "LIN-N04": "linear-gradient(135deg, #d8c9a8, #b8a37c)",
    "POL-A22": "linear-gradient(135deg, #cbb8a0, #9a8975)",
    "UKR-D11": "linear-gradient(135deg, #e6dcc5, #c8b89a)",
  };
  return map[ref] ?? "linear-gradient(135deg, #888, #555)";
}

function LivePreview() {
  const totalHT = 2370.84;
  const tva = totalHT * 0.2;
  const totalTTC = totalHT + tva;
  const acompte = totalTTC * 0.5;
  const solde = totalTTC - acompte;

  return (
    <div className="sticky top-20 space-y-4">
      <Card>
        <CardHeader>
          <div>
            <p className="eyebrow">Synthèse · temps réel</p>
            <CardTitle className="mt-1 text-[15px]">Devis chiffré</CardTitle>
          </div>
          <ColorChip tone="violet" size="sm">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
          </ColorChip>
        </CardHeader>

        <div className="px-5 pb-4 space-y-4">
          {/* Line summary */}
          <div className="space-y-1.5 text-[12.5px]">
            <Row label="Tissu principal · Casamance Saumon" value={eur(1640.4)} />
            <Row label="Doublure occultante" value={eur(280.0)} sub />
            <Row label="Rail DS électrifiable" value={eur(220.0)} sub />
            <Row label="Confection · 4 rideaux" value={eur(260.0)} sub />
            <Row label="Pose + déplacement" value={eur(190.0)} sub />
          </div>

          <div className="hairline" />

          <div className="space-y-1.5 text-[12.5px]">
            <Row label="Sous-total HT" value={eur(totalHT)} strong />
            <Row label="TVA 20%" value={eur(tva)} muted />
          </div>

          <div className="flex items-baseline justify-between pt-3 border-t border-line">
            <span className="text-[13.5px] font-semibold text-ink">Total TTC</span>
            <span className="text-[28px] font-bold text-ink leading-none tabular-nums tracking-tight">
              {eur(totalTTC, true)}
            </span>
          </div>
        </div>

        {/* Acompte block — minimal ink */}
        <div className="m-3 rounded-xl overflow-hidden bg-ink text-white p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <p className="text-[10.5px] font-semibold tracking-wider uppercase opacity-70 mb-1">
                Règle 50% · Stripe
              </p>
              <p className="text-[12.5px] leading-snug opacity-90 max-w-[180px]">
                Acompte obligatoire pour déclencher la production.
              </p>
            </div>
            <div className="text-[34px] font-bold leading-none text-white">50%</div>
          </div>

          <div className="bg-white/10 rounded-lg p-2.5 space-y-1.5 border border-white/10">
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="opacity-80">Acompte Stripe</span>
              <span className="font-semibold tabular-nums">{eur(acompte)}</span>
            </div>
            <div className="flex items-center justify-between text-[12px] opacity-75">
              <span>Solde avant pose</span>
              <span className="tabular-nums">{eur(solde)}</span>
            </div>
          </div>

          <button className="w-full mt-3 inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-white text-ink font-semibold text-[13px] hover:bg-canvas-2 transition-colors">
            <Zap className="h-3.5 w-3.5" strokeWidth={2.4} />
            Générer & envoyer
          </button>
          <p className="text-[11px] opacity-60 text-center mt-2 leading-snug">
            PDF par email · lien Stripe · automation activée
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <p className="eyebrow">À déclenchement automatique</p>
            <CardTitle className="mt-1 text-[14px]">Chaîne aval</CardTitle>
          </div>
          <span className="inline-flex h-5 w-5 rounded-full bg-emerald text-white items-center justify-center text-[10px] font-semibold">
            4
          </span>
        </CardHeader>
        <ul className="px-5 pb-5 space-y-2 text-[12.5px]">
          <Trigger tone="orange" icon={Scissors} label="Fiche confection" detail="Brigitte M. · auto-assignation" />
          <Trigger tone="violet" icon={Truck} label="BC Casamance" detail="Tissu 12m · franco 500€ ✓" />
          <Trigger tone="blue" icon={Truck} label="BC Interstil" detail="Rail DS 320cm × 2" />
          <Trigger tone="pink" icon={Smartphone} label="SMS confirmation" detail="ATMOSPHERE · Brevo" />
        </ul>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  sub,
  muted,
  strong,
  large,
}: {
  label: string;
  value: string;
  sub?: boolean;
  muted?: boolean;
  strong?: boolean;
  large?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className={
          (sub ? "pl-3 text-muted " : muted ? "text-muted " : "text-ink-2 ") +
          (strong ? "font-medium " : "")
        }
      >
        {label}
      </span>
      <span
        className={
          "font-mono tabular-nums " +
          (large ? "text-[15px] text-ink display-num" : strong ? "text-ink" : muted ? "text-muted" : "text-ink-2")
        }
      >
        {value}
      </span>
    </div>
  );
}

function Trigger({
  label,
  detail,
  tone,
  icon: Icon,
}: {
  label: string;
  detail: string;
  tone: "violet" | "pink" | "orange" | "blue" | "emerald";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <ColorChip tone={tone} size="sm">
        <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      </ColorChip>
      <div className="flex-1 min-w-0">
        <p className="text-ink leading-tight font-medium">{label}</p>
        <p className="ref mt-0.5">{detail}</p>
      </div>
      <span className="inline-flex h-4 w-4 rounded-full bg-emerald-soft items-center justify-center mt-0.5">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1.5 4 L3.5 6 L6.5 2" stroke="#10B981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </li>
  );
}
