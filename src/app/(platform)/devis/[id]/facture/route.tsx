import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDevisDetail } from "@/lib/db/devis";
import { FacturePDF, type FactureKind } from "@/lib/pdf/facture-pdf";

/**
 *   GET /devis/[id]/facture?kind=acompte   → facture d'acompte
 *   GET /devis/[id]/facture?kind=solde     → facture de solde
 *   + ?inline=1 pour affichage inline.
 *
 * Le numéro de facture est dérivé du numéro de devis :
 *   FA-2026-0042 (acompte) / FS-2026-0042 (solde)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const kind = (url.searchParams.get("kind") as FactureKind) || "acompte";
  const inline = url.searchParams.get("inline") === "1";

  if (kind !== "acompte" && kind !== "solde") {
    return new NextResponse("kind invalide", { status: 400 });
  }

  const result = await getDevisDetail(id);
  if (!result) return new NextResponse("Devis introuvable", { status: 404 });

  const { devis, client, dossier, payments } = result;

  const payment = payments.find((p) => p.kind === kind) ?? null;
  const paidAt =
    payment?.paid_at ??
    (kind === "acompte" ? dossier?.acompte_paid_at : dossier?.solde_paid_at) ??
    null;
  const paidMethod = payment?.method ?? null;

  // Numéro de facture déduit du devis
  const suffix = devis.number.replace(/^DEV-/, "");
  const prefix = kind === "acompte" ? "FA" : "FS";
  const invoiceNumber = `${prefix}-${suffix}`;

  const buffer = await renderToBuffer(
    <FacturePDF
      kind={kind}
      devis={devis}
      client={client}
      invoiceNumber={invoiceNumber}
      paidAt={paidAt}
      paidMethod={paidMethod}
    />,
  );

  const filename = `${invoiceNumber}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
