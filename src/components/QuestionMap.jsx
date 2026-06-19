import { memo } from "react";
import { FiFlag, FiCheckCircle } from "react-icons/fi";
import { hasAnswer } from "../helper/helper";

// Persistent exam question map: a grid of every question coloured by status
// (answered / blank / flagged) with the CURRENT page's questions highlighted as
// "active" so the student always knows where they are. Tapping a number jumps to
// it (switching page when paginated). An optional finish button lets the student
// submit straight from the map. Used as a desktop side panel and inside the
// mobile bottom-sheet.
const QuestionMap = ({
  total = 0,
  answers = [],
  marked = [],
  activeRange = null, // {start, end} of the page being viewed
  onJump,
  onFinish,
  finishing = false,
  dense = false,
}) => {
  if (!total) return null;
  const answered = answers.slice(0, total).filter(hasAnswer).length;
  const flagged = marked.slice(0, total).filter(Boolean).length;
  const isActive = (i) => activeRange && i >= activeRange.start && i < activeRange.end;

  return (
    <div className="flex min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-text">Suallar xəritəsi</h3>
        <span className="tabular-nums rounded-lg bg-surface2 px-2 py-0.5 text-xs font-bold text-muted">
          {answered}/{total}
        </span>
      </div>

      {/* Padding (px/py) gives the active ring + flag dot room so they are never
          clipped by the scroll container or overlapped by neighbours. */}
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-1.5">
        <div
          className={`grid gap-2.5 ${dense ? "grid-cols-7" : "grid-cols-5"}`}
        >
          {Array.from({ length: total }, (_, i) => {
            const a = hasAnswer(answers[i]);
            const m = !!marked[i];
            const active = isActive(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => onJump?.(i)}
                title={`Sual ${i + 1}${a ? " — cavablandı" : ""}${m ? " — işarələnib" : ""}`}
                className={`relative grid h-9 place-items-center rounded-lg border text-sm font-bold transition-colors ${
                  a
                    ? "border-primary bg-primary text-primary-fg"
                    : "border-line bg-surface text-muted hover:border-primary/40"
                } ${
                  active
                    ? "z-10 ring-2 ring-primary ring-offset-2 ring-offset-surface"
                    : ""
                }`}
              >
                {i + 1}
                {m && (
                  <span className="absolute -right-1 -top-1 grid h-3.5 w-3.5 place-items-center rounded-full border-2 border-surface bg-warning">
                    <FiFlag className="text-[7px] text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-primary" /> Cavablandı
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-line" /> Boş
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-warning" /> İşarələnib
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded ring-2 ring-primary ring-offset-1 ring-offset-surface" /> Cari
        </span>
      </div>

      {flagged > 0 && (
        <p className="mt-2 text-[11px] font-medium text-warning">
          {flagged} sual yenidən baxış üçün işarələnib
        </p>
      )}

      {onFinish && (
        <button
          type="button"
          onClick={onFinish}
          disabled={finishing}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-bold text-white shadow-soft transition-colors hover:brightness-105 disabled:opacity-60"
        >
          <FiCheckCircle /> İmtahanı bitir
        </button>
      )}
    </div>
  );
};

export default memo(QuestionMap);
