import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "full" | "mark";
}

export function Logo({ className, variant = "full" }: LogoProps) {
  if (variant === "mark") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center h-9 w-9 rounded-[10px] bg-yellow shadow-sm shadow-yellow/30 shrink-0",
          className
        )}
      >
        <svg viewBox="0 0 20 20" className="h-4.5 w-4.5 text-ink" fill="none">
          <path
            d="M4 14 L8 5 L11 11 L10 11 L15 5 L14 12 L11 12 L13 17"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="currentColor"
          />
        </svg>
      </span>
    );
  }
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <Logo variant="mark" />
      <div className="flex flex-col leading-none">
        <span className="text-[14.5px] font-semibold text-ink tracking-tight">
          Atmosphère
        </span>
        <span className="font-mono text-[9.5px] tracking-[0.15em] text-muted uppercase mt-1">
          Tissus · Plateforme
        </span>
      </div>
    </div>
  );
}
