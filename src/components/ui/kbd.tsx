import { cn } from "@/lib/utils";

export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-paper-2 px-1 text-[10.5px] font-mono text-muted shadow-[inset_0_-1px_0_rgba(15,15,15,0.04)]",
        className
      )}
    >
      {children}
    </kbd>
  );
}
