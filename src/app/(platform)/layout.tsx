import { Sidebar } from "@/components/shell/sidebar";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/db/profiles-shared";
import { listStores, getCurrentStoreId } from "@/lib/db/stores";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: UserRole | null = null;
  let userEmail: string | null = null;
  let profileStoreId: string | null = null;
  if (user) {
    userEmail = user.email ?? null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, store_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role) role = profile.role as UserRole;
    profileStoreId = (profile as { store_id?: string | null })?.store_id ?? null;
  }

  const [stores, cookieStoreId] = await Promise.all([
    listStores({ activeOnly: false }),
    getCurrentStoreId(),
  ]);

  // resp_magasin : forcé sur son store. Admin / autres : cookie ou "all"
  const currentStoreId =
    role === "resp_magasin" ? profileStoreId : cookieStoreId;

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar
        role={role}
        userEmail={userEmail}
        stores={stores}
        currentStoreId={currentStoreId}
      />
      <main className="flex-1 min-w-0 flex flex-col">{children}</main>
    </div>
  );
}
