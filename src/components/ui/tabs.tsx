"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
}
const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  onValueChange,
  defaultValue,
  children,
  className,
}: {
  value?: string;
  onValueChange?: (v: string) => void;
  defaultValue?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const isControlled = value !== undefined;
  const v = isControlled ? value : internal;
  const setV = (next: string) => {
    if (!isControlled) setInternal(next);
    onValueChange?.(next);
  };
  return (
    <TabsContext.Provider value={{ value: v, setValue: setV }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-stretch gap-0 border-b border-line",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value: triggerValue,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be inside Tabs");
  const active = ctx.value === triggerValue;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => ctx.setValue(triggerValue)}
      className={cn(
        "relative px-4 py-2.5 text-[13px] font-medium transition-colors -mb-px",
        active
          ? "text-ink border-b-2 border-ink"
          : "text-muted border-b-2 border-transparent hover:text-ink-2",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value: contentValue,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be inside Tabs");
  if (ctx.value !== contentValue) return null;
  return (
    <div role="tabpanel" className={cn("animate-fade-up", className)}>
      {children}
    </div>
  );
}
