import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";

/**
 * Supabase client for use in Server Components, Route Handlers, and Server Actions.
 * Uses cookies for session — anon key + RLS protect data.
 *
 * Next.js 16: cookies() is async and must be awaited.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component is a no-op
            // (cookies can only be set from Route Handlers / Server Actions / middleware).
          }
        },
      },
    }
  );
}

/**
 * Service-role client for privileged server-side operations
 * (admin tasks, webhooks, cron jobs). NEVER use this in code that runs
 * with user input directly — it bypasses RLS.
 */
export function createServiceRoleClient() {
  const { createClient: createBase } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  return createBase<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
