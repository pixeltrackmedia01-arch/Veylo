import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Side-view car illustration, recoloured to any paint shade. Used wherever a
 * licensed photograph hasn't been uploaded yet, so listings never show
 * borrowed manufacturer or third-party images.
 */

type Shape = {
  body: string;
  glass: string;
  pillar: number;
  belt: number;
  wheels: [number, number];
  wheelY: number;
  r: number;
  head: [number, number];
  tail: [number, number];
};

const SHAPES: Record<"hatchback" | "sedan" | "suv" | "muv", Shape> = {
  hatchback: {
    body: "M40 150 C36 128 44 116 66 112 L150 100 C176 74 198 62 224 58 L332 56 C360 58 382 74 400 100 L410 118 C415 132 414 144 410 150 Z",
    glass: "M164 100 C186 80 202 70 226 67 L328 65 C350 67 368 80 384 100 Z",
    pillar: 268,
    belt: 104,
    wheels: [120, 352],
    wheelY: 150,
    r: 30,
    head: [52, 118],
    tail: [400, 112],
  },
  sedan: {
    body: "M30 150 C26 130 34 118 56 114 L156 102 C184 78 204 66 232 62 L324 60 C346 62 362 74 384 96 L436 102 C446 106 450 120 448 150 Z",
    glass: "M170 102 C194 82 210 72 234 70 L320 68 C340 70 354 80 372 98 Z",
    pillar: 272,
    belt: 106,
    wheels: [116, 372],
    wheelY: 150,
    r: 30,
    head: [42, 120],
    tail: [436, 110],
  },
  suv: {
    body: "M36 152 C32 126 40 110 62 106 L146 96 C168 66 188 50 214 46 L352 44 C372 46 386 58 400 84 L414 104 C420 120 420 140 414 152 Z",
    glass: "M160 96 C180 70 196 58 218 55 L348 53 C364 55 376 66 388 88 L392 96 Z",
    pillar: 274,
    belt: 100,
    wheels: [120, 352],
    wheelY: 150,
    r: 33,
    head: [48, 112],
    tail: [406, 100],
  },
  muv: {
    body: "M30 152 C26 126 34 110 56 106 L136 96 C158 68 178 54 204 50 L404 48 C420 50 428 60 432 80 L438 110 C442 126 442 140 438 152 Z",
    glass: "M150 96 C170 72 186 60 208 58 L400 56 C414 58 420 66 422 82 L424 96 Z",
    pillar: 262,
    belt: 100,
    wheels: [114, 368],
    wheelY: 150,
    r: 32,
    head: [42, 112],
    tail: [430, 100],
  },
};

function shapeFor(body: string | null | undefined): Shape {
  if (body === "sedan") return SHAPES.sedan;
  if (body === "hatchback") return SHAPES.hatchback;
  if (body === "muv" || body === "minivan") return SHAPES.muv;
  return SHAPES.suv;
}

function shade(hex: string, amount: number) {
  const n = hex.replace("#", "");
  const full = n.length === 3 ? n.split("").map((c) => c + c).join("") : n.padEnd(6, "0");
  const parts = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  const mixed = parts.map((c) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount)));
  return `#${mixed.map((c) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, "0")).join("")}`;
}

export function CarArt({
  body,
  color = "#c8102e",
  className,
  title,
}: {
  body?: string | null;
  color?: string;
  className?: string;
  title?: string;
}) {
  const id = useId().replace(/:/g, "");
  const s = shapeFor(body);
  const isLight = parseInt(color.replace("#", "").padEnd(6, "0").slice(0, 2), 16) > 200;
  return (
    <svg
      viewBox="0 0 480 190"
      className={cn("h-auto w-full", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={`paint-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(color, 0.35)} />
          <stop offset="0.45" stopColor={color} />
          <stop offset="1" stopColor={shade(color, -0.45)} />
        </linearGradient>
        <linearGradient id={`glass-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b3442" />
          <stop offset="0.55" stopColor="#141a23" />
          <stop offset="1" stopColor="#3a4656" />
        </linearGradient>
        <clipPath id={`glass-clip-${id}`}>
          <path d={s.glass} />
        </clipPath>
        <radialGradient id={`rim-${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#e7eaee" />
          <stop offset="0.7" stopColor="#9aa1aa" />
          <stop offset="1" stopColor="#5d646d" />
        </radialGradient>
      </defs>

      <ellipse cx="240" cy={s.wheelY + s.r - 2} rx="210" ry="9" fill="#0b0f14" opacity="0.18" />

      {/* Wheel wells */}
      {s.wheels.map((x) => (
        <circle key={`well-${x}`} cx={x} cy={s.wheelY} r={s.r + 5} fill="#0e1116" />
      ))}

      <path d={s.body} fill={`url(#paint-${id})`} stroke={shade(color, -0.55)} strokeWidth="1.5" />
      {/* Re-cut the arches over the body */}
      {s.wheels.map((x) => (
        <path
          key={`arch-${x}`}
          d={`M${x - s.r - 6} ${s.wheelY + 2} A${s.r + 6} ${s.r + 6} 0 0 1 ${x + s.r + 6} ${s.wheelY + 2} Z`}
          fill="#0e1116"
        />
      ))}

      {/* Shoulder highlight and lower body shadow */}
      <path
        d={`M70 ${s.belt + 4} L${s.tail[0] - 6} ${s.belt - 2}`}
        stroke={shade(color, 0.55)}
        strokeWidth="2"
        opacity={isLight ? 0.4 : 0.55}
        strokeLinecap="round"
      />
      <path d={`M60 ${s.wheelY - 6} L${s.tail[0]} ${s.wheelY - 6}`} stroke={shade(color, -0.6)} strokeWidth="3" opacity="0.35" />

      <path d={s.glass} fill={`url(#glass-${id})`} />
      <rect x={s.pillar - 5} y={0} width="10" height={s.belt} fill={shade(color, -0.35)} clipPath={`url(#glass-clip-${id})`} />
      <path d={`M${s.pillar} ${s.belt} L${s.pillar} ${s.wheelY - 8}`} stroke={shade(color, -0.5)} strokeWidth="1.5" opacity="0.7" />
      <rect x={s.pillar - 46} y={s.belt + 8} width="18" height="4" rx="2" fill={shade(color, -0.5)} opacity="0.8" />
      <rect x={s.pillar + 22} y={s.belt + 8} width="18" height="4" rx="2" fill={shade(color, -0.5)} opacity="0.8" />

      {/* Lamps */}
      <rect x={s.head[0]} y={s.head[1]} width="26" height="8" rx="4" fill="#fdf6d8" stroke="#c9c2a1" strokeWidth="1" />
      <rect x={s.tail[0] - 4} y={s.tail[1]} width="10" height="12" rx="3" fill="#d81f2a" />

      {/* Wheels */}
      {s.wheels.map((x) => (
        <g key={`wheel-${x}`}>
          <circle cx={x} cy={s.wheelY} r={s.r} fill="#15181d" />
          <circle cx={x} cy={s.wheelY} r={s.r * 0.62} fill={`url(#rim-${id})`} />
          {[0, 72, 144, 216, 288].map((a) => (
            <line
              key={a}
              x1={x}
              y1={s.wheelY}
              x2={x + Math.cos((a * Math.PI) / 180) * s.r * 0.58}
              y2={s.wheelY + Math.sin((a * Math.PI) / 180) * s.r * 0.58}
              stroke="#5d646d"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ))}
          <circle cx={x} cy={s.wheelY} r={s.r * 0.16} fill="#2a2f36" />
        </g>
      ))}
    </svg>
  );
}
