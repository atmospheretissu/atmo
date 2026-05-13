import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeltaProps {
  value: string;
  positive?: boolean;
  className?: string;
}

export function DeltaBadge({ value, positive, className }: DeltaProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 h-5 rounded-md text-[11px] font-semibold tabular-nums",
        positive ? "bg-emerald-soft text-emerald" : "bg-amber-soft text-amber",
        className
      )}
    >
      {positive ? (
        <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} />
      ) : (
        <ArrowDownRight className="h-3 w-3" strokeWidth={2.5} />
      )}
      {value}
    </span>
  );
}

interface AvatarStackProps {
  avatars: { initials: string; tone: "violet" | "pink" | "orange" | "lime" | "blue" }[];
  size?: "sm" | "md";
  extra?: number;
  className?: string;
}

const tones = {
  violet: "bg-violet text-white",
  pink: "bg-pink text-white",
  orange: "bg-orange text-white",
  lime: "bg-lime text-ink",
  blue: "bg-blue text-white",
};

export function AvatarStack({ avatars, size = "sm", extra, className }: AvatarStackProps) {
  const sizes = {
    sm: "h-6 w-6 text-[10px] -ml-1.5",
    md: "h-7 w-7 text-[11px] -ml-2",
  };
  return (
    <div className={cn("flex items-center pl-1.5", className)}>
      {avatars.slice(0, 4).map((a, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex items-center justify-center rounded-full font-medium ring-2 ring-white first:ml-0",
            tones[a.tone],
            sizes[size]
          )}
        >
          {a.initials}
        </span>
      ))}
      {extra && extra > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full font-medium ring-2 ring-white bg-canvas-2 text-ink-3",
            sizes[size]
          )}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
