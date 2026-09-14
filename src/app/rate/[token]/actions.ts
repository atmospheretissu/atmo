"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";

export type SubmitRatingResult =
  | { ok: true; rating: number; googleReviewUrl: string | null }
  | { ok: false; message: string };

// Lien Google Reviews d'Atmosphère Tissus — à ajuster avec le place_id réel.
// Format standard : https://search.google.com/local/writereview?placeid=<PLACE_ID>
const GOOGLE_REVIEW_URL =
  process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL ||
  "https://g.page/r/CX2rW5tKAtmosphereTissus/review";

export async function submitDossierRatingAction(
  token: string,
  rating: number,
  comment: string,
): Promise<SubmitRatingResult> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return { ok: false, message: "Lien invalide." };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, message: "Note invalide (1 à 5)." };
  }
  const sb = createServiceRoleClient();

  const { data: existing } = await (
    sb as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (
            c: string,
            v: string,
          ) => {
            maybeSingle: () => Promise<{
              data: {
                id: string;
                rated_at: string | null;
              } | null;
            }>;
          };
        };
      };
    }
  )
    .from("dossier_ratings")
    .select("id, rated_at")
    .eq("rate_token", token)
    .maybeSingle();

  if (!existing) return { ok: false, message: "Note introuvable." };
  if (existing.rated_at) {
    return { ok: false, message: "Vous avez déjà noté ce dossier — merci !" };
  }

  const now = new Date().toISOString();
  const updatePatch: {
    rating: number;
    comment: string | null;
    rated_at: string;
    google_review_offered_at: string | null;
  } = {
    rating,
    comment: comment.trim() || null,
    rated_at: now,
    google_review_offered_at: rating === 5 ? now : null,
  };

  const { error } = await (
    sb as unknown as {
      from: (t: string) => {
        update: (v: unknown) => {
          eq: (
            c: string,
            v: string,
          ) => Promise<{ error: { message?: string } | null }>;
        };
      };
    }
  )
    .from("dossier_ratings")
    .update(updatePatch)
    .eq("id", existing.id);

  if (error) return { ok: false, message: error.message ?? "Erreur" };

  return {
    ok: true,
    rating,
    googleReviewUrl: rating === 5 ? GOOGLE_REVIEW_URL : null,
  };
}
