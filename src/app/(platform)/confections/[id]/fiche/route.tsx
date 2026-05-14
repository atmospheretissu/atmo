import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDossierForFiche } from "@/lib/db/dossiers";
import { FicheConfectionPDF } from "@/lib/pdf/fiche-confection-pdf";

/**
 * Fiche de confection destinée aux couturières.
 *
 *   GET /confections/[id]/fiche          → téléchargement
 *   GET /confections/[id]/fiche?inline=1 → affichage inline
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const inline = url.searchParams.get("inline") === "1";

  const data = await getDossierForFiche(id);
  if (!data) {
    return new NextResponse("Dossier introuvable", { status: 404 });
  }

  const buffer = await renderToBuffer(
    <FicheConfectionPDF
      dossier={data.dossier}
      client={data.client}
      devisLines={data.devisLines}
      devisNumber={data.devis?.number ?? null}
    />
  );

  const filename = `Fiche_confection_${data.dossier.number}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
