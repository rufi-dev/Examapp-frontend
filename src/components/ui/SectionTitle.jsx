export default function SectionTitle({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className = "",
}) {
  const centered = align === "center";
  return (
    <div className={`${centered ? "text-center mx-auto" : ""} max-w-2xl ${className}`}>
      {eyebrow && (
        <span
          className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary ${
            centered ? "justify-center" : ""
          }`}
        >
          <span className="h-px w-6 bg-primary/50" />
          {eyebrow}
        </span>
      )}
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-text sm:text-[2.5rem] sm:leading-[1.1]">
        {title}
      </h2>
      {subtitle && <p className="mt-3 leading-relaxed text-muted">{subtitle}</p>}
    </div>
  );
}
