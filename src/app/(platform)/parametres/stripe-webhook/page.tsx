import Link from "next/link";
import { Topbar } from "@/components/shell/topbar";
import { Card } from "@/components/ui/card";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type LogRow = {
  id: string;
  received_at: string;
  event_id: string | null;
  event_type: string | null;
  signature_valid: boolean | null;
  devis_id: string | null;
  payment_kind: string | null;
  session_id: string | null;
  payment_intent_id: string | null;
  amount_total: number | null;
  response_status: number;
  response_body: string | null;
  error_message: string | null;
  processing_ms: number | null;
};

export default async function StripeWebhookLogsPage() {
  const sb = createServiceRoleClient();
  const { data: rows } = (await (
    sb as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          order: (
            c: string,
            o: { ascending: boolean },
          ) => {
            limit: (n: number) => Promise<{ data: LogRow[] | null }>;
          };
        };
      };
    }
  )
    .from("stripe_webhook_log")
    .select("*")
    .order("received_at", { ascending: false })
    .limit(100)) as { data: LogRow[] | null };

  const list = rows ?? [];
  const okCount = list.filter((r) => r.response_status === 200).length;
  const errorCount = list.filter((r) => r.response_status >= 400).length;

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: "Atmosphère" },
          { label: "Paramètres", href: "/parametres" },
          { label: "Diagnostic Stripe" },
        ]}
      />
      <div className="flex-1 overflow-auto">
        <section className="px-8 pt-10 pb-6">
          <p className="eyebrow mb-3">Diagnostic · Webhook Stripe</p>
          <h1 className="text-[36px] font-semibold tracking-tight text-ink leading-[1.1]">
            Journal des appels
          </h1>
          <p className="text-[13.5px] text-muted max-w-2xl mt-2">
            100 derniers appels reçus par <code>/api/stripe/webhook</code>.
            Utile pour comprendre pourquoi un paiement Stripe ne remonte pas.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-[13px] text-emerald font-semibold">
              ✓ {okCount} succès
            </span>
            <span className="text-[13px] text-pink font-semibold">
              ✗ {errorCount} erreurs
            </span>
            <span className="text-[13px] text-muted">
              Total : {list.length}
            </span>
          </div>
        </section>

        <section className="px-8 pb-16">
          <Card className="p-0 overflow-hidden">
            {list.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-muted">
                Aucun appel reçu depuis la mise en place du log. Si le webhook
                Stripe est bien configuré, un test devrait apparaître ici dans
                les secondes qui suivent un paiement.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead className="bg-canvas-2 border-b border-line">
                    <tr className="text-left text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">
                      <th className="px-3 py-2.5">Reçu</th>
                      <th className="px-3 py-2.5">Statut</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5">Devis</th>
                      <th className="px-3 py-2.5 text-right">Montant</th>
                      <th className="px-3 py-2.5">Message</th>
                      <th className="px-3 py-2.5 text-right">Durée</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {list.map((r) => {
                      const ok = r.response_status === 200;
                      return (
                        <tr key={r.id} className="hover:bg-canvas-2/40">
                          <td className="px-3 py-2 whitespace-nowrap text-muted">
                            {new Date(r.received_at).toLocaleString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                                (ok
                                  ? "bg-emerald/15 text-emerald"
                                  : "bg-pink/15 text-pink")
                              }
                            >
                              {ok ? "✓" : "✗"} {r.response_status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-ink-2 whitespace-nowrap">
                            {r.event_type ?? "—"}
                            {r.payment_kind && (
                              <span className="ml-1 text-muted-2">
                                · {r.payment_kind}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {r.devis_id ? (
                              <Link
                                href={`/devis/${r.devis_id}`}
                                className="text-blue underline font-mono text-[11px]"
                              >
                                {r.devis_id.slice(0, 8)}…
                              </Link>
                            ) : (
                              <span className="text-muted-2">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                            {r.amount_total != null
                              ? `${r.amount_total.toFixed(2)} €`
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-[11.5px]">
                            {r.error_message ? (
                              <span className="text-pink">
                                {r.error_message}
                              </span>
                            ) : r.response_body ? (
                              <span className="text-muted">
                                {r.response_body}
                              </span>
                            ) : (
                              <span className="text-muted-2">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-[11px] text-muted-2 tabular-nums">
                            {r.processing_ms != null
                              ? `${r.processing_ms}ms`
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <p className="mt-4 text-[11.5px] text-muted-2">
            Sécurité vérifiée : <strong>signature_valid</strong> à true = le
            payload vient bien de Stripe (secret correspond).
          </p>
        </section>
      </div>
    </>
  );
}
