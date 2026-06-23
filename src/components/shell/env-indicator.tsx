import { getAppEnv } from "@/lib/env";

const STYLES = {
  prod: {
    pill: "bg-blue-soft text-blue border border-blue/20",
    label: "PROD",
    banner: null,
  },
  dev: {
    pill: "bg-pink-soft text-pink border border-pink/30",
    label: "DEV",
    banner: "Environnement de DÉVELOPPEMENT · données fictives · ne pas utiliser pour les vrais clients",
  },
  local: {
    pill: "bg-amber-soft text-amber border border-amber/30",
    label: "LOCAL",
    banner: "Environnement LOCAL · base de données locale",
  },
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

export function EnvBanner() {
  const env = getAppEnv();
  const style = STYLES[env];
  if (!style.banner) return null;
  const bg = env === "dev" ? "bg-pink" : "bg-amber";
  return (
    <div className={`${bg} text-white text-center text-[12px] font-semibold tracking-wide py-1.5 px-4`}>
      {style.banner}
    </div>
  );
}
