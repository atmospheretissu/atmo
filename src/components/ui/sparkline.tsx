import { cn } from "@/lib/utils";

type Stop = { offset: string; color: string };

const palettes: Record<string, { stroke: Stop[]; fill: Stop[] }> = {
  violet: {
    stroke: [
      { offset: "0%", color: "#8B5CF6" },
      { offset: "100%", color: "#EC4899" },
    ],
    fill: [
      { offset: "0%", color: "rgba(139, 92, 246, 0.18)" },
      { offset: "100%", color: "rgba(236, 72, 153, 0.02)" },
    ],
  },
  orange: {
    stroke: [
      { offset: "0%", color: "#F97316" },
      { offset: "100%", color: "#FACC15" },
    ],
    fill: [
      { offset: "0%", color: "rgba(249, 115, 22, 0.16)" },
      { offset: "100%", color: "rgba(250, 204, 21, 0.02)" },
    ],
  },
  pink: {
    stroke: [
      { offset: "0%", color: "#EC4899" },
      { offset: "100%", color: "#F97316" },
    ],
    fill: [
      { offset: "0%", color: "rgba(236, 72, 153, 0.16)" },
      { offset: "100%", color: "rgba(249, 115, 22, 0.02)" },
    ],
  },
  emerald: {
    stroke: [
      { offset: "0%", color: "#10B981" },
      { offset: "100%", color: "#84CC16" },
    ],
    fill: [
      { offset: "0%", color: "rgba(16, 185, 129, 0.18)" },
      { offset: "100%", color: "rgba(132, 204, 22, 0.02)" },
    ],
  },
  blue: {
    stroke: [
      { offset: "0%", color: "#3B82F6" },
      { offset: "100%", color: "#8B5CF6" },
    ],
    fill: [
      { offset: "0%", color: "rgba(59, 130, 246, 0.18)" },
      { offset: "100%", color: "rgba(139, 92, 246, 0.02)" },
    ],
  },
};

export type SparkPalette = keyof typeof palettes;

export function Sparkline({
  data,
  palette = "violet",
  width = 140,
  height = 48,
  className,
  showDot = true,
}: {
  data: number[];
  palette?: SparkPalette;
  width?: number;
  height?: number;
  className?: string;
  showDot?: boolean;
}) {
  if (data.length < 2) return null;
  const id = `spark-${palette}-${data.length}-${Math.round(data[0])}`;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 4;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const step = innerW / (data.length - 1);
  const points = data.map((v, i) => {
    const x = pad + i * step;
    const y = pad + innerH - ((v - min) / range) * innerH;
    return [x, y] as const;
  });

  // Smooth path with quadratic bezier
  const d = points
    .map(([x, y], i) => {
      if (i === 0) return `M ${x},${y}`;
      const [px, py] = points[i - 1];
      const cx = (px + x) / 2;
      return `Q ${cx},${py} ${cx},${(py + y) / 2} T ${x},${y}`;
    })
    .join(" ");

  const areaD = `${d} L ${pad + innerW},${height} L ${pad},${height} Z`;

  const last = points[points.length - 1];
  const p = palettes[palette];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-stroke`} x1="0%" y1="0%" x2="100%" y2="0%">
          {p.stroke.map((s, i) => (
            <stop key={i} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
        <linearGradient id={`${id}-fill`} x1="0%" y1="0%" x2="0%" y2="100%">
          {p.fill.map((s, i) => (
            <stop key={i} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${id}-fill)`} />
      <path
        d={d}
        fill="none"
        stroke={`url(#${id}-stroke)`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDot && (
        <>
          <circle cx={last[0]} cy={last[1]} r="6" fill={p.stroke[1].color} opacity="0.16" />
          <circle cx={last[0]} cy={last[1]} r="3" fill="white" stroke={p.stroke[1].color} strokeWidth="2" />
        </>
      )}
    </svg>
  );
}
