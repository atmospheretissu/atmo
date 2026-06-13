import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDevisDetail } from "@/lib/db/devis";
import { DevisPDF } from "@/lib/pdf/devis-pdf";

/**
 * Génère le PDF d'un devis à la volée.
 *
 *   GET /devis/[id]/pdf            → renvoie le PDF en attachement (download)
 *   GET /devis/[id]/pdf?inline=1   → renvoie pour affichage inline dans le navigateur
 *
 * L'auth est gérée par le proxy Next.js (le client doit être loggué).
 * Les RLS Supabase garantissent que seuls les profils autorisés voient le devis.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const inline = url.searchParams.get("inline") === "1";
  // audience=internal (Atmo, défaut sur la fiche devis) → toujours tout afficher
  // audience=client → respecte hide_measurements_for_client
  const audience = url.searchParams.get("audience") ?? "internal";

  const result = await getDevisDetail(id);
  if (!result) {
    return new NextResponse("Devis introuvable", { status: 404 });
  }

  const { devis, client, lines } = result;
  const hideMeasurements =
    audience === "client" &&
    Boolean((devis as { hide_measurements_for_client?: boolean }).hide_measurements_for_client);

  const buffer = await renderToBuffer(
    <DevisPDF
      devis={devis}
      client={client}
      lines={lines}
      hideMeasurements={hideMeasurements}
    />
  );

  const filename = `${devis.number}_v${devis.version}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
