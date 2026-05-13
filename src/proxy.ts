import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 proxy (formerly "middleware") — runs on every request before
 * route handlers. Used here to refresh the Supabase auth cookie and gate
 * private routes. Runtime is nodejs (edge not supported in v16 proxy).
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     * - public files with an extension (e.g. .png, .svg)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
