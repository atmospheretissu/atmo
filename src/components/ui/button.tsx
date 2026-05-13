import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-[13px] font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-white hover:bg-ink-2",
        accent:
          "bg-violet text-white hover:bg-violet-strong",
        lime:
          "bg-lime text-ink hover:bg-lime/90",
        secondary:
          "bg-white text-ink border border-line-strong hover:bg-canvas-2",
        ghost:
          "text-ink-2 hover:text-ink hover:bg-canvas-2",
        outline:
          "border border-line-strong text-ink hover:bg-canvas-2",
        danger:
          "bg-red text-white hover:bg-red/90",
        link:
          "text-violet underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[12.5px]",
        md: "h-9 px-4",
        lg: "h-10 px-5 text-[14px]",
        xl: "h-12 px-6 text-[14.5px]",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
