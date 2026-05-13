"use client";

import { cn } from "@/lib/utils";

type SubItem = {
  key: string;
  label: string;
  count: number;
  color: "ink" | "blue" | "violet" | "emerald" | "orange" | "pink" | "amber" | "gray";
};

const dots: Record<SubItem["color"], string> = {
  ink: "bg-ink",
  blue: "bg-blue",
  violet: "bg-violet",
  emerald: "bg-emerald",
  orange: "bg-orange",
  pink: "bg-pink",
  amber: "bg-amber",
  gray: "bg-muted-2",
};

export function SubSidebar({
  title,
  items,
  active,
  onChange,
  extra,
}: {
  title?: string;
  items: SubItem[];
  active: string;
  onChange: (key: string) => void;
  extra?: React.ReactNode;
}) {
  return (
    <aside className="w-56 shrink-0 border-r border-line py-5 px-2 sticky top-14 self-start h-[calc(100vh-3.5rem)] overflow-y-auto">
      {title && (
        <p className="px-2.5 pb-2 text-[10.5px] font-semibold tracking-wider uppercase text-muted-2">
          {title}
        </p>
      )}
      <nav className="space-y-0.5">
        {items.map((it) => {
          const isActive = it.key === active;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              className={cn(
                "w-full group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                isActive
                  ? "bg-canvas-2 text-ink font-medium"
                  : "text-ink-3 hover:bg-canvas-2/60 hover:text-ink"
              )}
            >
              <span className={cn("h-3 w-3 rounded-[3px] shrink-0", dots[it.color])} />
              <span className="flex-1 text-left truncate">{it.label}</span>
              <span className="text-[11.5px] text-muted-2 tabular-nums">{it.count}</span>
            </button>
          );
        })}
      </nav>
      {extra && <div className="mt-4">{extra}</div>}
    </aside>
  );
}
