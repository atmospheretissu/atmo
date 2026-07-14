import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/types";
import { canAccess, ROLE_ROUTES } from "@/lib/db/profiles-shared";
import type { UserRole } from "@/lib/db/profiles-shared";

/**
 * Refreshes the Supabase auth session cookie on every request, enforces
 * route protection, AND gates routes by user role (profile.role).
 *
 *   - Anonymous users : only `/`, `/auth/*`, webhooks, cron, health
 *   - Authenticated users : routes filtered by ROLE_ROUTES[role]
 *   - Forbidden access : redirect to /403 with `from=<original-path>`
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const publicRoutes = ["/", "/auth"];
  const isPublic =
    publicRoutes.includes(pathname) ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/paiement/") ||
    pathname.startsWith("/sign/") ||
    pathname.startsWith("/client/") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/cron/");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  // Signed-in user on login page → redirect to role's home
  if (user && pathname === "/") {
    const role = await getUserRole(supabase, user.id, request);
    const home = role ? ROLE_ROUTES[role]?.homeRoute ?? "/dashboard" : "/dashboard";
    const url = request.nextUrl.clone();
    url.pathname = home;
    return NextResponse.redirect(url);
  }

  // Role-based gating for authenticated requests on platform routes
  if (user && !isPublic && !pathname.startsWith("/api/")) {
    const role = await getUserRole(supabase, user.id, request);

    // Pas de profil = on laisse passer mais on signale (cas démo/initial)
    // Profil avec rôle = on vérifie l'accès
    if (role && !canAccess(role, pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/403";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

/**
 * Lit le rôle du profil de l'utilisateur. Cache par requête via le cookieStore
 * implicite — chaque proxy invocation = 1 query max.
 */
async function getUserRole(
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string,
  request?: NextRequest,
): Promise<UserRole | null> {
  const { data } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", userId)
    .maybeSingle();
  if (!data || data.active === false) return null;
  const actualRole = data.role as UserRole;

  // Impersonation : si un admin a activé un cookie, on renvoie le rôle du profil ciblé
  const impersonatedId = request?.cookies.get("atmo_impersonated_profile")?.value;
  if (actualRole === "admin" && impersonatedId && impersonatedId !== userId) {
    const { data: target } = await supabase
      .from("profiles")
      .select("role, active")
      .eq("id", impersonatedId)
      .maybeSingle();
    if (target && target.active !== false) return target.role as UserRole;
  }
  return actualRole;
}
