import { useEffect, useRef, useState } from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";

// On-brand custom dropdown (native <select> can't style its option list).
// options: array of strings, or { value, label }. onChange receives the value.
const Select = ({
  value,
  onChange,
  options = [],
  placeholder = "Seç",
  icon = null,
  className = "",
  id,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const selected = opts.find((o) => String(o.value) === String(value));

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-12 w-full items-center gap-2.5 rounded-xl border bg-surface px-3.5 text-left text-[15px] outline-none transition ${
          open ? "border-primary ring-4 ring-ring/25" : "border-line hover:border-primary/50"
        }`}
      >
        {icon && <span className="shrink-0 text-muted">{icon}</span>}
        <span className={`flex-1 truncate ${selected ? "text-text" : "text-muted/60"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <FiChevronDown
          className={`shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="scrollbar-thin animate-scale-in absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-line bg-surface p-1.5 shadow-lift"
        >
          {opts.map((o) => {
            const active = String(o.value) === String(value);
            return (
              <li key={o.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[15px] transition-colors ${
                    active
                      ? "bg-primary/12 font-semibold text-primary"
                      : "text-text hover:bg-surface2"
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {active && <FiCheck className="shrink-0 text-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Select;
