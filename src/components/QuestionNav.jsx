import { useState, memo } from "react";
import { FiGrid, FiX } from "react-icons/fi";
import { hasAnswer } from "../helper/helper";
import QuestionMap from "./QuestionMap";

// Compact question-navigator trigger: a button showing progress that opens a
// bottom-sheet/modal holding the full QuestionMap. Used in the header on mobile
// and for PDF exams (the desktop structured layout shows the map in a sidebar).
const QuestionNav = ({
  total = 0,
  answers = [],
  marked = [],
  activeRange = null,
  onJump,
  onFinish,
  finishing = false,
  lockBefore = 0,
}) => {
  const [open, setOpen] = useState(false);
  if (!total) return null;

  const answered = answers.slice(0, total).filter(hasAnswer).length;
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
            className="flex max-h-[80vh] w-full max-w-md animate-scale-in flex-col rounded-2xl border border-line bg-surface p-5 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-text">Naviqasiya</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
                aria-label="Bağla"
              >
                <FiX />
              </button>
            </div>
            <QuestionMap
              total={total}
              answers={answers}
              marked={marked}
              activeRange={activeRange}
              lockBefore={lockBefore}
              onJump={(i) => {
                onJump?.(i);
                setOpen(false);
              }}
              onFinish={
                onFinish
                  ? () => {
                      setOpen(false);
                      onFinish();
                    }
                  : undefined
              }
              finishing={finishing}
              dense
            />
          </div>
        </div>
      )}
    </>
  );
};

export default memo(QuestionNav);
