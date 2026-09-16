import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronDown } from "react-icons/fi";

const MAX_LIST_H = 256; // a long class list must scroll, not run off the screen

/*
 * On-brand custom dropdown (a native <select> can't style its option list, and
 * its list grows as tall as the data).
 * options: array of strings, or { value, label }. onChange receives the value.
 *
 * The list is PORTALLED to the body and positioned against the trigger: rendered
 * inline it gets clipped by any dialog or card it sits in (a `fixed`/absolute
 * child is cut off by an ancestor's overflow, and cards that lift on hover make
 * their own stacking context). It flips above the trigger when the space below
 * is too small, and never exceeds MAX_LIST_H.
 */
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
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const panelRef = useRef(null);
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const selected = opts.find((o) => String(o.value) === String(value));

  // Place the list under the trigger, flipping above when there isn't room.
  const place = useCallback(() => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const spaceBelow = window.innerHeight - r.bottom;
    const above = spaceBelow < Math.min(MAX_LIST_H, 200) && r.top > spaceBelow;
    setPos({
      left: r.left,
      width: r.width,
      top: above ? undefined : r.bottom + 8,
      bottom: above ? window.innerHeight - r.top + 8 : undefined,
      maxHeight: Math.max(160, Math.min(MAX_LIST_H, (above ? r.top : spaceBelow) - 16)),
    });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    // Follow the trigger while the page or a scrollable panel moves — one
    // reposition per frame, passive so it never holds up scrolling.
    let frame = 0;
    const onMove = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        place();
      });
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onMove, { passive: true, capture: true });
    window.addEventListener("resize", onMove, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onMove, { capture: true });
      window.removeEventListener("resize", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [open, place]);

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

      {open &&
        pos &&
        createPortal(
          <ul
            ref={panelRef}
            role="listbox"
            style={{
              position: "fixed",
              left: pos.left,
              width: pos.width,
              top: pos.top,
              bottom: pos.bottom,
              maxHeight: pos.maxHeight,
            }}
            className="scrollbar-thin animate-scale-in z-[10000] overflow-auto rounded-2xl border border-line bg-surface p-1.5 shadow-lift"
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
                      active ? "bg-primary/12 font-semibold text-primary" : "text-text hover:bg-surface2"
                    }`}
                  >
                    <span className="truncate">{o.label}</span>
                    {active && <FiCheck className="shrink-0 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
};

export default Select;
