import { useMemo } from "react";

const TYPE_LABELS = {
  Cm: "Tək seçim",
  Cs: "Çox seçim",
  Co: "Açıq cavab",
  Cmu: "Uyğunluq",
  Cma: "Uyğunlaşdırma",
  Cd: "Açıq",
};

// Per-type editable scoring. Lists each question TYPE present with its count and
// an editable points-per-question value; the total updates live. Overrides live
// in `typePoints` ({ Cm: 1.56, Cmu: 4, ... }); a type with no override uses the
// preset's automatic value (passed via `autoPoints`, one entry per question).
// `onChange(next | null)` — null means "back to automatic".
const ScoringEditor = ({ questions, autoPoints, typePoints, onChange }) => {
  const groups = useMemo(() => {
    const m = {};
    (questions || []).forEach((q, i) => {
      const t = q?.type || "Cm";
      if (!m[t]) m[t] = { type: t, count: 0, auto: 0 };
      m[t].count += 1;
      // Auto points are equal within a type — keep one representative value.
      m[t].auto = (autoPoints && autoPoints[i]) || m[t].auto || 0;
    });
    return Object.values(m);
  }, [questions, autoPoints]);

  const eff = (t, auto) => {
    const ov = typePoints?.[t];
    return ov === undefined || ov === null || ov === "" ? auto : Number(ov) || 0;
  };
  const total = groups.reduce((s, g) => s + g.count * eff(g.type, g.auto), 0);
  const overridden = !!typePoints && Object.keys(typePoints).length > 0;

  const setOne = (t, val) => {
    const next = { ...(typePoints || {}) };
    if (val === "") delete next[t];
    else next[t] = val;
    onChange(Object.keys(next).length ? next : null);
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
      <p className="mb-1 text-sm font-bold text-text">Ballar</p>
      <p className="mb-3 text-[11px] leading-relaxed text-muted">
        Hər tip üçün bal — dəyiş, hər yerdə əks olunur.
      </p>
      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g.type} className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-sm text-muted">
              {TYPE_LABELS[g.type] || g.type}{" "}
              <span className="font-semibold text-text">×{g.count}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                step="0.01"
                value={typePoints?.[g.type] ?? Number((g.auto || 0).toFixed(3))}
                onChange={(e) => setOne(g.type, e.target.value)}
                className="h-8 w-20 rounded-lg border border-line bg-surface px-2 text-right text-sm tabular-nums text-text outline-none transition focus:border-primary"
              />
              <span className="text-xs text-muted">bal</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-sm">
        <span className="font-semibold text-text">Cəmi</span>
        <span className="font-bold text-primary tabular-nums">{Number(total.toFixed(2))} bal</span>
      </div>
      {overridden && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-2 text-xs font-semibold text-muted transition-colors hover:text-text"
        >
          ↺ Avtomatik bala qayıt
        </button>
      )}
    </div>
  );
};

export default ScoringEditor;
