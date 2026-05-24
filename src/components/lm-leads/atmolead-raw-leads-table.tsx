import type { AtmoleadRawLead } from "@/lib/db/atmolead";

export function AtmoleadRawLeadsTable({ rows }: { rows: AtmoleadRawLead[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-canvas-2/40 px-5 py-6 text-[13px] text-muted">
        Aucun lead capturé sur cette exécution.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-canvas-2/50 text-left">
              <th className="px-4 py-2.5 eyebrow">Réf LM</th>
              <th className="px-4 py-2.5 eyebrow">Nom</th>
              <th className="px-4 py-2.5 eyebrow">Magasin / Produit</th>
              <th className="px-4 py-2.5 eyebrow">Montant</th>
              <th className="px-4 py-2.5 eyebrow">Statut LM</th>
              <th className="px-4 py-2.5 eyebrow">Disposition</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const d = (r.raw_data ?? {}) as {
                name?: string;
                status?: string;
                product?: string;
                location?: string;
                amount?: string;
                detail?: { storeName?: string };
              };
              return (
                <tr key={r.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-2.5 font-mono text-[11.5px] text-muted">
                    {r.external_ref ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-ink">{d.name ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="text-ink-2">
                      {d.detail?.storeName ?? d.location ?? "—"}
                    </div>
                    <div className="text-[11.5px] text-muted">{d.product ?? ""}</div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[12px] tabular-nums">
                    {d.amount ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-[12.5px] text-muted">
                    {d.status ?? ""}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.inserted ? (
                      <span className="rounded-full bg-emerald-soft px-2 py-0.5 text-[11.5px] font-medium text-emerald">
                        inséré
                      </span>
                    ) : (
                      <span
                        className="rounded-full bg-amber-soft px-2 py-0.5 text-[11.5px] font-medium text-amber"
                        title={r.skip_reason ?? undefined}
                      >
                        {r.skip_reason ?? "ignoré"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
