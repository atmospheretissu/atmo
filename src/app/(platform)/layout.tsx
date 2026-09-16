import { unstable_cache } from "next/cache";
import { Sidebar } from "@/components/shell/sidebar";
import { ImpersonationBanner } from "@/components/shell/impersonation-banner";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/db/impersonation";
import type { UserRole } from "@/lib/db/profiles-shared";
import { listStores, getCurrentStoreId } from "@/lib/db/stores";

/**
 * Détecte si le scraper Atmolead est en état d'alerte pour afficher un
 * badge rouge sur la sidebar. Deux conditions :
 *   - config.paused_at non-null → circuit-breaker déclenché
 *   - dernier run "failed"      → dérive détectée mais breaker pas encore
 *
 * unstable_cache 30s : l'info n'a pas besoin d'être temps réel (le badge
 * s'affiche avec au max 30s de retard). Avant : 2 queries Supabase à
 * CHAQUE navigation pour un badge qui bouge une fois par jour au pire.
 *
 * Best-effort silencieux : si les tables n'existent pas ou en cas
 * d'erreur la fonction renvoie false — on ne veut pas casser toute la
 * sidebar pour un badge.
 */
const getAtmoleadAlertState = unstable_cache(
  async (): Promise<{ paused: boolean; lastFailed: boolean }> => {
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
  },
  ["atmolead-alert-state"],
  { revalidate: 30, tags: ["atmolead"] },
);

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getEffectiveProfile est maintenant cache() par requête React → même
  // s'il est appelé aussi côté page.tsx / middleware, un seul roundtrip
  // Supabase par navigation. Ses champs email/store_id sont maintenant
  // fournis directement, plus besoin d'une 2ᵉ query profiles ici.
  const [effective, stores, cookieStoreId, atmoleadAlert] = await Promise.all([
    getEffectiveProfile(),
    listStores({ activeOnly: false }),
    getCurrentStoreId(),
    getAtmoleadAlertState(),
  ]);

  const role: UserRole | null = effective?.effectiveRole ?? null;
  const userEmail = effective?.effectiveEmail ?? null;
  const profileStoreId = effective?.effectiveStoreId ?? null;

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
