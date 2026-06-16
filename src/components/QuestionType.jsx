import { FiFlag } from "react-icons/fi";

const LABELS = { Cm: "Qapalı sual", Co: "Açıq sual", Cma: "Uyğunluq", Cd: "Ətraflı yazı" };
const DEFAULT_OPTIONS = ["a", "b", "c", "d", "e"];

const QuestionType = ({
  singleClass,
  singleTag,
  answers = [],
  review,
  questions,
  handleAnswerChange,
  marked = [],
  onToggleMark,
}) => {
  const selectedAnswers = review?.selectedAnswers || [];
  const isReview = selectedAnswers.length > 0;

  // "Mark for review" flag — only during the exam (when onToggleMark is given).
  const markBtn = (i) =>
    !isReview && onToggleMark ? (
      <button
        type="button"
        onClick={() => onToggleMark(i)}
        aria-label="Yoxlama üçün işarələ"
        className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition-colors ${
          marked[i]
            ? "border-warning bg-warning/15 text-warning"
            : "border-line text-muted hover:text-text"
        }`}
      >
        <FiFlag className={marked[i] ? "fill-current" : ""} />
        {marked[i] ? "İşarələnib" : "İşarələ"}
      </button>
    ) : null;

  const countBased = () => {
    const defs = [];
    const push = (n, type, options) => {
      for (let i = 0; i < n; i++) defs.push({ type, options });
    };
    if (singleTag?.name === "Buraxılış" && singleClass?.level === 9) {
      push(15, "Cm", DEFAULT_OPTIONS);
      push(6, "Co");
      push(4, "Cd");
    } else if (singleTag?.name === "Buraxılış" && singleClass?.level === 11) {
      push(13, "Cm", DEFAULT_OPTIONS);
      push(5, "Co");
      push(7, "Cd");
    } else if (
      singleTag?.name === "Blok" &&
      (singleClass?.level === 1 || singleClass?.level === 2)
    ) {
      push(22, "Cm", DEFAULT_OPTIONS);
      push(4, "Co");
      push(1, "Cma");
      push(3, "Cd");
    } else {
      push(25, "Cm", DEFAULT_OPTIONS);
    }
    return defs;
  };

  const defs =
    questions && questions.length > 0
      ? questions.map((q) => ({
          type: q.type || "Cm",
          options: q.options?.length ? q.options : DEFAULT_OPTIONS,
        }))
      : countBased();

  const norm = (v) => String(v ?? "").trim();
  const optionClass = (i, option) => {
    const isCorrectOpt = norm(answers[i]?.answer) === norm(option);
    const userAns = norm(selectedAnswers[i]?.answer);
    if (isReview) {
      // Solid fills so the correct answer (green) and the student's wrong pick
      // (red) read at a glance, not just a faint tint.
      if (isCorrectOpt) return "border-success bg-success text-white";
      if (norm(option) === userAns) return "border-danger bg-danger text-white";
      return "border-line bg-surface text-muted";
    }
    if (isCorrectOpt) return "border-primary bg-primary text-primary-fg";
    return "border-line bg-surface text-muted hover:border-primary/40";
  };

  const setAnswer = (i, value, type) =>
    handleAnswerChange?.({ target: { value } }, i, type);

  return (
    <div className="flex flex-col gap-5">
      {defs.map((def, i) => {
        if (def.type === "Cm") {
          return (
            <div key={i} id={`q-${i}`} className="scroll-mt-4">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <p className="text-[15px] font-semibold text-text">
                  {LABELS.Cm} {i + 1}
                </p>
                {markBtn(i)}
              </div>
              <div className="flex flex-wrap gap-3">
                {(def.options || DEFAULT_OPTIONS).map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={isReview}
                    onClick={() => setAnswer(i, option, "Cm")}
                    className={`grid h-12 w-12 place-items-center rounded-full border text-[15px] font-semibold transition-colors ${optionClass(
                      i,
                      option
                    )}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          );
        }

        const correctAnswer = answers[i]?.answer || null;
        const userAnswer = selectedAnswers[i]?.answer || null;
        // Trim like the server scorer so the ✓/✕ mark matches the score.
        const isCorrect =
          isReview && correctAnswer && userAnswer
            ? String(correctAnswer).trim() === String(userAnswer).trim()
            : null;
        return (
          <div key={i} id={`q-${i}`} className="scroll-mt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-text">
                {LABELS[def.type] || "Sual"} {i + 1}
                {isCorrect === true && <span className="text-success">✓</span>}
                {isCorrect === false && (
                  <span className="text-danger">✕ Doğru: {correctAnswer}</span>
                )}
              </p>
              {markBtn(i)}
            </div>
            <textarea
              rows={def.type === "Co" ? 4 : 6}
              readOnly={isReview}
              value={isReview ? userAnswer || "" : answers[i]?.answer || ""}
              onChange={(e) => setAnswer(i, e.target.value, def.type)}
              placeholder="Cavabını yaz..."
              className="w-full rounded-xl border border-line bg-surface p-3 text-[15px] text-text outline-none transition placeholder:text-muted/60 read-only:bg-surface2 focus:border-primary focus:ring-4 focus:ring-ring/25"
            />
          </div>
        );
      })}
    </div>
  );
};

export default QuestionType;
