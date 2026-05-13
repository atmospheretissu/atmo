import { cn } from "@/lib/utils";

export type StatusTone =
  | "neutral"
  | "info"
  | "accent"
  | "violet"
  | "pink"
  | "orange"
  | "yellow"
  | "lime"
  | "blue"
  | "emerald"
  | "amber"
  | "success"
  | "warning"
  | "danger"
  | "muted";

const tones: Record<StatusTone, { dot: string; text: string; bg: string }> = {
  neutral: { dot: "bg-ink-3", text: "text-ink-2", bg: "bg-canvas-2" },
  info: { dot: "bg-blue", text: "text-blue", bg: "bg-blue-soft" },
  blue: { dot: "bg-blue", text: "text-blue", bg: "bg-blue-soft" },
  accent: { dot: "bg-violet", text: "text-violet-strong", bg: "bg-violet-soft" },
  violet: { dot: "bg-violet", text: "text-violet-strong", bg: "bg-violet-soft" },
  pink: { dot: "bg-pink", text: "text-pink", bg: "bg-pink-soft" },
  orange: { dot: "bg-orange", text: "text-orange", bg: "bg-orange-soft" },
  yellow: { dot: "bg-yellow", text: "text-ink", bg: "bg-yellow-soft" },
  lime: { dot: "bg-lime", text: "text-ink", bg: "bg-lime-soft" },
  emerald: { dot: "bg-emerald", text: "text-emerald", bg: "bg-emerald-soft" },
  amber: { dot: "bg-amber", text: "text-amber", bg: "bg-amber-soft" },
  success: { dot: "bg-emerald", text: "text-emerald", bg: "bg-emerald-soft" },
  warning: { dot: "bg-amber", text: "text-amber", bg: "bg-amber-soft" },
  danger: { dot: "bg-red", text: "text-red", bg: "bg-red-soft" },
  muted: { dot: "bg-muted-2", text: "text-muted", bg: "bg-canvas-2" },
};

interface StatusPillProps {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
  pulse?: boolean;
}

export function StatusPill({
  tone = "neutral",
  children,
  className,
  dot = true,
  pulse = false,
}: StatusPillProps) {
  const t = tones[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11.5px] font-medium rounded-full",
        t.text,
        t.bg,
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            t.dot,
            pulse && "animate-pulse-soft"
          )}
        />
      )}
      <span>{children}</span>
    </span>
  );
}

/* Color chip — icon container with branded background */
const chipTones = {
  violet: "bg-violet-soft text-violet-strong",
  pink: "bg-pink-soft text-pink",
  orange: "bg-orange-soft text-orange",
  yellow: "bg-yellow-soft text-ink",
  lime: "bg-lime-soft text-ink",
  emerald: "bg-emerald-soft text-emerald",
  blue: "bg-blue-soft text-blue",
  amber: "bg-amber-soft text-amber",
  ink: "bg-ink text-white",
} as const;

export type ChipTone = keyof typeof chipTones;

export function ColorChip({
  tone = "violet",
  size = "md",
  children,
  className,
}: {
  tone?: ChipTone;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
}) {
  const sizes = {
    sm: "h-6 w-6 rounded-[6px]",
    md: "h-8 w-8 rounded-[8px]",
    lg: "h-10 w-10 rounded-[10px]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center shrink-0",
        chipTones[tone],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
