"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";

const BUCKET = "atmolead-artifacts";
const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes

/**
 * Génère une URL signée courte pour télécharger un artefact d'exécution
 * (screenshot ou trace Playwright). Le bucket est privé — RLS bloque
 * l'accès direct, seul le service_role génère les URL signées.
 */
export async function getAtmoleadArtifactUrlAction(
  path: string,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  if (!path || path.includes("..") || path.startsWith("/")) {
    return { ok: false, message: "Chemin invalide." };
  }
  const sb = createServiceRoleClient();
  const { data, error } = await sb.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, {
      download: path.split("/").pop() ?? true,
    });
  if (error || !data?.signedUrl) {
    return { ok: false, message: error?.message ?? "URL signée introuvable." };
  }
  return { ok: true, url: data.signedUrl };
}
