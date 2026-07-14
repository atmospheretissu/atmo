import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { SignForm } from "./sign-form";

export const dynamic = "force-dynamic";

export default async function SignDevisPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Validation format UUID pour ne pas exposer une erreur SQL sur token bidon.
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();

  const supabase = createServiceRoleClient();
  // Requête typée via cast : signature_token n'est pas encore dans Database.
  const { data: devisRaw } = await (
    supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (
            c: string,
            v: string,
          ) => {
            maybeSingle: () => Promise<{
              data: {
                id: string;
                number: string;
                total_ttc: number | string;
                acompte_ttc: number | string | null;
                acompte_pct: number | string | null;
                product_summary: string | null;
                client_id: string | null;
                signed_at: string | null;
                signed_by_name: string | null;
              } | null;
            }>;
          };
        };
      };
    }
  )
    .from("devis")
    .select(
      "id, number, total_ttc, acompte_ttc, acompte_pct, product_summary, client_id, signed_at, signed_by_name",
    )
    .eq("signature_token", token)
    .maybeSingle();

  if (!devisRaw) notFound();
  const devis = devisRaw;

  let clientName: string | null = null;
  if (devis.client_id) {
    const { data: c } = await supabase
      .from("clients")
      .select("display_name")
      .eq("id", devis.client_id)
      .maybeSingle();
    clientName = c?.display_name ?? null;
  }

  const signed = devis as unknown as {
    signed_at?: string | null;
    signed_by_name?: string | null;
  };

  const eur = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(n);

  const totalTtc = Number(devis.total_ttc ?? 0);
  const acomptePct = Number(devis.acompte_pct ?? 50);
  const acompteTtc = Number(devis.acompte_ttc ?? (totalTtc * acomptePct) / 100);

  return (
    <main className="min-h-screen bg-canvas flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <p className="text-[11.5px] uppercase tracking-widest font-semibold text-muted-2 mb-1">
            Atmosphère Tissus
          </p>
          <h1 className="text-[24px] font-semibold text-ink">
            Signature électronique du devis
          </h1>
          <p className="text-[13.5px] text-muted mt-2">
            {clientName ? `${clientName} · ` : ""}Devis {devis.number}
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-line shadow-sm overflow-hidden">
          <div className="p-6 bg-gradient-to-br from-violet-soft/60 to-blue-soft/40 border-b border-line">
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[11.5px] uppercase tracking-widest font-semibold text-muted-2">
                  Montant total TTC
                </p>
                <p className="text-[36px] font-bold text-ink leading-none tabular-nums mt-1">
                  {eur(totalTtc)}
                </p>
                <p className="text-[12.5px] text-muted-2 mt-2">
                  {devis.product_summary}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11.5px] uppercase tracking-widest font-semibold text-muted-2">
                  Acompte {acomptePct}%
                </p>
                <p className="text-[18px] font-semibold text-ink leading-none mt-1 tabular-nums">
                  {eur(acompteTtc)}
                </p>
              </div>
            </div>
          </div>

          {signed.signed_at ? (
            <div className="p-6 text-center">
              <div className="h-14 w-14 rounded-full bg-emerald-soft border-2 border-emerald text-emerald-strong inline-flex items-center justify-center mb-3">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-[18px] font-semibold text-ink mb-1">
                Merci, votre signature a bien été enregistrée
              </h2>
              <p className="text-[13.5px] text-muted">
                Signé par{" "}
                <strong className="text-ink">{signed.signed_by_name}</strong>{" "}
                le{" "}
                {new Intl.DateTimeFormat("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(signed.signed_at))}
                .
              </p>
              <p className="text-[12.5px] text-muted-2 mt-3">
                L&apos;équipe Atmosphère vous contacte pour organiser la suite.
              </p>
            </div>
          ) : (
            <SignForm token={token} />
          )}
        </div>

        <p className="text-center text-[11px] text-muted-2 mt-6 leading-relaxed">
          En signant, vous confirmez avoir pris connaissance et accepté les
          Conditions Générales de Vente jointes au devis.
          <br />
          Atmosphère · SAS au capital de 250 000 € · SIRET 53381194900049
        </p>
      </div>
    </main>
  );
}
