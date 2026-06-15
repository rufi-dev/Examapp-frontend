import { Link } from "react-router-dom";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 ease-out-quint focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none";

const sizes = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-7 text-base",
};

const variants = {
  primary:
    "bg-primary text-primary-fg shadow-soft hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-glow active:translate-y-0",
  secondary:
    "bg-surface text-text border border-line hover:bg-surface2 hover:-translate-y-0.5",
  ghost: "text-text hover:bg-surface2",
  soft: "bg-primary/12 text-primary hover:bg-primary/20",
  outline:
    "border-2 border-primary text-primary hover:bg-primary hover:text-primary-fg hover:-translate-y-0.5",
  danger: "bg-danger text-white hover:opacity-90 hover:-translate-y-0.5",
};

export default function Button({
  variant = "primary",
  size = "md",
  to,
  href,
  className = "",
  children,
  ...props
}) {
  const cls = `${base} ${sizes[size]} ${variants[variant] || variants.primary} ${className}`;
  if (to) {
    return (
      <Link to={to} className={cls} {...props}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls} {...props}>
        {children}
      </a>
    );
  }
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
