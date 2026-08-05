// BunkerMath brand mark, built from the official logo art:
//   variant="emblem" (default) — the shield badge + "BunkerMath" wordmark, a clean
//                                horizontal lockup that stays crisp in headers.
//   variant="full"            — the full logo image (shield + wordmark + tagline)
//                                for roomy surfaces like the footer.
// `size` sets the emblem/image height in px. `showText` toggles the wordmark on
// the emblem variant; `textClassName` tweaks it (e.g. colour on dark backgrounds).
const BunkerMathLogo = ({
  size = 40,
  variant = "emblem",
  className = "",
  showText = true,
  textClassName = "",
  ...rest
}) => {
  if (variant === "full") {
    return (
      <img
        src="/bunker-logo.png"
        alt="BunkerMath"
        style={{ height: size }}
        className={`w-auto select-none object-contain ${className}`}
        draggable={false}
        {...rest}
      />
    );
  }
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} {...rest}>
      <img
        src="/bunker-emblem.png"
        alt={showText ? "" : "BunkerMath"}
        style={{ height: size }}
        className="w-auto select-none object-contain"
        draggable={false}
      />
      {showText && (
        <span
          className={`font-display text-xl font-bold leading-none tracking-tight text-text ${textClassName}`}
        >
          Bunker<span className="text-primary">Math</span>
        </span>
      )}
    </span>
  );
};

export default BunkerMathLogo;
