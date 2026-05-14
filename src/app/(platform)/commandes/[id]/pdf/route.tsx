import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getBcDetail } from "@/lib/db/bons-commande";
import { BcPDF } from "@/lib/pdf/bc-pdf";

/**
 *   GET /commandes/[id]/pdf          → téléchargement
 *   GET /commandes/[id]/pdf?inline=1 → affichage inline
 *
 * Le PDF est généré dans la langue du fournisseur (FR/DE/PL/UA).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const inline = url.searchParams.get("inline") === "1";

  const detail = await getBcDetail(id);
  if (!detail) {
    return new NextResponse("BC introuvable", { status: 404 });
  }

  const buffer = await renderToBuffer(<BcPDF detail={detail} />);
  const filename = `${detail.bc.number}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
