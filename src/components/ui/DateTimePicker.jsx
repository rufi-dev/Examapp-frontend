import { useEffect, useMemo, useRef, useState } from "react";
import { FiCalendar, FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import { toLocalInput } from "../../helper/datetime";

// On-brand date + time picker. Replaces the unstyled native datetime-local.
// value / onChange use the same "YYYY-MM-DDTHH:mm" local-wall-clock string the
// native input produced, so callers (and toUtcIso on submit) are unchanged.

const AZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun",
  "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];
// Monday-first week (Azerbaijani calendar convention).
const AZ_WEEKDAYS = ["B.e", "Ç.a", "Ç", "C.a", "C", "Ş", "B"];
const pad = (n) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 00,05,…,55

const parse = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const DateTimePicker = ({ value, onChange, id, placeholder = "Tarix seç", align = "left" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = parse(value);

  // Month currently shown in the calendar grid.
  const [view, setView] = useState(() => {
    const d = selected || new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  useEffect(() => {
    if (open && selected) setView({ y: selected.getFullYear(), m: selected.getMonth() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  const today = new Date();
  const hour = selected ? selected.getHours() : 9;
  const minute = selected ? selected.getMinutes() : 0;

  // Emit a new value composed from a chosen day and the current time parts.
  const emit = (y, m, d, h, min) => onChange(toLocalInput(new Date(y, m, d, h, min)));

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const lead = (first.getDay() + 6) % 7; // Monday = 0
    const days = new Date(view.y, view.m + 1, 0).getDate();
    return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [view]);

  const isSameDay = (d, y, m, day) =>
    d && d.getFullYear() === y && d.getMonth() === m && d.getDate() === day;

  const prevMonth = () =>
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const nextMonth = () =>
    setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));

  const display = selected
    ? `${selected.getDate()} ${AZ_MONTHS[selected.getMonth()]} ${selected.getFullYear()}, ${pad(
        selected.getHours()
      )}:${pad(selected.getMinutes())}`
    : "";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-11 w-full items-center gap-2.5 rounded-xl border bg-surface px-3.5 text-left text-[15px] outline-none transition ${
          open ? "border-primary ring-4 ring-ring/25" : "border-line hover:border-primary/50"
        }`}
      >
        <FiCalendar className="shrink-0 text-muted" />
        <span className={`flex-1 truncate ${selected ? "text-text" : "text-muted/60"}`}>
          {display || placeholder}
        </span>
        {selected && (
          <FiX
            className="shrink-0 text-muted transition-colors hover:text-danger"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
          />
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:contents sm:bg-transparent sm:p-0"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            className={`animate-scale-in flex max-h-[88vh] w-full max-w-[360px] flex-col overflow-y-auto rounded-2xl border border-line bg-surface shadow-lift
              sm:absolute sm:top-full sm:mt-2 sm:max-h-none sm:w-max sm:max-w-none sm:overflow-hidden ${
                align === "right" ? "sm:left-auto sm:right-0" : "sm:left-0"
              }`}
          >
          <div className="flex flex-col sm:flex-row">
          {/* Calendar */}
          <div className="w-full shrink-0 p-3.5 sm:w-[272px]">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-sm font-bold text-text">
                {AZ_MONTHS[view.m]} {view.y}
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
                >
                  <FiChevronLeft />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
                >
                  <FiChevronRight />
                </button>
              </span>
            </div>
            <div className="mb-1 grid grid-cols-7 gap-1">
              {AZ_WEEKDAYS.map((w, i) => (
                <span
                  key={i}
                  className="grid h-7 place-items-center text-[10px] font-semibold uppercase text-muted"
                >
                  {w}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <span key={`e-${i}`} className="aspect-square" />;
                const isSel = isSameDay(selected, view.y, view.m, day);
                const isToday = isSameDay(today, view.y, view.m, day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => emit(view.y, view.m, day, hour, minute)}
                    className={`grid aspect-square w-full place-items-center rounded-lg text-[13px] transition-colors ${
                      isSel
                        ? "bg-primary font-semibold text-primary-fg"
                        : isToday
                        ? "font-semibold text-primary ring-1 ring-inset ring-primary/40"
                        : "text-text hover:bg-surface2"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-xs font-medium text-muted transition-colors hover:text-danger"
              >
                Təmizlə
              </button>
              <button
                type="button"
                onClick={() => {
                  const n = new Date();
                  emit(n.getFullYear(), n.getMonth(), n.getDate(), n.getHours(), n.getMinutes());
                  setView({ y: n.getFullYear(), m: n.getMonth() });
                }}
                className="text-xs font-semibold text-primary transition-colors hover:underline"
              >
                İndi
              </button>
            </div>
          </div>

          {/* Time — vertical columns beside the calendar on desktop; stacked
              horizontal strips below it on mobile (no tall nested scroll) */}
          <div className="flex w-full shrink-0 flex-col border-t border-line sm:w-auto sm:flex-row sm:border-l sm:border-t-0">
            <TimeColumn
              label="Saat"
              items={HOURS}
              active={hour}
              onPick={(h) => {
                const b = selected || new Date();
                emit(b.getFullYear(), b.getMonth(), b.getDate(), h, minute);
              }}
            />
            <TimeColumn
              label="Dəq"
              items={MINUTES}
              active={minute - (minute % 5)}
              onPick={(min) => {
                const b = selected || new Date();
                emit(b.getFullYear(), b.getMonth(), b.getDate(), hour, min);
              }}
            />
          </div>
          </div>

          {/* Confirm — apply the selection and close */}
          <div className="border-t border-line p-2.5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-fg transition hover:bg-primary-hover"
            >
              Hazır
            </button>
          </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TimeColumn = ({ label, items, active, onPick }) => (
  <div className="flex w-full flex-col sm:w-[74px]">
    <span className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase text-muted sm:justify-center sm:border-b sm:border-line sm:px-0">
      {label}
    </span>
    <ul className="scrollbar-thin flex gap-1 overflow-x-auto p-2 sm:max-h-[236px] sm:flex-col sm:gap-0 sm:overflow-x-hidden sm:overflow-y-auto sm:p-1.5">
      {items.map((n) => {
        const on = n === active;
        return (
          <li key={n} className="shrink-0 sm:shrink">
            <button
              type="button"
              onClick={() => onPick(n)}
              className={`min-w-[42px] rounded-lg px-2 py-1.5 text-center text-sm transition-colors sm:mb-0.5 sm:w-full ${
                on ? "bg-primary font-semibold text-primary-fg" : "text-text hover:bg-surface2"
              }`}
            >
              {pad(n)}
            </button>
          </li>
        );
      })}
    </ul>
  </div>
);

export default DateTimePicker;
