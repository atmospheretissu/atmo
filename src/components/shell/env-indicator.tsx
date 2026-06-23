import { getAppEnv } from "@/lib/env";

const STYLES = {
  prod: { pill: "bg-blue-soft text-blue border border-blue/20", label: "PROD" },
  dev: { pill: "bg-pink-soft text-pink border border-pink/30", label: "DEV" },
  local: { pill: "bg-amber-soft text-amber border border-amber/30", label: "LOCAL" },
} as const;

export function EnvBadge({ className = "" }: { className?: string }) {
  const env = getAppEnv();
  const style = STYLES[env];
  return (
    <span
      className={
        "inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold tracking-wider " +
        style.pill +
        " " +
        className
      }
    >
      {style.label}
    </span>
  );
}
