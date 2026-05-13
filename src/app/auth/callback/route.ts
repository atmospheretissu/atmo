import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase auth callback — handles magic link / OAuth redirects.
 * Exchanges the URL `code` for a session cookie, then redirects to the
 * originally-requested URL or `/dashboard`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Failure — back to login with an error flag
  return NextResponse.redirect(`${origin}/?error=auth`);
}
