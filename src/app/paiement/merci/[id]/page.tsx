import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Mail, Phone, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Page publique « Merci pour votre achat » affichée après un paiement Stripe
 * réussi. Cliente n'est PAS authentifiée (la route est whitelistée dans le
 * middleware) — on utilise le service-role pour lire le devis en sécurité.
 *
 * Le statut peut encore être "valide" si le webhook Stripe n'a pas encore
 * fini de traiter — c'est OK, on affiche un message d'attente dans ce cas.
 */
export default async function MerciPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { id } = await params;
  const { session_id } = await searchParams;

  const supabase = createServiceRoleClient();
  const { data: devis } = await supabase
    .from("devis")
    .select("id, number, total_ttc, acompte_ttc, product_summary, status, client_id")
    .eq("id", id)
    .maybeSingle();

  if (!devis) notFound();

  const { data: client } = await supabase
    .from("clients")
    .select("display_name, email")
    .eq("id", devis.client_id)
    .maybeSingle();

  const totalTtc = Number(devis.total_ttc ?? 0);
  const acompte = Number(devis.acompte_ttc ?? totalTtc * 0.5);
  const solde = Math.max(0, totalTtc - acompte);
  const paymentConfirmed = devis.status === "acompte_recu";
  const firstName =
    client?.display_name?.split(" ")[0] ??
    client?.display_name ??
    "cher client";

  const eur = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(n);

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-2xl border border-line shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden">
        {/* Header coloré */}
        <div className="bg-gradient-to-br from-emerald to-emerald/80 px-8 pt-10 pb-8 text-center text-white">
          <div className="inline-flex h-16 w-16 rounded-full bg-white/20 backdrop-blur items-center justify-center mb-4">
            <CheckCircle2 className="h-9 w-9 text-white" strokeWidth={2.4} />
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight mb-2">
            Merci pour votre paiement !
          </h1>
          <p className="text-[14px] text-white/85">
            Bonjour {firstName}, votre acompte a bien été reçu.
          </p>
        </div>

        {/* Récap */}
        <div className="px-8 py-6 space-y-4">
          {!paymentConfirmed && session_id && (
            <div className="rounded-lg bg-amber-soft border border-amber/30 px-3 py-2.5 text-[12px] text-amber flex items-start gap-2">
              <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" strokeWidth={2.2} />
              <span>
                <strong>Traitement en cours</strong> — votre paiement a été enregistré chez
                Stripe et sera confirmé par notre système dans quelques secondes. Vous
                pouvez fermer cette page sans crainte.
              </span>
            </div>
          )}

          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
              Commande
            </p>
            <p className="text-[15px] font-semibold text-ink">
              {devis.product_summary}
            </p>
            <p className="text-[12.5px] text-muted-2 font-mono mt-0.5">
              Référence devis : {devis.number}
            </p>
          </div>

          <div className="rounded-xl bg-canvas-2/60 p-4 space-y-2">
            <div className="flex justify-between text-[13px]">
              <span className="text-muted">Total TTC</span>
              <span className="font-semibold text-ink-2 tabular-nums">{eur(totalTtc)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-emerald font-medium">Acompte payé (50%)</span>
              <span className="font-semibold text-emerald tabular-nums">{eur(acompte)}</span>
            </div>
            <div className="border-t border-line pt-2 flex justify-between text-[13px]">
              <span className="text-muted">Solde restant (à régler avant pose)</span>
              <span className="font-semibold text-ink-2 tabular-nums">{eur(solde)}</span>
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-2 mb-2">
              Et maintenant ?
            </p>
            <ol className="space-y-2 text-[13px] text-ink-2">
              <li className="flex items-start gap-2">
                <span className="inline-flex h-5 w-5 shrink-0 rounded-full bg-violet-soft text-violet text-[11px] font-semibold items-center justify-center mt-0.5">1</span>
                <span>Notre équipe lance la commande de vos tissus et accessoires auprès de nos fournisseurs.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-flex h-5 w-5 shrink-0 rounded-full bg-violet-soft text-violet text-[11px] font-semibold items-center justify-center mt-0.5">2</span>
                <span>Nos couturières confectionnent votre pièce sur mesure.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="inline-flex h-5 w-5 shrink-0 rounded-full bg-violet-soft text-violet text-[11px] font-semibold items-center justify-center mt-0.5">3</span>
                <span>Vous recevez un SMS dès que tout est prêt pour qu'on organise la pose ensemble.</span>
              </li>
            </ol>
          </div>

          <div className="border-t border-line pt-4 space-y-1.5">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
              Une question ?
            </p>
            <a
              href="mailto:contact@atmospheretissus.fr"
              className="inline-flex items-center gap-2 text-[13px] text-ink-2 hover:text-violet"
            >
              <Mail className="h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
              contact@atmospheretissus.fr
            </a>
            <br />
            <a
              href="tel:+33556000000"
              className="inline-flex items-center gap-2 text-[13px] text-ink-2 hover:text-violet"
            >
              <Phone className="h-3.5 w-3.5 text-muted-2" strokeWidth={2.2} />
              05 56 00 00 00
            </a>
          </div>
        </div>

        <div className="px-8 py-5 bg-canvas-2/40 border-t border-line">
          <div className="flex items-center justify-center mb-2">
            <Logo />
          </div>
          <p className="text-[11.5px] text-muted text-center">
            33 cours du Maréchal Foch, 33000 Bordeaux
          </p>
          <p className="text-[11.5px] text-center mt-0.5">
            <Link
              href="https://atmospheretissus.fr"
              className="text-violet hover:underline"
            >
              atmospheretissus.fr
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
