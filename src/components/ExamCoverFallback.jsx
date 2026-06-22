// Default exam cover when the teacher hasn't uploaded one: a self-contained,
// theme-independent "math banner" — brand gradient + blueprint grid + a curve
// and a bold formula. The gradient and formula are picked deterministically
// from the exam id, so each exam keeps a stable look but the list stays varied.
const GRADIENTS = [
  ["#4f46e5", "#7c3aed"], // indigo → violet
  ["#2563eb", "#0891b2"], // blue → cyan
  ["#0ea5e9", "#6366f1"], // sky → indigo
  ["#7c3aed", "#db2777"], // violet → pink
  ["#0f766e", "#0ea5e9"], // teal → sky
  ["#1e3a8a", "#4f46e5"], // navy → indigo
];

const FORMULAS = [
  "a² + b² = c²",
  "f(x) = ax² + bx + c",
  "√(x² + y²)",
  "sin²θ + cos²θ = 1",
  "Δ = b² − 4ac",
  "(a + b)² = a² + 2ab + b²",
  "∫ f(x) dx",
  "π · r²",
];

// Scattered decorative math glyphs (small, faint).
const GLYPHS = [
  { t: "√x", x: 56, y: 44, s: 18 },
  { t: "π", x: 250, y: 38, s: 22 },
  { t: "∑", x: 430, y: 56, s: 24 },
  { t: "∫", x: 150, y: 168, s: 22 },
  { t: "θ", x: 360, y: 176, s: 18 },
  { t: "∞", x: 300, y: 150, s: 18 },
];

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) >>> 0;
  return h;
};

const ExamCoverFallback = ({ seed = "", className = "" }) => {
  const h = hash(seed);
  const [c1, c2] = GRADIENTS[h % GRADIENTS.length];
  const formula = FORMULAS[(h >> 3) % FORMULAS.length];
  const gid = `examcover-${h.toString(36)}`;

  return (
    <svg
      viewBox="0 0 480 200"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={`h-full w-full ${className}`}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="480" height="200" fill={`url(#${gid})`} />

      {/* blueprint grid */}
      <g stroke="#ffffff" strokeOpacity="0.09" strokeWidth="1">
        {Array.from({ length: 20 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 24} y1="0" x2={i * 24} y2="200" />
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 24} x2="480" y2={i * 24} />
        ))}
      </g>

      {/* curve + axes + circle */}
      <line x1="280" y1="150" x2="470" y2="150" stroke="#fff" strokeOpacity="0.22" strokeWidth="1.5" />
      <line x1="320" y1="20" x2="320" y2="185" stroke="#fff" strokeOpacity="0.22" strokeWidth="1.5" />
      <path d="M250 36 Q330 210 410 36" stroke="#fff" strokeOpacity="0.32" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="408" cy="150" r="58" stroke="#fff" strokeOpacity="0.12" strokeWidth="2" fill="none" />

      {/* scattered glyphs */}
      <g fill="#ffffff" fillOpacity="0.16" fontFamily="ui-serif, Georgia, serif" fontStyle="italic" fontWeight="700">
        {GLYPHS.map((g, i) => (
          <text key={i} x={g.x} y={g.y} fontSize={g.s}>
            {g.t}
          </text>
        ))}
      </g>

      {/* headline formula */}
      <text
        x="32"
        y="118"
        fontFamily="ui-serif, Georgia, serif"
        fontStyle="italic"
        fontWeight="700"
        fontSize="30"
        fill="#ffffff"
        fillOpacity="0.92"
      >
        {formula}
      </text>
    </svg>
  );
};

export default ExamCoverFallback;
