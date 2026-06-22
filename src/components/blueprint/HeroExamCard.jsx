// The hero's focal point: a realistic (but illustrative) exam question card.
// Static, premium, math-rendered with KaTeX. Not wired to anything — it's a
// product preview for the landing page.
import { FiClock, FiArrowRight, FiCheck } from "react-icons/fi";
import { MathText } from "../Math";

const choices = [
  { key: "A", tex: "$x = 2,\\ 3$", correct: true },
  { key: "B", tex: "$x = -2,\\ -3$" },
  { key: "C", tex: "$x = 1,\\ 6$" },
  { key: "D", tex: "$x = 0,\\ 5$" },
];

const HeroExamCard = ({ className = "" }) => (
  <div
    className={`w-full max-w-md rounded-3xl border border-line bg-surface p-5 shadow-lift sm:p-6 ${className}`}
  >
    {/* header */}
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Riyaziyyat sınağı</p>
        <span className="mt-1 inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          Kvadrat tənliklər
        </span>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface2 px-2.5 py-1.5 text-sm font-bold tabular-nums text-text">
        <FiClock className="text-primary" /> 42:18
      </span>
    </div>

    {/* progress */}
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted">
        <span>12 / 40 sual</span>
        <span className="tabular-nums">30%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface2">
        <div className="h-full w-[30%] rounded-full bg-primary" />
      </div>
    </div>

    {/* question */}
    <div className="mt-5 rounded-2xl border border-line bg-surface2/40 p-4">
      <p className="text-xs font-semibold text-muted">Sual 12</p>
      <p className="mt-1.5 text-sm text-text">Tənliyin köklərini tapın:</p>
      <div className="mt-2 text-center font-display text-2xl text-text">
        <MathText text="$x^2 - 5x + 6 = 0$" />
      </div>
    </div>

    {/* choices */}
    <div className="mt-4 grid grid-cols-1 gap-2.5">
      {choices.map((ch) => (
        <div
          key={ch.key}
          className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
            ch.correct
              ? "border-primary bg-primary/8 text-text"
              : "border-line bg-surface text-text"
          }`}
        >
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${
              ch.correct ? "bg-primary text-primary-fg" : "bg-surface2 text-muted"
            }`}
          >
            {ch.correct ? <FiCheck /> : ch.key}
          </span>
          <span className="font-medium">
            <MathText text={ch.tex} />
          </span>
        </div>
      ))}
    </div>

    {/* footer */}
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg shadow-soft"
    >
      Növbəti sual <FiArrowRight />
    </button>
  </div>
);

export default HeroExamCard;
