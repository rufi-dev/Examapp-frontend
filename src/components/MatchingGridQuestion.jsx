// Correspondence (Cmu) student widget: rows = numbers 1..N, each with letter
// toggle buttons a..M. Multi-select per number; a letter may be picked for more
// than one number (reusable). The answer is a map { leftIdx: [rightIdx,…] } and
// empty selections are omitted so an untouched question reads as unanswered.
const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);

const MatchingGridQuestion = ({ leftCount = 0, rightCount = 0, value, onChange, disabled = false }) => {
  const map = isMap(value) ? value : {};
  const toggle = (li, ri) => {
    if (disabled) return;
    const cur = new Set(Array.isArray(map[li]) ? map[li].map(Number) : []);
    if (cur.has(ri)) cur.delete(ri);
    else cur.add(ri);
    const next = { ...map };
    if (cur.size) next[li] = Array.from(cur).sort((a, b) => a - b);
    else delete next[li];
    onChange(next);
  };
  return (
    <div className="space-y-2.5">
      {Array.from({ length: leftCount }).map((_, li) => {
        const sel = new Set(Array.isArray(map[li]) ? map[li].map(Number) : []);
        return (
          <div
            key={li}
            className="flex flex-wrap items-center gap-2.5 rounded-xl border border-line bg-surface2/40 p-2.5"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/12 text-sm font-bold text-primary">
              {li + 1}
            </span>
            <span className="text-muted">→</span>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: rightCount }).map((_, ri) => {
                const on = sel.has(ri);
                return (
                  <button
                    key={ri}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggle(li, ri)}
                    className={`grid h-8 w-8 place-items-center rounded-lg border text-sm font-bold uppercase transition-colors ${
                      on
                        ? "border-primary bg-primary text-primary-fg"
                        : "border-line bg-surface text-text hover:border-primary/50"
                    }`}
                  >
                    {LETTERS[ri]}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MatchingGridQuestion;
