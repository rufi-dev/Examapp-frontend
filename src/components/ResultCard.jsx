import { hasAnswer, isSelectionCorrect } from "../helper/helper";

const ResultCard = ({ result }) => {
  const correctAnswers = result?.correctAnswers || [];
  const selectedAnswers = result?.selectedAnswers || [];
  const count = Math.max(correctAnswers.length, selectedAnswers.length);
  const cells = Array.from({ length: count }, (_, i) => i);
  // When correct answers are hidden, show only the student's own answers
  // (no correct/wrong marking, which would otherwise be misleading).
  const hasCorrect = correctAnswers.length > 0;

  // Trim like the server scorer so per-cell marks match the score / summary.
  // Only CHOICE cells (Cm/Cs) display their indices as letters (0 -> A). Driven
  // by the question type (always present), so matching right-texts that happen
  // to be numeric ("4") are never letter-ized, and unanswered cells classify
  // correctly regardless of the student's selection shape.
  const isIndexCell = (i) => {
    const t = correctAnswers[i]?.type;
    return t === "Cm" || t === "Cs";
  };
  const toLetter = (n) => String.fromCharCode(65 + Number(n));
  // Correspondence (Cmu) cells carry per-number letter sets: the correct key is
  // an array-of-arrays [[idx,…],…]; the student answer is a map {leftIdx:[idx,…]}.
  // Render both as "1: a,c · 2: b" with LOWER-case letters (matching the grid).
  const isCmuCell = (i) => correctAnswers[i]?.type === "Cmu";
  const cmuLetters = (arr) =>
    (Array.isArray(arr) ? arr : [])
      .map(Number)
      .sort((a, b) => a - b)
      .map((n) => String.fromCharCode(97 + n))
      .join(",");
  // Render a Cmu answer as a compact vertical mini-list (one "N: letters" per
  // line) so it never wraps char-by-char and breaks the table row height.
  const renderCmu = (val) => {
    const entries = Array.isArray(val)
      ? val.map((arr, k) => [k, arr])
      : val && typeof val === "object"
      ? Object.keys(val)
          .sort((a, b) => Number(a) - Number(b))
          .map((k) => [k, val[k]])
      : [];
    const parts = entries
      .filter(([, arr]) => Array.isArray(arr) && arr.length)
      .map(([k, arr]) => `${Number(k) + 1}: ${cmuLetters(arr)}`);
    if (!parts.length) return "—";
    return (
      <span className="inline-flex flex-col items-start gap-0.5 text-left leading-tight">
        {parts.map((p, idx) => (
          <span key={idx} className="whitespace-nowrap">
            {p}
          </span>
        ))}
      </span>
    );
  };
  // Render any answer shape (string / index / array / map) to a compact label —
  // never "[object Object]" and never a falsy index-0 dropped to a dash.
  const fmt = (val, indexCell) => {
    if (val == null || val === "") return "—";
    if (Array.isArray(val)) {
      if (!val.length) return "—";
      return val
        .map((x) => (indexCell && /^\d+$/.test(String(x)) ? toLetter(x) : String(x)))
        .join(", ");
    }
    if (typeof val === "object") {
      // Matching selection map { leftIdx: rightText } — show the chosen rights in
      // left order so the student sees their pairing (full detail is in review).
      const keys = Object.keys(val).sort((a, b) => Number(a) - Number(b));
      return keys.length ? keys.map((k) => String(val[k])).join(", ") : "—";
    }
    if (indexCell && /^\d+$/.test(String(val))) return toLetter(val);
    return String(val);
  };
  const answered = (i) => hasAnswer({ answer: selectedAnswers[i]?.answer });
  // Shared scorer mirrors the server for EVERY type (incl. Cs set-equality and
  // Cma all-or-nothing) so per-cell marks always agree with the score.
  const isCorrect = (i) =>
    answered(i) &&
    isSelectionCorrect(correctAnswers[i]?.answer, selectedAnswers[i]?.answer, correctAnswers[i]?.type);
  // Colour the student-answer cell green/red by correctness once answered.
  const showMark = (i) => answered(i) && hasCorrect;

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
                className="min-w-[3rem] whitespace-nowrap border-l border-line px-3 py-3 text-center font-semibold text-muted"
              >
                {i + 1}
              </td>
            ))}
          </tr>
          {hasCorrect && (
            <tr className="border-b border-line">
              <td className={rowLabel}>Doğru cavab</td>
              {cells.map((i) => (
                <td
                  key={i}
                  className="min-w-[3rem] whitespace-nowrap border-l border-line px-3 py-3 text-center align-middle text-text"
                >
                  {isCmuCell(i)
                    ? renderCmu(correctAnswers[i]?.answer)
                    : fmt(correctAnswers[i]?.answer, isIndexCell(i))}
                </td>
              ))}
            </tr>
          )}
          <tr className={hasCorrect ? "border-b border-line" : ""}>
            <td className={rowLabel}>Sənin cavabın</td>
            {cells.map((i) => (
              <td
                key={i}
                className={`min-w-[3rem] whitespace-nowrap border-l border-line px-3 py-3 text-center align-middle font-medium ${
                  showMark(i)
                    ? isCorrect(i)
                      ? "bg-success/15 text-success"
                      : "bg-danger/12 text-danger"
                    : "text-muted"
                }`}
              >
                {isCmuCell(i)
                  ? renderCmu(selectedAnswers[i]?.answer)
                  : fmt(selectedAnswers[i]?.answer, isIndexCell(i))}
              </td>
            ))}
          </tr>
          {hasCorrect && (
            <tr>
              <td className={rowLabel}>Nəticə</td>
              {cells.map((i) => (
                <td key={i} className="min-w-[3rem] whitespace-nowrap border-l border-line px-3 py-3 text-center align-middle">
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
