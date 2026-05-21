import Link from "next/link";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, ROLE_ROUTES } from "@/lib/db/profiles-shared";
import type { UserRole } from "@/lib/db/profiles-shared";

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

  let role: UserRole | null = null;
  let homeRoute = "/";
  let homeLabel = "Page d'accueil";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role) {
      role = profile.role as UserRole;
      homeRoute = ROLE_ROUTES[role]?.homeRoute ?? "/dashboard";
      homeLabel = "Retour à mon espace";
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-6">
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
            ? `Votre rôle "${ROLE_LABELS[role]}" ne donne pas accès à cette section.`
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
        <Link
          href={homeRoute}
          className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-ink text-white text-[13px] font-semibold hover:bg-ink/90 transition-colors"
        >
          {homeLabel}
        </Link>
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
  );
}
