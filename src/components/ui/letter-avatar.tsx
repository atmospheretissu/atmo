import { cn } from "@/lib/utils";

const pastels = {
  yellow: "bg-pastel-yellow text-pastel-yellow-ink",
  pink: "bg-pastel-pink text-pastel-pink-ink",
  blue: "bg-pastel-blue text-pastel-blue-ink",
  green: "bg-pastel-green text-pastel-green-ink",
  purple: "bg-pastel-purple text-pastel-purple-ink",
  orange: "bg-pastel-orange text-pastel-orange-ink",
  gray: "bg-pastel-gray text-pastel-gray-ink",
};

export type PastelTone = keyof typeof pastels;

const sizes = {
  xs: "h-5 w-5 text-[9.5px]",
  sm: "h-6 w-6 text-[10.5px]",
  md: "h-7 w-7 text-[11.5px]",
  lg: "h-9 w-9 text-[13px]",
};

export function LetterAvatar({
  initial,
  tone = "gray",
  size = "sm",
  className,
  shape = "circle",
}: {
  initial: string;
  tone?: PastelTone;
  size?: keyof typeof sizes;
  className?: string;
  shape?: "circle" | "square";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-semibold shrink-0",
        shape === "circle" ? "rounded-full" : "rounded-[5px]",
        pastels[tone],
        sizes[size],
        className
      )}
    >
      {initial.slice(0, 1).toUpperCase()}
    </span>
  );
}

/* Deterministic tone picker from a string */
const toneList: PastelTone[] = ["yellow", "pink", "blue", "green", "purple", "orange", "gray"];
export function toneFor(seed: string): PastelTone {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return toneList[Math.abs(h) % toneList.length];
}

/* Avatar stack with overlap */
export function AvatarStack({
  items,
  size = "sm",
  className,
}: {
  items: { initial: string; tone?: PastelTone }[];
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center", className)}>
      {items.map((a, i) => (
        <span
          key={i}
          className="ring-2 ring-white rounded-full -ml-1.5 first:ml-0"
        >
          <LetterAvatar initial={a.initial} tone={a.tone ?? toneFor(a.initial)} size={size} />
        </span>
      ))}
    </div>
  );
}
