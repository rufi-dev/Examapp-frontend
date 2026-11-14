import PropTypes from "prop-types";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

/*
 * Columns: counts over days or hours, one or two series stacked. Plain SVG (no
 * chart library), measured to its container so 1 viewBox unit is 1px.
 *
 * Marks follow one spec everywhere on the page: thin bars (at most 28px), 3px
 * rounded tops on a square baseline, a 2px gap between stacked parts, a faint
 * grid on round values, labels thinned so they never collide. Hover, touch or
 * the arrow keys pick a column; its tooltip names the day and every value. A
 * hidden table carries the same numbers for screen readers.
 */

const FILL = {
  primary: "fill-primary",
  accent: "fill-accent2",
  muted: "fill-muted/[0.35]",
  success: "fill-success",
};
const SWATCH = { primary: "bg-primary", accent: "bg-accent2", muted: "bg-muted/[0.35]", success: "bg-success" };
const PAD = { t: 12, r: 8, b: 26, l: 34 };

const niceMax = (m) => {
  if (m <= 4) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(m)));
  const n = m / pow;
  const step = n <= 1 ? 1 : n <= 1.2 ? 1.2 : n <= 1.5 ? 1.5 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 3 ? 3 : n <= 4 ? 4 : n <= 5 ? 5 : n <= 6 ? 6 : n <= 8 ? 8 : 10;
  return step * pow;
};

// A bar with rounded top corners only.
const barPath = (x, y, w, h, r) => {
  if (h <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
};

export function Legend({ series }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {series.map((s) => (
        <li key={s.key} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={`h-2.5 w-2.5 rounded-sm ${SWATCH[s.tone] || SWATCH.primary}`} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}
Legend.propTypes = { series: PropTypes.array.isRequired };

export default function Columns({ labels, series, formatLabel = (l) => l, fullLabel, height = 220, title, highlight = null }) {
  const wrap = useRef(null);
  const [W, setW] = useState(640);
  const [hi, setHi] = useState(null);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return undefined;
    const set = () => setW(Math.max(240, Math.round(el.clientWidth)));
    set();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(set) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  const n = labels.length;
  const totals = useMemo(() => labels.map((_, i) => series.reduce((s, x) => s + (Number(x.data[i]) || 0), 0)), [labels, series]);
  const max = niceMax(Math.max(0, ...totals));
  const plotW = W - PAD.l - PAD.r;
  const plotH = height - PAD.t - PAD.b;
  const band = plotW / Math.max(1, n);
  const barW = Math.max(2, Math.min(28, band * 0.62));
  const y = (v) => PAD.t + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 46))));
  const full = fullLabel || formatLabel;
  const active = hi ?? null;

  const onKey = (e) => {
    if (e.key === "ArrowRight") setHi((h) => (h == null ? 0 : Math.min(n - 1, h + 1)));
    else if (e.key === "ArrowLeft") setHi((h) => (h == null ? n - 1 : Math.max(0, h - 1)));
    else if (e.key === "Escape") setHi(null);
    else return;
    e.preventDefault();
  };
  const pick = (clientX) => {
    const rect = wrap.current?.getBoundingClientRect();
    if (!rect) return;
    const i = Math.floor((clientX - rect.left - PAD.l) / band);
    setHi(i >= 0 && i < n ? i : null);
  };

  const tipLeft = active == null ? 0 : Math.min(Math.max(PAD.l + band * active + band / 2, 70), W - 70);

  return (
    <div className="relative">
      <div
        ref={wrap}
        role="img"
        aria-label={`${title || "Qrafik"}: ${n} sütun. Ox düymələri ilə gəz.`}
        tabIndex={0}
        onKeyDown={onKey}
        onMouseMove={(e) => pick(e.clientX)}
        onMouseLeave={() => setHi(null)}
        onTouchStart={(e) => pick(e.touches[0].clientX)}
        onBlur={() => setHi(null)}
        className="relative rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
      >
        <svg width={W} height={height} viewBox={`0 0 ${W} ${height}`} className="block max-w-full" aria-hidden>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className={t === 0 ? "stroke-line" : "stroke-line/60"} strokeWidth="1" strokeDasharray={t === 0 ? undefined : "3 4"} />
              <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                {Number.isInteger(t) ? t : t.toFixed(1)}
              </text>
            </g>
          ))}
          {labels.map((l, i) => {
            const x = PAD.l + band * i + (band - barW) / 2;
            let acc = 0;
            const dim = active != null && active !== i;
            return (
              <g key={l} opacity={dim ? 0.45 : 1} className="transition-opacity duration-150">
                {series.map((s, k) => {
                  const v = Number(s.data[i]) || 0;
                  if (!v) return null;
                  const top = y(acc + v);
                  const h = y(acc) - top - (k > 0 ? 2 : 0);
                  acc += v;
                  const isTop = series.slice(k + 1).every((t) => !(Number(t.data[i]) || 0));
                  const tone = highlight === i && s.highlightTone ? s.highlightTone : s.tone;
                  return isTop ? (
                    <path key={s.key} d={barPath(x, top, barW, h, 3)} className={FILL[tone] || FILL.primary} />
                  ) : (
                    <rect key={s.key} x={x} y={top} width={barW} height={Math.max(0, h)} className={FILL[tone] || FILL.primary} />
                  );
                })}
                {i % every === 0 && (
                  <text x={PAD.l + band * i + band / 2} y={height - 8} textAnchor="middle" className="fill-muted text-[11px]">
                    {formatLabel(l, i)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {active != null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lift"
            style={{ left: tipLeft }}
          >
            <p className="font-semibold text-text">{full(labels[active], active)}</p>
            {series.map((s) => (
              <p key={s.key} className="mt-0.5 flex items-center gap-1.5 text-muted">
                <span aria-hidden className={`h-2 w-2 rounded-sm ${SWATCH[s.tone] || SWATCH.primary}`} />
                {s.label}: <span className="font-semibold tabular-nums text-text">{Number(s.data[active]) || 0}</span>
              </p>
            ))}
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Dövr</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((l, i) => (
            <tr key={l}>
              <th scope="row">{full(l, i)}</th>
              {series.map((s) => (
                <td key={s.key}>{Number(s.data[i]) || 0}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Columns.propTypes = {
  formatLabel: PropTypes.func,
  fullLabel: PropTypes.func,
  height: PropTypes.number,
  highlight: PropTypes.number,
  labels: PropTypes.array.isRequired,
  series: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string, label: PropTypes.string, data: PropTypes.array, tone: PropTypes.string, highlightTone: PropTypes.string })).isRequired,
  title: PropTypes.string,
};
