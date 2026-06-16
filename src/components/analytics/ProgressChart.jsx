import { useEffect, useRef, useState } from "react";

// Compact SVG line chart of a student's scores over time (no deps). The width
// is measured (so nothing distorts), the height is fixed, and the Y-axis
// auto-scales to the data so a low-scoring trend is still readable.
const ProgressChart = ({ series = [] }) => {
  const ref = useRef(null);
  const [w, setW] = useState(640);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(el.clientWidth || 640);
    update();
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(update);
      ro.observe(el);
    } else {
      window.addEventListener("resize", update);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", update);
    };
  }, []);

  if (!series.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-muted">
        Qiymətləndirilmiş nəticə yoxdur.
      </div>
    );
  }

  const H = 180;
  const P = 26;
  const W = Math.max(280, w);
  const n = series.length;

  const scores = series.map((d) => d.score);
  const maxScore = Math.max(0, ...scores);
  // Round up to a tidy max with headroom; min 20 so a single low score still
  // has context; never above 100 (scores are out of 100).
  const yMax = Math.min(100, Math.max(20, Math.ceil((maxScore * 1.15) / 10) * 10));

  const x = (i) => (n === 1 ? W / 2 : P + (i / (n - 1)) * (W - 2 * P));
  const y = (s) => H - P - (Math.max(0, Math.min(yMax, s)) / yMax) * (H - 2 * P);
  const pts = series.map((d, i) => `${x(i)},${y(d.score)}`).join(" ");
  const area = `${x(0)},${H - P} ${pts} ${x(n - 1)},${H - P}`;

  const last = scores[n - 1];
  const best = Math.max(...scores);
  const delta = Math.round((last - scores[0]) * 10) / 10;
  const grid = [0, Math.round(yMax / 2), yMax];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <span className="text-muted">
          Son bal: <span className="font-bold text-text">{Math.round(last * 10) / 10}</span>
        </span>
        <span className="text-muted">
          Ən yüksək: <span className="font-bold text-success">{Math.round(best * 10) / 10}</span>
        </span>
        {n > 1 && (
          <span className="text-muted">
            Dəyişim:{" "}
            <span className={`font-bold ${delta >= 0 ? "text-success" : "text-danger"}`}>
              {delta >= 0 ? "+" : ""}
              {delta}
            </span>
          </span>
        )}
      </div>

      <div ref={ref} className="text-primary">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block">
          <defs>
            <linearGradient id="progFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>

          {grid.map((g) => (
            <g key={g}>
              <line
                x1={P}
                x2={W - P}
                y1={y(g)}
                y2={y(g)}
                className="stroke-line"
                strokeWidth="1"
                strokeDasharray="4 5"
              />
              <text x={2} y={y(g) - 3} className="fill-muted" style={{ fontSize: 11 }}>
                {g}
              </text>
            </g>
          ))}

          <polygon points={area} fill="url(#progFill)" />
          <polyline
            points={pts}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {series.map((d, i) => (
            <circle
              key={i}
              cx={x(i)}
              cy={y(d.score)}
              r={i === n - 1 ? 4.5 : 3}
              fill="currentColor"
            >
              <title>
                {d.name}: {Math.round(d.score * 10) / 10}
              </title>
            </circle>
          ))}
        </svg>
      </div>
    </div>
  );
};

export default ProgressChart;
