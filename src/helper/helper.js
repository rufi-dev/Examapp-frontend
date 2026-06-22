export function attempts_Number(result) {
  return result.filter((r) => r !== -1).length;
}

// Does an answer-sheet entry hold a real (non-blank) answer? Generalized over
// every answer shape so the progress count works for all question types:
//   - string  (letter / typed text)  -> non-empty after trim
//   - number  (structured single-choice INDEX, incl. 0) -> always counts
//   - array   (multi-select indices) -> non-empty
//   - object  (matching map)         -> has keys
// Mirrors the server's `isAnswered`. A plain `a && a.answer` truthiness check
// would wrongly treat index 0 / empty arrays as blank, so use this everywhere.
export function hasAnswer(a) {
  if (!a) return false;
  const v = a.answer;
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return String(v).trim() !== "";
}

// Point distribution for an exam, by question position. The last group's
// per-question value is rounded to 2 decimals (45/7 -> 6.43) and the first 18
// questions split whatever remains, so every question within a group is worth
// the same and the grand total is exactly 100:
//   (100 - 6.43*7)/18 = 3.055 each  ->  3.055*18 + 6.43*7 = 100.
// For 18 or fewer questions, the full 100 is split equally.
export const FIRST_GROUP_SIZE = 18;
export const FIRST_GROUP_POINTS = 55;
export const SECOND_GROUP_POINTS = 45;

export function questionPoints(count) {
  const n = Number(count) || 0;
  if (n <= 0) return [];
  const aCount = Math.min(FIRST_GROUP_SIZE, n);
  const bCount = n - aCount;
  if (bCount === 0) return Array.from({ length: n }, () => 100 / n);
  const secondEach = Math.round((SECOND_GROUP_POINTS / bCount) * 100) / 100; // 6.43
  const firstEach = (100 - secondEach * bCount) / aCount; // 3.055
  return Array.from({ length: n }, (_, i) => (i < aCount ? firstEach : secondEach));
}

// Client-side mirror of the SERVER scorer (quizController.js `isCorrectAnswer`).
// Given a stored correct value, the student's selection and the question type,
// decide if the selection is correct — handling EVERY answer shape so result /
// review / analytics surfaces never disagree with the authoritative score:
//   - matching (Cma): selection is a {leftIdx: rightText} map; correct is the
//     right texts in left order -> all-or-nothing;
//   - single/multi choice: correct is a numeric INDEX array. Cm selection is a
//     scalar index (membership); Cs selection is an index array (set-equality);
//   - open / legacy PDF: trimmed string compare.
// Keep in sync with the backend `isCorrectAnswer`.
export function isSelectionCorrect(correct, selected, type) {
  const n = (v) => String(v ?? "").trim();
  const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
  if (selected == null) return false;
  // Correspondence (Cmu): selection is a {leftIdx: [indices]} map; correct is
  // [[indices], …] per number. Set-equality per number, all-or-nothing,
  // letters reusable. (Must precede the generic map branch below.)
  if (type === "Cmu") {
    if (!isMap(selected) || !Array.isArray(correct) || !correct.length) return false;
    const setEq = (x, y) => {
      const xs = (Array.isArray(x) ? x : []).map(Number);
      const ys = (Array.isArray(y) ? y : []).map(Number);
      if (xs.length !== ys.length) return false;
      const s = new Set(xs);
      return ys.every((v) => s.has(v));
    };
    return correct.every((arr, k) => setEq(selected[k], arr));
  }
  // Matching (Cma).
  if (type === "Cma" || isMap(selected)) {
    if (!isMap(selected) || !Array.isArray(correct) || !correct.length) return false;
    return correct.every((r, k) => n(selected[k]) === n(r));
  }
  // Choice (correct is a numeric-index array).
  if (Array.isArray(correct) && correct.every((x) => typeof x === "number" || /^\d+$/.test(String(x)))) {
    const want = correct.map(Number).sort((a, b) => a - b);
    if (Array.isArray(selected)) {
      // Cs multi-select: set-equality (partial selection scores 0).
      const got = selected.map(Number).sort((a, b) => a - b);
      return want.length > 0 && want.length === got.length && want.every((v, k) => v === got[k]);
    }
    // Cm single-choice: scalar index membership.
    if (selected === "") return false;
    return new Set(want).has(Number(selected));
  }
  // Open / legacy string.
  return n(selected) !== "" && n(selected) === n(correct);
}

// Score an answer sheet against the exam's correct answers.
// Each correctly answered question is worth its position-based point value;
// the total adds up to 100. Extra args (queue/singleClass/singleTag) are
// accepted for backward compatibility but no longer used.
export function earnPoints_Number(result, correctAnswers) {
  const answersList = Array.isArray(correctAnswers) ? correctAnswers : [];
  const points = questionPoints(answersList.length);

  let earnedPoints = 0;
  const counts = { Cm: 0, Co: 0, Cd: 0, Cma: 0 };

  answersList.forEach((correctAnswer, index) => {
    if (!correctAnswer) return;
    const selected = result[index];
    // Mirror the server scorer: trim, whitespace-only counts as blank.
    const sa = String(selected?.answer ?? "").trim();
    const isCorrect = sa !== "" && sa === String(correctAnswer.answer ?? "").trim();

    if (isCorrect) {
      earnedPoints += points[index] || 0;
      if (counts[correctAnswer.type] !== undefined) counts[correctAnswer.type]++;
    }
  });

  const correctAnswersByType = [
    { type: "Cm", count: counts.Cm },
    { type: "Co", count: counts.Co },
    { type: "Cd", count: counts.Cd },
    { type: "Cma", count: counts.Cma },
  ];

  return {
    earnedPoints: parseFloat(earnedPoints.toFixed(2)),
    correctAnswersByType,
  };
}

export function flagResult(totalPoints, earnPoints) {
  return totalPoints <= earnPoints;
}
