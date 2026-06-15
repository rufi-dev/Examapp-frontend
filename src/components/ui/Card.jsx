export default function Card({
  as: Tag = "div",
  interactive = false,
  className = "",
  children,
  ...props
}) {
  return (
    <Tag
      className={`rounded-2xl border border-line bg-surface shadow-soft ${
        interactive
          ? "transition-all duration-200 ease-out-quint hover:-translate-y-1 hover:shadow-lift"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}
