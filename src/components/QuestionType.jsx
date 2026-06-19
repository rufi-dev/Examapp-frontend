import { memo } from "react";
import { FiFlag } from "react-icons/fi";
import Math, { MathText } from "./Math";
import MatchingQuestion from "./MatchingQuestion";
import ZoomableImage from "./ZoomableImage";

const LABELS = { Cm: "Qapalı sual", Co: "Açıq sual", Cma: "Uyğunluq", Cd: "Ətraflı yazı" };
const DEFAULT_OPTIONS = ["a", "b", "c", "d", "e"];

const norm = (v) => String(v ?? "").trim();
// Normalize any choice-answer shape to a numeric-index array / set.
const toIndexArray = (v) =>
  Array.isArray(v) ? v.map(Number) : v === "" || v == null ? [] : [Number(v)];
const toIndexSet = (v) => new Set(toIndexArray(v));
const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);

// Renders a question stem: text + LaTeX + image(s). For legacy PDF questions
// (no structured content) it falls back to the plain "<label> N" caption.
const Stem = ({ def, i, label }) => {
  const hasStructured =
    norm(def.text) || norm(def.latex) || def.image || (def.images && def.images.length);
  if (!hasStructured) {
    return <p className="text-[15px] font-semibold text-text">{`${label} ${i + 1}`}</p>;
  }
  return (
    <div className="min-w-0 space-y-2">
      <p className="text-[15px] font-semibold leading-relaxed text-text">
        <span className="text-muted">{i + 1}.</span> <MathText text={def.text} />{" "}
        {norm(def.latex) ? <Math latex={def.latex} /> : null}
      </p>
      {def.image && (
        <ZoomableImage
          src={def.image}
          className="max-h-64 rounded-xl border border-line object-contain"
        />
      )}
      {Array.isArray(def.images) &&
        def.images.map((u, k) => (
          <ZoomableImage
            key={k}
            src={u}
            className="max-h-64 rounded-xl border border-line object-contain"
          />
        ))}
    </div>
  );
};

