// BunkerMath — "Mathematical Blueprint" visual primitives.
// All SVG, token-coloured via `currentColor` (set a text-* class on the wrapper)
// and responsive (sized by the parent / w-h utilities). Decorative pieces are
// aria-hidden; meaningful diagrams accept a `title`.
import { MathText } from "../Math";

// ── Faint graph-paper / dot / axes background, edge-faded so it never fights
//    nearby text. Absolutely fills its (relative) parent.
export const MathGridBackground = ({
  variant = "graph",
  onDark = false,
  fade = true,
  className = "",
}) => {
  const cls = onDark
    ? "bg-graph-on-dark"
    : variant === "dots"
    ? "bg-dots"
    : variant === "fine"
    ? "bg-graph-fine"
    : "bg-graph";
  const mask = fade
    ? "[mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]"
    : "";
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 ${cls} ${mask} ${className}`} />
  );
};

// ── Coordinate plane (decorative backdrop): faint grid + stronger axes + ticks.
export const CoordinatePlane = ({ className = "" }) => (
  <svg viewBox="0 0 220 220" fill="none" aria-hidden className={className}>
    {Array.from({ length: 11 }).map((_, i) => (
      <line key={`v${i}`} x1={10 + i * 20} y1="8" x2={10 + i * 20} y2="212"
        stroke="currentColor" strokeOpacity="0.09" strokeWidth="1" />
    ))}
    {Array.from({ length: 11 }).map((_, i) => (
      <line key={`h${i}`} x1="8" y1={10 + i * 20} x2="212" y2={10 + i * 20}
        stroke="currentColor" strokeOpacity="0.09" strokeWidth="1" />
    ))}
    <line x1="8" y1="110" x2="212" y2="110" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" />
    <line x1="110" y1="8" x2="110" y2="212" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" />
    <path d="M212 110l-7-4v8z" fill="currentColor" fillOpacity="0.4" />
    <path d="M110 8l-4 7h8z" fill="currentColor" fillOpacity="0.4" />
  </svg>
);

// ── Parabola y = ax² + bx + c, drawn over a light grid. `draw` enables a
//    stroke-reveal animation on group hover (respects reduced-motion via CSS).
export const ParabolaCurve = ({ className = "", draw = false }) => (
  <svg viewBox="0 0 200 160" fill="none" aria-hidden className={className}>
    <line x1="10" y1="130" x2="190" y2="130" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
    <line x1="100" y1="12" x2="100" y2="150" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
    <path
      d="M22 24 Q100 200 178 24"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round"
      className={draw ? "[stroke-dasharray:420] [stroke-dashoffset:420] transition-[stroke-dashoffset] duration-700 ease-out group-hover:[stroke-dashoffset:0]" : ""}
    />
    <circle cx="100" cy="130" r="3.5" fill="currentColor" />
    <circle cx="61" cy="77" r="3" fill="currentColor" fillOpacity="0.6" />
    <circle cx="139" cy="77" r="3" fill="currentColor" fillOpacity="0.6" />
  </svg>
);

// ── Sine wave over one period.
export const SineWave = ({ className = "", draw = false }) => (
  <svg viewBox="0 0 200 120" fill="none" aria-hidden className={className}>
    <line x1="6" y1="60" x2="194" y2="60" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
    <path
      d="M10 60 C 35 8, 60 8, 75 60 S 115 112, 130 60 S 170 8, 190 60"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round"
      className={draw ? "[stroke-dasharray:300] [stroke-dashoffset:300] transition-[stroke-dashoffset] duration-700 ease-out group-hover:[stroke-dashoffset:0]" : ""}
    />
  </svg>
);

// ── Unit circle with radius, angle arc and sin/cos projections.
export const UnitCircle = ({ className = "" }) => (
  <svg viewBox="0 0 160 160" fill="none" aria-hidden className={className}>
    <line x1="12" y1="80" x2="148" y2="80" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
    <line x1="80" y1="12" x2="80" y2="148" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
    <circle cx="80" cy="80" r="56" stroke="currentColor" strokeWidth="2.5" />
    <line x1="80" y1="80" x2="120" y2="41" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="120" y1="41" x2="120" y2="80" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="3 3" />
    <path d="M104 80 A24 24 0 0 0 96 62" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="120" cy="41" r="3.5" fill="currentColor" />
  </svg>
);

// ── Right triangle with right-angle mark + a labelled angle.
export const TriangleDiagram = ({ className = "", label = "60°" }) => (
  <svg viewBox="0 0 200 160" fill="none" aria-hidden className={className}>
    <path d="M30 134 L170 134 L30 30 Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M30 122 L42 122 L42 134" stroke="currentColor" strokeWidth="1.6" />
    <path d="M150 134 A22 22 0 0 0 159 116" stroke="currentColor" strokeWidth="1.8" />
    <text x="148" y="126" fontSize="13" fontWeight="700" fill="currentColor">{label}</text>
    <circle cx="30" cy="30" r="3" fill="currentColor" />
    <circle cx="170" cy="134" r="3" fill="currentColor" />
    <circle cx="30" cy="134" r="3" fill="currentColor" />
  </svg>
);

// ── Number line with ticks and a highlighted point.
export const NumberLine = ({ className = "", point = 4 }) => (
  <svg viewBox="0 0 240 48" fill="none" aria-hidden className={className}>
    <line x1="10" y1="30" x2="230" y2="30" stroke="currentColor" strokeWidth="2" />
    <path d="M230 30l-8-4v8z" fill="currentColor" />
    {Array.from({ length: 8 }).map((_, i) => (
      <line key={i} x1={26 + i * 26} y1="24" x2={26 + i * 26} y2="36" stroke="currentColor" strokeWidth="1.6" />
    ))}
    <circle cx={26 + (point - 1) * 26} cy="30" r="5" fill="currentColor" />
  </svg>
);

// ── Small probability tree (two levels) with P labels.
export const ProbabilityTree = ({ className = "" }) => (
  <svg viewBox="0 0 200 160" fill="none" aria-hidden className={className}>
    <line x1="24" y1="80" x2="92" y2="40" stroke="currentColor" strokeWidth="2.2" />
    <line x1="24" y1="80" x2="92" y2="120" stroke="currentColor" strokeWidth="2.2" />
    <line x1="100" y1="36" x2="168" y2="20" stroke="currentColor" strokeOpacity="0.6" strokeWidth="2" />
    <line x1="100" y1="44" x2="168" y2="60" stroke="currentColor" strokeOpacity="0.6" strokeWidth="2" />
    <line x1="100" y1="116" x2="168" y2="100" stroke="currentColor" strokeOpacity="0.6" strokeWidth="2" />
    <line x1="100" y1="124" x2="168" y2="140" stroke="currentColor" strokeOpacity="0.6" strokeWidth="2" />
    <circle cx="24" cy="80" r="6" fill="currentColor" />
    {[[96, 40], [96, 120], [172, 20], [172, 60], [172, 100], [172, 140]].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="4.5" fill="currentColor" fillOpacity={i < 2 ? 1 : 0.6} />
    ))}
  </svg>
);

// ── 2×2 matrix with square brackets.
export const MatrixBracket = ({ className = "", values = [["a", "b"], ["c", "d"]] }) => (
  <svg viewBox="0 0 140 110" fill="none" aria-hidden className={className}>
    <path d="M18 14 H10 V96 H18" stroke="currentColor" strokeWidth="2.5" />
    <path d="M122 14 H130 V96 H122" stroke="currentColor" strokeWidth="2.5" />
    {values.flatMap((row, r) =>
      row.map((v, c) => (
        <text key={`${r}-${c}`} x={42 + c * 52} y={48 + r * 36} fontSize="22" fontWeight="600"
          textAnchor="middle" fill="currentColor" fontStyle="italic">{v}</text>
      ))
    )}
  </svg>
);

// ── Faint, scattered formula fragments — pure decoration behind hero/sections.
export const FormulaScatter = ({ className = "" }) => {
  const items = [
    { t: "$\\Delta = b^2 - 4ac$", x: "4%", y: "14%", s: "text-lg" },
    { t: "$f(x) = ax^2 + bx + c$", x: "58%", y: "8%", s: "text-base" },
    { t: "$\\sin^2\\theta + \\cos^2\\theta = 1$", x: "66%", y: "76%", s: "text-base" },
    { t: "$\\frac{-b \\pm \\sqrt{\\Delta}}{2a}$", x: "8%", y: "72%", s: "text-lg" },
    { t: "$\\int_a^b f(x)\\,dx$", x: "40%", y: "90%", s: "text-sm" },
    { t: "$P(A) = \\frac{3}{8}$", x: "84%", y: "40%", s: "text-sm" },
  ];
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 select-none ${className}`}>
      {items.map((it, i) => (
        <span
          key={i}
          className={`absolute font-display text-text/[0.07] ${it.s}`}
          style={{ left: it.x, top: it.y }}
        >
          <MathText text={it.t} />
        </span>
      ))}
    </div>
  );
};

