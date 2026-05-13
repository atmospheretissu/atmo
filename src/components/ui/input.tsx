import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-[13.5px] text-ink placeholder:text-muted-2 transition-colors",
        "hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-paper-2",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-[12px] font-medium text-ink-2 mb-1.5", className)}
      {...props}
    />
  );
}

export const Hint = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <p className={cn("text-[11.5px] text-muted mt-1", className)}>{children}</p>;

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          "flex h-9 w-full appearance-none rounded-md border border-line-strong bg-surface px-3 pr-8 text-[13.5px] text-ink transition-colors",
          "hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="m3 4.5 3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
