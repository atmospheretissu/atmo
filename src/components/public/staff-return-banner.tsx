import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getEffectiveProfile } from "@/lib/db/impersonation";

/**
 * Bandeau discret affiché en haut des pages publiques (/sign, /client)
 * UNIQUEMENT si le visiteur est connecté avec un compte Atmosphère (n'importe
 * quel rôle staff, pas juste admin). Permet de revenir en un clic à la fiche
 * devis interne — utile quand on ouvre le lien depuis la plateforme pour
 * vérifier ce que voit le client.
 *
 * Rendu côté serveur — pas d'exposition côté client si pas connecté.
 */
export async function StaffReturnBanner({ devisId }: { devisId: string }) {
  let profile: Awaited<ReturnType<typeof getEffectiveProfile>> = null;
  try {
    profile = await getEffectiveProfile();
  } catch {
    return null;
  }
  if (!profile?.effectiveRole) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50">
      <Link
        href={`/devis/${devisId}`}
        className="inline-flex items-center gap-2 h-9 pl-2.5 pr-3.5 rounded-full bg-ink text-white text-[12px] font-semibold shadow-lg hover:bg-ink/90 transition-colors"
        title={`Connecté en ${profile.effectiveRole} — retour à la fiche devis`}
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
        Retour au devis (staff)
      </Link>
    </div>
  );
}
