import { Sidebar } from "@/components/shell/sidebar";
import { ImpersonationBanner } from "@/components/shell/impersonation-banner";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/db/impersonation";
import type { UserRole } from "@/lib/db/profiles-shared";
import { listStores, getCurrentStoreId } from "@/lib/db/stores";

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

  const [stores, cookieStoreId] = await Promise.all([
    listStores({ activeOnly: false }),
    getCurrentStoreId(),
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
