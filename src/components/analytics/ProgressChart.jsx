// Lightweight SVG line chart of a student's scores over time (no deps).
const ProgressChart = ({ series = [] }) => {
  if (!series.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-muted">
        Qiymətləndirilmiş nəticə yoxdur.
      </div>
    );
  }

  const W = 640;
  const H = 220;
  const P = 28;
  const n = series.length;
  const x = (i) => (n === 1 ? W / 2 : P + (i / (n - 1)) * (W - 2 * P));
  const y = (s) => H - P - (Math.max(0, Math.min(100, s)) / 100) * (H - 2 * P);
  const pts = series.map((d, i) => `${x(i)},${y(d.score)}`).join(" ");
  const area = `${x(0)},${H - P} ${pts} ${x(n - 1)},${H - P}`;
  const last = series[n - 1].score;
  const best = Math.max(...series.map((d) => d.score));
  const first = series[0].score;
  const delta = Math.round((last - first) * 10) / 10;

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

      <div className="text-primary">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
          {/* gridlines + y labels at 0 / 50 / 100 */}
          {[0, 50, 100].map((g) => (
            <g key={g}>
              <line
                x1={P}
                x2={W - P}
                y1={y(g)}
                y2={y(g)}
                className="stroke-line"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text x={4} y={y(g) + 4} className="fill-muted" style={{ fontSize: 11 }}>
                {g}
              </text>
            </g>
          ))}

          <polygon points={area} fill="currentColor" opacity="0.1" />
          <polyline
            points={pts}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {series.map((d, i) => (
            <circle key={i} cx={x(i)} cy={y(d.score)} r="3.5" fill="currentColor">
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
