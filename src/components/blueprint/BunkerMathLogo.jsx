// BunkerMath brand mark — the official shield emblem (transparent PNG) plus an
// optional "BunkerMath" wordmark, as a clean horizontal lockup that stays crisp
// at any size. `size` sets the shield height in px; `showText` toggles the
// wordmark; `textClassName` tweaks it (e.g. text-white on dark backgrounds).
const BunkerMathLogo = ({
  size = 40,
  className = "",
  showText = true,
  textClassName = "",
  light = false, // white wordmark for use over dark/coloured backgrounds
  variant, // legacy, ignored
  ...rest
}) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`} {...rest}>
    <img
      src="/bunker-icon.png"
      alt={showText ? "" : "BunkerMath"}
      style={{ height: size }}
      className="w-auto select-none object-contain"
      draggable={false}
    />
    {showText && (
      <span
        className={`font-display text-xl font-bold leading-none tracking-tight ${
          light ? "text-white" : "text-text"
        } ${textClassName}`}
      >
        Bunker<span className={light ? "text-amber-300" : "text-primary"}>Math</span>
      </span>
    )}
  </span>
);

export default BunkerMathLogo;
