import { useState } from "react";

const barTone = (pct) =>
  pct >= 66 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-danger";
const textTone = (pct) =>
  pct >= 66 ? "text-success" : pct >= 40 ? "text-warning" : "text-danger";

// Per-question difficulty: % of students who answered each question correctly.
// Sorts hardest-first by default so weak spots surface immediately.
const ItemAnalysis = ({ items = [] }) => {
  const [hardestFirst, setHardestFirst] = useState(true);
  if (!items.length) return null;

  const rows = hardestFirst
    ? [...items].sort((a, b) => a.pct - b.pct)
    : items;

  const tab = (active) =>
    `rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
      active ? "bg-primary text-primary-fg shadow-soft" : "text-muted hover:text-text"
    }`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Hər sualı düzgün cavablandıranların faizi</p>
        <div className="flex rounded-lg border border-line bg-surface2/50 p-0.5">
          <button type="button" onClick={() => setHardestFirst(true)} className={tab(hardestFirst)}>
            Ən çətin
          </button>
          <button type="button" onClick={() => setHardestFirst(false)} className={tab(!hardestFirst)}>
            Sıra ilə
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {rows.map((it) => (
          <div key={it.index} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-sm font-semibold text-text">Sual {it.number}</span>
            <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-surface2">
              <div
                className={`h-full rounded-lg ${barTone(it.pct)} transition-all duration-300`}
                style={{ width: `${it.pct}%` }}
              />
            </div>
            <span className={`w-12 shrink-0 text-right text-sm font-bold ${textTone(it.pct)}`}>
              {it.pct}%
            </span>
            <span className="hidden w-44 shrink-0 text-right text-xs text-muted lg:block">
              {it.correct} düzgün · {it.wrong} səhv
              {it.blank ? ` · ${it.blank} boş` : ""}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted">
        <span className="mr-3 inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-danger" /> &lt;40% (çətin)
        </span>
        <span className="mr-3 inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-warning" /> 40–65%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-success" /> ≥66% (asan)
        </span>
      </p>
    </div>
  );
};

export default ItemAnalysis;
