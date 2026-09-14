import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { RateForm } from "./rate-form";

export const dynamic = "force-dynamic";

export default async function RatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();

  const sb = createServiceRoleClient();
  const { data: rating } = await (
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
                dossier_id: string;
                rating: number | null;
                rated_at: string | null;
              } | null;
            }>;
          };
        };
      };
    }
  )
    .from("dossier_ratings")
    .select("id, dossier_id, rating, rated_at")
    .eq("rate_token", token)
    .maybeSingle();

  if (!rating) notFound();

  const { data: dossier } = await sb
    .from("dossiers")
    .select("number, client_id")
    .eq("id", rating.dossier_id)
    .maybeSingle();

  const { data: client } = dossier
    ? await sb
        .from("clients")
        .select("display_name")
        .eq("id", dossier.client_id)
        .maybeSingle()
    : { data: null };

  return (
    <main className="min-h-screen bg-canvas flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <p className="text-[11.5px] uppercase tracking-widest font-semibold text-muted-2 mb-1">
            Atmosphère Tissus
          </p>
          <h1 className="text-[24px] font-semibold text-ink">
            {rating.rated_at
              ? "Merci pour votre retour"
              : "Votre avis compte"}
          </h1>
          {dossier && (
            <p className="text-[13px] text-muted mt-2">
              Dossier {dossier.number}
              {client?.display_name ? ` · ${client.display_name}` : ""}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-line shadow-sm overflow-hidden">
          <RateForm token={token} alreadyRated={Boolean(rating.rated_at)} />
        </div>

        <p className="text-[11px] text-muted-2 text-center mt-6">
          Atmosphère Tissus · 1 rue de l&apos;Union, Village des Voiles, 59520
          Marquette-lez-Lille
        </p>
      </div>
    </main>
  );
}
