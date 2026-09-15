import { Sidebar } from "@/components/shell/sidebar";
import { ImpersonationBanner } from "@/components/shell/impersonation-banner";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/db/impersonation";
import type { UserRole } from "@/lib/db/profiles-shared";
import { listStores, getCurrentStoreId } from "@/lib/db/stores";

/**
 * Détecte si le scraper Atmolead est en état d'alerte pour afficher un
 * badge rouge sur la sidebar. Deux conditions :
 *   - config.paused_at non-null → circuit-breaker déclenché
 *   - dernier run "failed"      → dérive détectée mais breaker pas encore
 *
 * Best-effort silencieux : si les tables n'existent pas ou en cas d'erreur
 * la fonction renvoie false — on ne veut pas casser la sidebar de tout
 * l'app pour un badge.
 */
async function getAtmoleadAlertState(): Promise<{
  paused: boolean;
  lastFailed: boolean;
}> {
  try {
    const sb = createServiceRoleClient();
    const [{ data: cfg }, { data: lastRun }] = await Promise.all([
      sb
        .from("atmolead_config" as never)
        .select("paused_at")
        .maybeSingle(),
      sb
        .from("atmolead_executions" as never)
        .select("status")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return {
      paused: Boolean((cfg as { paused_at?: string | null } | null)?.paused_at),
      lastFailed:
        (lastRun as { status?: string } | null)?.status === "failed",
    };
  } catch {
    return { paused: false, lastFailed: false };
  }
}

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const effective = await getEffectiveProfile();

  let role: UserRole | null = null;
  let userEmail: string | null = null;
  let profileStoreId: string | null = null;
  if (effective) {
    role = effective.effectiveRole;
    // Récupère l'email et store_id du profil effectif
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, store_id")
      .eq("id", effective.effectiveUserId)
      .maybeSingle();
    userEmail = profile?.email ?? null;
    profileStoreId = (profile as { store_id?: string | null })?.store_id ?? null;
  }

  const [stores, cookieStoreId, atmoleadAlert] = await Promise.all([
    listStores({ activeOnly: false }),
    getCurrentStoreId(),
    getAtmoleadAlertState(),
  ]);

  const currentStoreId =
    role === "resp_magasin" ? profileStoreId : cookieStoreId;

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar
        role={role}
        userEmail={userEmail}
        stores={stores}
        currentStoreId={currentStoreId}
        adminActualRole={effective?.actualRole ?? null}
        atmoleadAlert={atmoleadAlert}
      />
      <main className="flex-1 min-w-0 flex flex-col">
        {effective?.isImpersonating && (
          <ImpersonationBanner
            targetName={effective.impersonatedName ?? "?"}
            targetRole={effective.effectiveRole ?? "?"}
          />
        )}
        {children}
      </main>
    </div>
  );
}
