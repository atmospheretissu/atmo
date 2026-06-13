import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { DevisPDF } from "@/lib/pdf/devis-pdf";

/**
 * PDF du devis pour le portail client — authentifié par token (pas par session).
 * Respecte hide_measurements_for_client du devis.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!token || token.length < 16) {
    return new NextResponse("Token invalide", { status: 404 });
  }

  const url = new URL(request.url);
  const inline = url.searchParams.get("inline") === "1";

  const supabase = createServiceRoleClient();

  const { data: devis } = await supabase
    .from("devis")
    .select("*")
    .eq("client_access_token" as never, token)
    .maybeSingle();
  if (!devis) return new NextResponse("Devis introuvable", { status: 404 });

  const [{ data: client }, { data: lines }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", devis.client_id).maybeSingle(),
    supabase
      .from("devis_lines")
      .select("*")
      .eq("devis_id", devis.id)
      .order("position", { ascending: true }),
  ]);

  const hideMeasurements = Boolean(
    (devis as { hide_measurements_for_client?: boolean }).hide_measurements_for_client,
  );

  const buffer = await renderToBuffer(
    <DevisPDF
      devis={devis}
      client={client ?? null}
      lines={lines ?? []}
      hideMeasurements={hideMeasurements}
    />,
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
