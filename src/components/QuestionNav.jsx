import { useState, memo } from "react";
import { FiGrid, FiX } from "react-icons/fi";

// SAT/IELTS-style question navigator. A compact header button shows progress
// and opens a grid of every question coloured by status (answered / blank /
// marked); tap a number to jump.
const QuestionNav = ({ total = 0, answers = [], marked = [], onJump }) => {
  const [open, setOpen] = useState(false);
  if (!total) return null;

  const answered = answers.slice(0, total).filter((a) => a && a.answer).length;
  const markedCount = marked.slice(0, total).filter(Boolean).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-sm font-bold text-text transition-colors hover:border-primary/40"
        title="Suallar xəritəsi"
      >
        <FiGrid className="text-base text-primary" />
        <span className="tabular-nums">
          {answered}/{total}
        </span>
        {markedCount > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-warning px-1 text-xs text-white">
            {markedCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/45 p-3 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md animate-scale-in rounded-2xl border border-line bg-surface p-5 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-text">Suallar xəritəsi</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
                aria-label="Bağla"
              >
                <FiX />
              </button>
            </div>

            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
              {Array.from({ length: total }, (_, i) => {
                const a = !!answers[i]?.answer;
                const m = !!marked[i];
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onJump?.(i);
                      setOpen(false);
                    }}
                    className={`relative grid h-10 place-items-center rounded-lg border text-sm font-bold transition-colors ${
                      a
                        ? "border-primary bg-primary text-primary-fg"
                        : "border-line bg-surface text-muted hover:border-primary/40"
                    }`}
                  >
                    {i + 1}
                    {m && (
                      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-surface bg-warning" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-primary" /> Cavablandı
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-line" /> Boş
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-warning" /> İşarələnib
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default memo(QuestionNav);
