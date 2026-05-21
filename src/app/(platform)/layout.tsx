import { Sidebar } from "@/components/shell/sidebar";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/db/profiles-shared";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Charge le rôle du user connecté pour filtrer la sidebar.
  // (Le middleware a déjà rejeté les anonymes, donc user existe normalement.)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let role: UserRole | null = null;
  let userEmail: string | null = null;
  if (user) {
    userEmail = user.email ?? null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role) role = profile.role as UserRole;
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar role={role} userEmail={userEmail} />
      <main className="flex-1 min-w-0 flex flex-col">{children}</main>
    </div>
  );
}
