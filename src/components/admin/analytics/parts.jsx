import PropTypes from "prop-types";
import { FiArrowDownRight, FiArrowUpRight, FiMinus } from "react-icons/fi";
import { PRESETS, fmtNum, rangeLabel } from "./analyticsOps";

/*
 * The small pieces of «Analitika»: the period bar, a figure with its change and
 * trend, ranked bars, a section header. One vocabulary for the whole page.
 */

// A trend in 2px: the shape of the period, the last day marked.
export function Sparkline({ data, className = "text-primary" }) {
  const n = data?.length || 0;
  if (n < 2) return null;
  const W = 96;
  const H = 28;
  const max = Math.max(1, ...data);
  const x = (i) => (i / (n - 1)) * (W - 4) + 2;
  const y = (v) => H - 3 - (v / max) * (H - 6);
  const d = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className={`overflow-visible ${className}`}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(n - 1)} cy={y(data[n - 1])} r="2.5" fill="currentColor" />
    </svg>
  );
}
Sparkline.propTypes = { className: PropTypes.string, data: PropTypes.array };

// Change against the previous period: a sign and an arrow, never colour alone.
export function Delta({ value, versus }) {
  if (value == null) return <span className="text-xs text-muted">əvvəlki dövrdə 0</span>;
  const Icon = value > 0 ? FiArrowUpRight : value < 0 ? FiArrowDownRight : FiMinus;
  const tone = value > 0 ? "text-success" : value < 0 ? "text-danger" : "text-muted";
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${tone}`}>
        <Icon aria-hidden />
        {value > 0 ? "+" : ""}
        {value}%
      </span>
      <span className="text-muted">{versus}</span>
    </span>
  );
}
Delta.propTypes = { value: PropTypes.number, versus: PropTypes.string };

export function Figure({ label, value, delta, versus, trend, note }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-surface px-4 py-4 sm:px-5">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-text">{value}</p>
        <Sparkline data={trend} />
      </div>
      {delta !== undefined && <Delta value={delta} versus={versus} />}
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}
Figure.propTypes = { delta: PropTypes.number, label: PropTypes.string, note: PropTypes.node, trend: PropTypes.array, value: PropTypes.node, versus: PropTypes.string };

/*
 * Ranked bars: one hue, largest first, each against the largest (or against a
 * whole, `of`). A row can be a button (a source filters the visit log).
 */
export function RankBars({ items, of = null, onPick = null, picked = null, empty = "Məlumat yoxdur", max = 6 }) {
  const shown = items.slice(0, max);
  if (!shown.length) return <p className="py-3 text-sm text-muted">{empty}</p>;
  const top = of || Math.max(1, ...shown.map((i) => i.n));
  const total = of || items.reduce((s, i) => s + i.n, 0) || 1;
  return (
    <ul className="space-y-2.5">
      {shown.map((it) => {
        const pct = Math.round((it.n / total) * 100);
        const body = (
          <>
            <span className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-text">
                {it.label}
                {it.hint && <span className="ml-1.5 hidden text-xs text-muted sm:inline">{it.hint}</span>}
              </span>
              <span className="shrink-0 tabular-nums text-text">
                <span className="font-semibold">{fmtNum(it.n)}</span> <span className="text-xs text-muted">{pct}%</span>
              </span>
            </span>
            <span aria-hidden className="mt-1.5 block h-2 overflow-hidden rounded-full bg-surface2">
              <span className={`block h-full rounded-full ${it.tone === "success" ? "bg-success" : "bg-primary"}`} style={{ width: `${Math.max(it.n ? 2 : 0, (it.n / top) * 100)}%` }} />
            </span>
          </>
        );
        return (
          <li key={it.key}>
            {onPick ? (
              <button
                type="button"
                onClick={() => onPick(it.key)}
                aria-pressed={picked === it.key}
                className={`block w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface2/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30 ${picked === it.key ? "bg-primary/[0.06] ring-1 ring-primary/30" : ""}`}
              >
                {body}
              </button>
            ) : (
              <div className="px-2 py-1">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
RankBars.propTypes = { empty: PropTypes.string, items: PropTypes.array.isRequired, max: PropTypes.number, of: PropTypes.number, onPick: PropTypes.func, picked: PropTypes.string };

export function SectionHead({ id, title, children, aside = null }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div>
        <h2 id={id} className="text-base font-bold text-text">
          {title}
        </h2>
        {children && <p className="mt-0.5 text-sm text-muted">{children}</p>}
      </div>
      {aside}
    </div>
  );
}
SectionHead.propTypes = { aside: PropTypes.node, children: PropTypes.node, id: PropTypes.string, title: PropTypes.string };

export function Panel({ children, className = "", labelledBy }) {
  return (
    <section aria-labelledby={labelledBy} className={`rounded-2xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {children}
    </section>
  );
}
Panel.propTypes = { children: PropTypes.node, className: PropTypes.string, labelledBy: PropTypes.string };

export function Toggle({ on, onChange, children }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-bold transition-colors ${on ? "bg-text text-bg" : "border border-line bg-surface text-muted hover:bg-surface2 hover:text-text"}`}
    >
      {children}
    </button>
  );
}
Toggle.propTypes = { children: PropTypes.node, on: PropTypes.bool, onChange: PropTypes.func.isRequired };

// The period every number on the page answers for.
export function PeriodBar({ preset, range, custom, onPreset, onCustom }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div role="radiogroup" aria-label="Dövr" className="grid w-full grid-cols-3 gap-1 rounded-xl border border-line bg-surface p-1 sm:inline-flex sm:w-auto sm:flex-wrap sm:gap-0">
        {[...PRESETS, { key: "custom", label: "Fərdi" }].map((p) => (
          <button
            key={p.key}
            type="button"
            role="radio"
            aria-checked={preset === p.key}
            onClick={() => onPreset(p.key)}
            className={`h-10 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors sm:h-9 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30 ${
              preset === p.key ? "bg-primary text-primary-fg shadow-soft" : "text-muted hover:text-text"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === "custom" ? (
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <label className="sr-only" htmlFor="an-from">
            Tarixdən
          </label>
          <input id="an-from" type="date" value={custom.from || ""} max={custom.to || undefined} onChange={(e) => onCustom({ ...custom, from: e.target.value })} className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm text-text focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-ring/25 sm:flex-none" />
          <span aria-hidden className="text-muted">–</span>
          <label className="sr-only" htmlFor="an-to">
            Tarixə
          </label>
          <input id="an-to" type="date" value={custom.to || ""} min={custom.from || undefined} onChange={(e) => onCustom({ ...custom, to: e.target.value })} className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm text-text focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-ring/25 sm:flex-none" />
        </div>
      ) : (
        <p className="text-sm font-semibold text-text">{rangeLabel(range)}</p>
      )}
    </div>
  );
}
PeriodBar.propTypes = { custom: PropTypes.object, onCustom: PropTypes.func.isRequired, onPreset: PropTypes.func.isRequired, preset: PropTypes.string, range: PropTypes.object.isRequired };
