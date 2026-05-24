import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  basePath,
  currentPage,
  totalCount,
  pageSize,
  itemNoun = "éléments",
  searchParams,
}: {
  basePath: string;
  currentPage: number;
  totalCount: number;
  pageSize: number;
  itemNoun?: string;
  searchParams?: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const start = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalCount);
  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;

  function hrefFor(page: number): string {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams ?? {})) {
      if (v !== undefined && k !== "page") params.set(k, v);
    }
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3.5">
      <div className="text-[12px] text-muted tabular-nums">
        {totalCount === 0 ? (
          <span>Aucun {itemNoun}</span>
        ) : (
          <>
            <span className="font-medium text-ink-2">{start}</span>
            <span className="mx-1">–</span>
            <span className="font-medium text-ink-2">{end}</span>
            <span className="ml-1">sur</span>{" "}
            <span className="font-medium text-ink-2">
              {totalCount.toLocaleString("fr-FR")}
            </span>{" "}
            {itemNoun}
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[12px] text-muted tabular-nums">
          Page <span className="font-medium text-ink-2">{safePage}</span>
          <span className="mx-1">/</span>
          <span className="font-medium text-ink-2">{totalPages}</span>
        </span>

        <PageButton
          href={hrefFor(safePage - 1)}
          disabled={!canPrev}
          ariaLabel="Page précédente"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
          <span>Précédent</span>
        </PageButton>

        <PageButton
          href={hrefFor(safePage + 1)}
          disabled={!canNext}
          ariaLabel="Page suivante"
        >
          <span>Suivant</span>
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.2} />
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({
  href,
  disabled,
  ariaLabel,
  children,
}: {
  href: string;
  disabled?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  const className = cn(
    "inline-flex h-8 items-center gap-1 rounded-lg border border-line-strong bg-white px-2.5 text-[12.5px] font-medium transition-colors",
    disabled
      ? "pointer-events-none text-muted-2 opacity-50"
      : "text-ink-2 hover:bg-canvas-2",
  );
  if (disabled) {
    return (
      <span className={className} aria-label={ariaLabel}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
