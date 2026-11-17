import type { LucideIcon } from "lucide-react";

// A "clay" 3D icon: a glossy tile with real thickness (a darker slab under
// the face), a specular highlight, and an extruded white glyph. Pure CSS, so
// it stays sharp at any size and costs nothing to load.

const TONES = {
  amber: ["#fde68a", "#f59e0b", "#b45309"],
  green: ["#bbf7d0", "#22c55e", "#15803d"],
  blue: ["#bfdbfe", "#3b82f6", "#1d4ed8"],
  pink: ["#fbcfe8", "#ec4899", "#be185d"],
  violet: ["#ddd6fe", "#8b5cf6", "#6d28d9"],
  teal: ["#99f6e4", "#14b8a6", "#0f766e"],
  orange: ["#fed7aa", "#f97316", "#c2410c"],
  slate: ["#e2e8f0", "#64748b", "#334155"],
} as const;

export type Tone = keyof typeof TONES;

export default function Icon3D({
  icon: Icon,
  tone = "amber",
  size = 48,
  className = "",
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: number;
  className?: string;
}) {
  const [hi, mid, lo] = TONES[tone];
  const r = Math.round(size * 0.3);
  const depth = Math.max(3, Math.round(size * 0.09));
  const lift = Math.max(1, Math.round(size * 0.03));
  return (
    <span
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size + depth }}
      aria-hidden
    >
      {/* Slab (the tile's thickness) + soft coloured floor shadow */}
      <span
        className="absolute inset-x-0 bottom-0"
        style={{
          height: size,
          borderRadius: r,
          background: `linear-gradient(to bottom, ${lo}, ${lo})`,
          boxShadow: `0 ${Math.round(size * 0.22)}px ${Math.round(size * 0.38)}px -${Math.round(size * 0.12)}px ${mid}aa`,
        }}
      />
      {/* Face */}
      <span
        className="absolute inset-x-0 top-0 flex items-center justify-center overflow-hidden"
        style={{
          height: size,
          borderRadius: r,
          background: `radial-gradient(120% 95% at 28% 12%, ${hi} 0%, ${mid} 52%, ${lo} 115%)`,
          boxShadow: `inset 0 ${lift}px ${lift * 2}px rgba(255,255,255,.7), inset 0 -${Math.round(size * 0.08)}px ${Math.round(size * 0.14)}px rgba(0,0,0,.18)`,
        }}
      >
        {/* Gloss */}
        <span
          className="absolute"
          style={{
            left: "10%",
            right: "10%",
            top: "5%",
            height: "40%",
            borderRadius: `${r}px ${r}px 50% 50%`,
            background: "linear-gradient(to bottom, rgba(255,255,255,.6), rgba(255,255,255,0))",
          }}
        />
        <Icon
          className="relative"
          strokeWidth={2.5}
          style={{
            width: size * 0.5,
            height: size * 0.5,
            color: "#fff",
            filter: `drop-shadow(0 ${lift}px 0 ${lo}) drop-shadow(0 ${lift * 2}px 0 ${lo}) drop-shadow(0 ${Math.round(size * 0.08)}px ${Math.round(size * 0.08)}px rgba(0,0,0,.35))`,
          }}
        />
      </span>
    </span>
  );
}