const QuestionType = ({
  singleClass,
  singleTag,
  answers = [],
  review,
  questions,
  handleAnswerChange,
  marked = [],
  onToggleMark,
  // Optional render window {start, end} for paginated exams. Indices stay
  // GLOBAL (answers[i], q-${i}, handlers) — we just skip questions outside the
  // current page. Omitted => render every question (default, all-on-one-page).
  range = null,
}) => {
  const selectedAnswers = review?.selectedAnswers || [];
  const isReview = selectedAnswers.length > 0;

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
          // Structured fields (undefined on PDF exams → legacy rendering).
          text: q.text,
          image: q.image,
          images: q.images,
          latex: q.latex,
          choices: q.choices,
          lefts: q.lefts, // matching: left column (sanitized run payload)
          rights: q.rights, // matching: shuffled right column (run payload)
          pairs: q.pairs, // matching: full pairs (review payload)
        }))
      : countBased();

  const setAnswer = (i, value, type) =>
    handleAnswerChange?.({ target: { value } }, i, type);

  // Choice (Cm/Cs) fill colour, unified for run + review via index sets.
  const choiceClass = (i, ci) => {
    if (isReview) {
      const correctSet = toIndexSet(answers[i]?.answer);
      const userSet = toIndexSet(selectedAnswers[i]?.answer);
      if (correctSet.has(ci)) return "border-success bg-success text-white";
      if (userSet.has(ci)) return "border-danger bg-danger text-white";
      return "border-line bg-surface text-muted";
    }
    return toIndexSet(answers[i]?.answer).has(ci)
      ? "border-primary bg-primary text-primary-fg"
      : "border-line bg-surface text-text hover:border-primary/40";
  };

  // Legacy PDF letter-button colour (compares letters, not indices).
  const optionClass = (i, option) => {
    const isCorrectOpt = norm(answers[i]?.answer) === norm(option);
    const userAns = norm(selectedAnswers[i]?.answer);
    if (isReview) {
      if (isCorrectOpt) return "border-success bg-success text-white";
      if (norm(option) === userAns) return "border-danger bg-danger text-white";
      return "border-line bg-surface text-muted";
    }
    if (isCorrectOpt) return "border-primary bg-primary text-primary-fg";
    return "border-line bg-surface text-muted hover:border-primary/40";
  };

  const onChoice = (i, ci, multi) => {
    if (!multi) return setAnswer(i, ci, "Cm");
    const cur = toIndexArray(answers[i]?.answer);
    const next = cur.includes(ci)
      ? cur.filter((x) => x !== ci)
      : [...cur, ci].sort((a, b) => a - b);
    setAnswer(i, next, "Cs");
  };

  // Teacher explanation, shown only in review (it's part of the revealed key).
  const explanationNote = (def) =>
    isReview && def.explanation ? (
      <div className="mt-2.5 rounded-lg border border-line bg-surface2/40 px-3 py-2 text-sm leading-relaxed text-muted">
        <span className="font-semibold text-text">İzah: </span>
        <MathText text={def.explanation} />
      </div>
    ) : null;

  // Structured single/multi choice list.
  const renderChoices = (def, i, multi) => (
    <div className="flex flex-col gap-2">
      {def.choices.map((choice, ci) => {
        const selected = !isReview && toIndexSet(answers[i]?.answer).has(ci);
        return (
          <button
            key={ci}
            type="button"
            disabled={isReview}
            onClick={() => onChoice(i, ci, multi)}
            className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-[15px] font-medium transition-colors ${choiceClass(
              i,
              ci
            )}`}
          >
            {multi ? (
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded border border-current text-[11px] font-bold">
                {selected ? "✓" : ""}
              </span>
            ) : (
              <span className="w-5 shrink-0 font-bold">{String.fromCharCode(65 + ci)}</span>
            )}
            <span className="min-w-0 flex-1 break-words">
              <MathText text={choice.text} />
              {norm(choice.latex) ? (
                <>
                  {" "}
                  <Math latex={choice.latex} />
                </>
              ) : null}
            </span>
            {choice.image && (
              <ZoomableImage src={choice.image} className="max-h-14 rounded object-contain" />
            )}
          </button>
        );
      })}
    </div>
  );

  // Matching: left column (in order) + a dropdown of the right column. During
  // the exam the rights are shuffled by the server; in review we show each
  // student pick vs the correct one.
  const renderMatching = (def, i) => {
    const lefts =
      def.lefts ||
      (def.pairs
        ? def.pairs.map((p) => ({ text: p.left, latex: p.leftLatex, image: p.leftImage }))
        : []);
    const rights =
      def.rights ||
      (def.pairs
        ? def.pairs.map((p) => ({ text: p.right, latex: p.rightLatex, image: p.rightImage }))
        : []);

    if (isReview) {
      const chosenMap = isMap(selectedAnswers[i]?.answer) ? selectedAnswers[i].answer : {};
      const correctArr = answers[i]?.answer; // renderableCorrect: right texts in left order
      return (
        <div className="space-y-2">
          {lefts.map((lf, li) => {
            const chosen = chosenMap[li];
            const correctR = (Array.isArray(correctArr) ? correctArr[li] : null) ?? def.pairs?.[li]?.right;
            const ok = norm(chosen) && norm(chosen) === norm(correctR);
            return (
              <div
                key={li}
                className={`rounded-xl border px-3 py-2 ${
                  ok ? "border-success bg-success/10" : "border-danger bg-danger/10"
                }`}
              >
                <div className="text-[15px] font-medium text-text">
                  <MathText text={lf.text} />
                  {norm(lf.latex) ? (
                    <>
                      {" "}
                      <Math latex={lf.latex} />
                    </>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 text-sm">
                  <span className={ok ? "text-success" : "text-danger"}>
                    Sənin: {norm(chosen) ? <MathText text={chosen} /> : "—"}
                  </span>
                  {!ok && (
                    <span className="text-success">
                      Doğru: {norm(correctR) ? <MathText text={correctR} /> : "—"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <MatchingQuestion
        lefts={lefts}
        rights={rights}
        value={answers[i]?.answer}
        onChange={(m) => setAnswer(i, m, "Cma")}
      />
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {defs.map((def, i) => {
        // Pagination: render only questions inside the active page window.
        if (range && (i < range.start || i >= range.end)) return null;
        const structuredChoice =
          (def.type === "Cm" || def.type === "Cs") &&
          Array.isArray(def.choices) &&
          def.choices.length;

        // Structured single / multi choice.
        if (structuredChoice) {
          return (
            <div key={i} id={`q-${i}`} className="scroll-mt-4">
              <div className="mb-2.5 flex items-start justify-between gap-2">
                <Stem def={def} i={i} label={LABELS.Cm} />
                {markBtn(i)}
              </div>
              {renderChoices(def, i, def.type === "Cs")}
              {explanationNote(def)}
            </div>
          );
        }

        // Matching (structured run payload has lefts/rights; review has pairs).
        if (def.type === "Cma" && (def.lefts || def.pairs)) {
          return (
            <div key={i} id={`q-${i}`} className="scroll-mt-4">
              <div className="mb-2.5 flex items-start justify-between gap-2">
                <Stem def={def} i={i} label={LABELS.Cma} />
                {markBtn(i)}
              </div>
              {renderMatching(def, i)}
              {explanationNote(def)}
            </div>
          );
        }

        // Legacy PDF single-choice: letter buttons.
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

        // Open / typed answer (Co / Cd), PDF or structured.
        const correctAnswer = answers[i]?.answer || null;
        const userAnswer = selectedAnswers[i]?.answer || null;
        const isCorrect =
          isReview && correctAnswer && userAnswer
            ? norm(correctAnswer) === norm(userAnswer)
            : null;
        return (
          <div key={i} id={`q-${i}`} className="scroll-mt-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Stem def={def} i={i} label={LABELS[def.type] || "Sual"} />
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  {isCorrect === true && <span className="text-success">✓ Doğru</span>}
                  {isCorrect === false && (
                    <span className="text-danger">
                      ✕ Doğru: <MathText text={correctAnswer} />
                    </span>
                  )}
                </p>
              </div>
              {markBtn(i)}
            </div>
            <textarea
              rows={def.type === "Cd" ? 6 : 4}
              readOnly={isReview}
              value={isReview ? userAnswer || "" : answers[i]?.answer || ""}
              onChange={(e) => setAnswer(i, e.target.value, def.type)}
              placeholder="Cavabını yaz..."
              className="w-full rounded-xl border border-line bg-surface p-3 text-[15px] text-text outline-none transition placeholder:text-muted/60 read-only:bg-surface2 focus:border-primary focus:ring-4 focus:ring-ring/25"
            />
            {explanationNote(def)}
          </div>
        );
      })}
    </div>
  );
};

// Memoized: the exam runner re-renders every second (timer); the sheet only
// needs to re-render when answers/marked/handlers change.
export default memo(QuestionType);
