const LABELS = { Cm: "Qapalı sual", Co: "Açıq sual", Cma: "Uyğunluq", Cd: "Ətraflı yazı" };
const DEFAULT_OPTIONS = ["a", "b", "c", "d", "e"];

const QuestionType = ({
  singleClass,
  singleTag,
  answers = [],
  review,
  questions,
  handleAnswerChange,
}) => {
  const selectedAnswers = review?.selectedAnswers || [];
  const isReview = selectedAnswers.length > 0;

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

  const optionClass = (i, option) => {
    const isCorrectOpt = answers[i]?.answer === option;
    const userAns = selectedAnswers[i]?.answer;
    if (isReview) {
      if (isCorrectOpt) return "border-success bg-success/15 text-success";
      if (option === userAns) return "border-danger bg-danger/15 text-danger";
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
            <div key={i}>
              <p className="mb-2 text-sm font-medium text-text">
                {LABELS.Cm} {i + 1}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {(def.options || DEFAULT_OPTIONS).map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={isReview}
                    onClick={() => setAnswer(i, option, "Cm")}
                    className={`grid h-11 w-11 place-items-center rounded-full border font-semibold transition-colors ${optionClass(
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
        const isCorrect =
          isReview && correctAnswer && userAnswer ? correctAnswer === userAnswer : null;
        return (
          <div key={i}>
            <p className="mb-2 flex flex-wrap items-center gap-2 text-sm font-medium text-text">
              {LABELS[def.type] || "Sual"} {i + 1}
              {isCorrect === true && <span className="text-success">✓</span>}
              {isCorrect === false && (
                <span className="text-danger">✕ Doğru: {correctAnswer}</span>
              )}
            </p>
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
