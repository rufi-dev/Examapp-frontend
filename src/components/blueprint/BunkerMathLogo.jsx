// BunkerMath brand mark: a "blueprint tile" — a cobalt rounded square holding a
// white coordinate axis + parabola (the product is math, drawn on graph paper).
// `showText` renders the wordmark beside it.
const BunkerMathLogo = ({ size = 36, showText = true, className = "", textClassName = "" }) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden={showText ? true : undefined}
      role={showText ? undefined : "img"}
      className="shrink-0"
    >
      {!showText && <title>BunkerMath</title>}
      <rect x="1.5" y="1.5" width="37" height="37" rx="10" className="fill-primary" />
      {/* faint inner graph paper */}
      {[12, 20, 28].map((p) => (
        <line key={`v${p}`} x1={p} y1="6" x2={p} y2="34" stroke="#fff" strokeOpacity="0.18" strokeWidth="1" />
      ))}
      {[12, 20, 28].map((p) => (
        <line key={`h${p}`} x1="6" y1={p} x2="34" y2={p} stroke="#fff" strokeOpacity="0.18" strokeWidth="1" />
      ))}
      {/* axes */}
      <line x1="7" y1="28" x2="33" y2="28" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" />
      {/* parabola */}
      <path d="M10 12 Q20 38 30 12" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <circle cx="20" cy="27.5" r="2" fill="#fff" />
    </svg>
    {showText && (
      <span className={`font-display text-[1.15rem] font-extrabold leading-none tracking-tight text-text ${textClassName}`}>
        Bunker<span className="text-primary">Math</span>
      </span>
    )}
  </span>
);

export default BunkerMathLogo;
