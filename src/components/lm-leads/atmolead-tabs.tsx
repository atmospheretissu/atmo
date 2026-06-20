"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, ListChecks, MessageSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/leads-lm", label: "Leads", icon: Inbox, match: (p: string) => p === "/leads-lm" },
  {
    href: "/leads-lm/executions",
    label: "Exécutions",
    icon: ListChecks,
    match: (p: string) => p.startsWith("/leads-lm/executions"),
  },
  {
    href: "/leads-lm/sms",
    label: "SMS envoyés",
    icon: MessageSquare,
    match: (p: string) => p.startsWith("/leads-lm/sms"),
  },
  {
    href: "/leads-lm/config",
    label: "Configuration",
    icon: Settings,
    match: (p: string) => p.startsWith("/leads-lm/config"),
  },
] as const;

export function AtmoleadTabs() {
  const pathname = usePathname();
  return (
    <div className="px-8 -mt-2">
      <div className="inline-flex items-stretch gap-0 border-b border-line">
        {TABS.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-selected={active}
              className={cn(
                "relative inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors -mb-px",
                active
                  ? "text-ink border-b-2 border-ink"
                  : "text-muted border-b-2 border-transparent hover:text-ink-2",
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
