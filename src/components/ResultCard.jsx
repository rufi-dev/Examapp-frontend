const ResultCard = ({ result }) => {
  const correctAnswers = result?.correctAnswers || [];
  const selectedAnswers = result?.selectedAnswers || [];
  const count = Math.max(correctAnswers.length, selectedAnswers.length);
  const cells = Array.from({ length: count }, (_, i) => i);
  // When correct answers are hidden, show only the student's own answers
  // (no correct/wrong marking, which would otherwise be misleading).
  const hasCorrect = correctAnswers.length > 0;

  const isCorrect = (i) =>
    !!selectedAnswers[i]?.answer &&
    !!correctAnswers[i]?.answer &&
    selectedAnswers[i].answer === correctAnswers[i].answer;

  const rowLabel =
    "sticky left-0 z-10 bg-surface px-4 py-3 text-left font-semibold text-text whitespace-nowrap border-r border-line";

  return (
    <div className="scrollbar-thin overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft">
      <table className="w-full border-collapse text-sm">
        <tbody>
          <tr className="border-b border-line">
            <td className={rowLabel}>Sual</td>
            {cells.map((i) => (
              <td
                key={i}
                className="border-l border-line px-3 py-3 text-center font-semibold text-muted"
              >
                {i + 1}
              </td>
            ))}
          </tr>
          {hasCorrect && (
            <tr className="border-b border-line">
              <td className={rowLabel}>Doğru cavab</td>
              {cells.map((i) => (
                <td key={i} className="border-l border-line px-3 py-3 text-center text-text">
                  {correctAnswers[i]?.answer || "—"}
                </td>
              ))}
            </tr>
          )}
          <tr className={hasCorrect ? "border-b border-line" : ""}>
            <td className={rowLabel}>Sənin cavabın</td>
            {cells.map((i) => (
              <td
                key={i}
                className={`border-l border-line px-3 py-3 text-center font-medium ${
                  selectedAnswers[i]?.answer && hasCorrect
                    ? isCorrect(i)
                      ? "bg-success/15 text-success"
                      : "bg-danger/12 text-danger"
                    : "text-muted"
                }`}
              >
                {selectedAnswers[i]?.answer || "—"}
              </td>
            ))}
          </tr>
          {hasCorrect && (
            <tr>
              <td className={rowLabel}>Nəticə</td>
              {cells.map((i) => (
                <td key={i} className="border-l border-line px-3 py-3 text-center">
                  {isCorrect(i) ? (
                    <span className="font-bold text-success">✓</span>
                  ) : (
                    <span className="font-bold text-danger">✕</span>
                  )}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ResultCard;