// ── Radial score ring (analytics). `value`/`max` → arc; centre shows value.
export const RadialScore = ({ value = 78, max = 100, size = 132, label = "bal", className = "" }) => {
  // Scale the stroke + text with the ring so small rings don't overflow/overlap.
  const stroke = Math.max(6, Math.round(size * 0.075));
  const r = (size - stroke - 2) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const valueFs = Math.round(size * 0.26);
  const labelFs = Math.max(9, Math.round(size * 0.092));
  return (
    <div className={`relative inline-grid place-items-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          className="text-primary transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <span className="absolute flex max-w-full flex-col items-center px-1 text-center leading-none">
        <span className="font-display font-extrabold text-text" style={{ fontSize: valueFs }}>{value}</span>
        <span className="mt-1 font-medium text-muted" style={{ fontSize: labelFs }}>{label}</span>
      </span>
    </div>
  );
};

// ── Labelled mastery bar (analytics). Colour by tone (good/mid/weak).
export const SkillBar = ({ label, value, tone = "primary" }) => {
  const bar =
    tone === "weak" ? "bg-danger" : tone === "mid" ? "bg-warning" : tone === "good" ? "bg-success" : "bg-primary";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-text">{label}</span>
        <span className="font-semibold tabular-nums text-muted">{value}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface2">
        <div
          className={`h-full rounded-full ${bar} transition-[width] duration-1000 ease-out`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
};
