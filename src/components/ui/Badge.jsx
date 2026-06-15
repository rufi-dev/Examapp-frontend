const tones = {
  primary: "bg-primary/12 text-primary",
  neutral: "bg-surface2 text-muted",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-text",
  danger: "bg-danger/12 text-danger",
  accent: "bg-accent2/15 text-accent2",
};

export default function Badge({ tone = "neutral", className = "", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        tones[tone] || tones.neutral
      } ${className}`}
    >
      {children}
    </span>
  );
}
