import Link from "next/link";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, ROLE_ROUTES } from "@/lib/db/profiles-shared";
import type { UserRole } from "@/lib/db/profiles-shared";
import { getEffectiveProfile } from "@/lib/db/impersonation";
import { StopImpersonationButton } from "@/components/shell/stop-impersonation-button";

export const dynamic = "force-dynamic";

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Récupère le profil effectif (tient compte du mode simulation).
  const effective = await getEffectiveProfile();
  const isImpersonating = Boolean(effective?.isImpersonating);
  const effectiveRole = effective?.effectiveRole ?? null;
  const actualRole = effective?.actualRole ?? null;

  let role: UserRole | null = null;
  let homeRoute = "/";
  let homeLabel = "Page d'accueil";
  if (user) {
    // On affiche le rôle EFFECTIF (celui qui a réellement causé le refus)
    // plutôt que le rôle réel — sinon le message est trompeur pendant
    // une simulation.
    role = effectiveRole ?? actualRole;
    if (role) {
      // Pendant une simulation, la home reste celle de l'admin réel pour
      // que le CTA sorte correctement.
      const roleForHome = isImpersonating ? actualRole ?? role : role;
      homeRoute = ROLE_ROUTES[roleForHome]?.homeRoute ?? "/dashboard";
      homeLabel = "Retour à mon espace";
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* Bandeau simulation — permet de sortir directement depuis le 403 */}
      {isImpersonating && (
        <div className="bg-amber text-white px-4 py-2 flex items-center justify-between gap-4 text-[12.5px]">
          <span>
            Mode simulation actif — rôle « {role ? ROLE_LABELS[role] : "?"} »
            {actualRole && (
              <> (compte réel : {ROLE_LABELS[actualRole]})</>
            )}
          </span>
          <StopImpersonationButton />
        </div>
      )}
      <div className="flex-1 flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber to-pink text-white inline-flex items-center justify-center mb-5 mx-auto">
          <Lock className="h-6 w-6" strokeWidth={2.2} />
        </div>
        <p className="eyebrow mb-3">Accès refusé</p>
        <h1 className="text-[28px] font-semibold tracking-tight text-ink leading-[1.15] mb-3">
          Vous n&apos;avez pas accès à cette page
        </h1>
        <p className="text-[13.5px] text-muted mb-6 leading-relaxed">
          {role
            ? isImpersonating
              ? `En mode simulation « ${ROLE_LABELS[role]} », cette section n'est pas accessible. Sors du mode simulation pour retrouver tes droits admin.`
              : `Votre rôle "${ROLE_LABELS[role]}" ne donne pas accès à cette section.`
            : "Connectez-vous pour accéder à l'application."}
          {from && (
            <>
              {" "}
              <span className="block mt-2 font-mono text-[11.5px] text-muted-2">
                Route demandée : {from}
              </span>
            </>
          )}
        </p>
        {isImpersonating ? (
          // En simulation : le seul CTA sûr est de sortir. Un simple lien
          // vers homeRoute redirigerait à nouveau vers /403 puisque le
          // cookie de simulation est encore là.
          <StopImpersonationButton target="/dashboard" variant="primary" />
        ) : (
          <Link
            href={homeRoute}
            className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-ink text-white text-[13px] font-semibold hover:bg-ink/90 transition-colors"
          >
            {homeLabel}
          </Link>
        )}
        {user && (
          <p className="mt-4 text-[11.5px] text-muted-2">
            Connecté en tant que <span className="text-ink-2 font-mono">{user.email}</span>
            {" · "}
            <Link href="/auth/sign-out" className="text-violet hover:underline">
              Se déconnecter
            </Link>
          </p>
        )}
      </div>
      </div>
    </div>
  );
}
