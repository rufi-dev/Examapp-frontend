// BunkerMath brand mark — the official logo image (shield + wordmark + tagline).
// The image already contains the full lockup, so there's no separate text; the
// legacy `showText` / `textClassName` props are accepted and ignored so existing
// call sites keep working. `size` sets the rendered height in px.
const BunkerMathLogo = ({ size = 50, className = "", showText, textClassName, ...rest }) => (
  <img
    src="/bunker-logo.png"
    alt="BunkerMath"
    style={{ height: size }}
    className={`w-auto select-none object-contain ${className}`}
    draggable={false}
    {...rest}
  />
);

export default BunkerMathLogo;
