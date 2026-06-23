export type AppEnv = "prod" | "dev" | "local";

export function getAppEnv(): AppEnv {
  const raw = (process.env.NEXT_PUBLIC_APP_ENV ?? "").toLowerCase();
  if (raw === "dev" || raw === "development") return "dev";
  if (raw === "local") return "local";
  return "prod";
}

export function isDevEnv(): boolean {
  return getAppEnv() === "dev";
}
