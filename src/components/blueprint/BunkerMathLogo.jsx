// BunkerMath brand mark: a cobalt "bunker" tile (a strong container) holding a
// white coordinate plane with a RISING results line — math (axes + plot) plus the
// product's promise (your exam scores going up). `showText` adds the wordmark.
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
      {/* coordinate axes (faint) */}
      <path d="M11 28 H31" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 28 V10" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.5" strokeLinecap="round" />
      {/* rising results line */}
      <path
        d="M11 24 L17.5 19 L23 21 L30 11"
        stroke="#fff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* data nodes — the goal/peak accented */}
      <circle cx="17.5" cy="19" r="1.55" fill="#fff" />
      <circle cx="23" cy="21" r="1.55" fill="#fff" />
      <circle cx="30" cy="11" r="2.7" fill="#fff" />
    </svg>
    {showText && (
      <span className={`font-display text-[1.15rem] font-extrabold leading-none tracking-tight text-text ${textClassName}`}>
        Bunker<span className="text-primary">Math</span>
      </span>
    )}
  </span>
);

export default BunkerMathLogo;
