import Link from "next/link";
import { notFound } from "next/navigation";
import { XCircle, Mail, Phone, RotateCcw } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Page publique affichée si le client annule le paiement Stripe (ferme l'onglet
 * checkout ou clique « Retour »). Aucune charge n'a été effectuée.
 */
export default async function AnnulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = createServiceRoleClient();
  const { data: devis } = await supabase
    .from("devis")
    .select("id, number, product_summary, client_id")
    .eq("id", id)
    .maybeSingle();

  if (!devis) notFound();

  const { data: client } = await supabase
    .from("clients")
    .select("display_name")
    .eq("id", devis.client_id)
    .maybeSingle();

  const firstName = client?.display_name?.split(" ")[0] ?? "cher client";

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-line shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="bg-canvas-2/60 px-8 pt-10 pb-8 text-center">
          <div className="inline-flex h-16 w-16 rounded-full bg-amber-soft items-center justify-center mb-4">
            <XCircle className="h-9 w-9 text-amber" strokeWidth={2.4} />
          </div>
          <h1 className="text-[24px] font-semibold tracking-tight text-ink mb-2">
            Paiement annulé
          </h1>
          <p className="text-[13.5px] text-muted">
            Bonjour {firstName}, aucun montant n'a été prélevé.
          </p>
        </div>

        <div className="px-8 py-6 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-2 mb-1">
              Votre devis reste actif
            </p>
            <p className="text-[14px] text-ink-2 font-semibold">{devis.product_summary}</p>
            <p className="text-[12.5px] text-muted-2 font-mono mt-0.5">
              Référence : {devis.number}
            </p>
          </div>

          <p className="text-[13px] text-muted leading-relaxed">
            Vous pouvez reprendre le paiement à tout moment depuis l'email que nous vous
            avons envoyé, ou nous contacter pour toute question.
          </p>

          <div className="flex gap-2 flex-wrap">
            <a
              href="mailto:contact@atmospheretissus.fr"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ink text-white text-[13px] font-semibold hover:bg-ink-2 transition-colors"
            >
              <Mail className="h-3.5 w-3.5" strokeWidth={2.2} />
              Nous contacter
            </a>
            <a
              href="tel:+33556000000"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-line-strong text-ink text-[13px] font-semibold hover:bg-canvas-2 transition-colors"
            >
              <Phone className="h-3.5 w-3.5" strokeWidth={2.2} />
              05 56 00 00 00
            </a>
          </div>

          <div className="border-t border-line pt-3 text-[11.5px] text-muted-2 flex items-center gap-1.5">
            <RotateCcw className="h-3 w-3" strokeWidth={2.2} />
            Si vous fermez cette page, votre devis n°{devis.number} restera disponible dans nos systèmes.
          </div>
        </div>

        <div className="px-8 py-5 bg-canvas-2/40 border-t border-line">
          <div className="flex items-center justify-center mb-2">
            <Logo />
          </div>
          <p className="text-[11.5px] text-muted-2 text-center">
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
