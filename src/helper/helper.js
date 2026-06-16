export function attempts_Number(result) {
  return result.filter((r) => r !== -1).length;
}

// Point distribution for an exam, by question position:
//   - the first 18 questions share 55 points
//   - the remaining questions share 45 points
//   => total is ALWAYS exactly 100 for exams with 19+ questions.
// For 18 or fewer questions, the full 100 is split across them.
export const FIRST_GROUP_SIZE = 18;
export const FIRST_GROUP_POINTS = 55;
export const SECOND_GROUP_POINTS = 45;

// Split `total` points across `n` questions as 2-decimal values that sum to
// EXACTLY `total`. The leftover cents are handed out one-by-one (largest
// remainder) instead of repeating a rounded share, so e.g. 55 over 18 is
// 3.06 × 10 + 3.05 × 8 = 55.00 — never 3.06 × 18 = 55.08 that pushes the
// grand total past 100.
function distribute(total, n) {
  if (n <= 0) return [];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const rem = cents - base * n; // this many questions get one extra cent
  return Array.from({ length: n }, (_, i) => (base + (i < rem ? 1 : 0)) / 100);
}

export function questionPoints(count) {
  const n = Number(count) || 0;
  if (n <= 0) return [];
  const aCount = Math.min(FIRST_GROUP_SIZE, n);
  const bCount = n - aCount;
  if (bCount === 0) return distribute(100, n);
  return [
    ...distribute(FIRST_GROUP_POINTS, aCount),
    ...distribute(SECOND_GROUP_POINTS, bCount),
  ];
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
    const isCorrect =
      selected != null &&
      selected.answer != null &&
      selected.answer !== "" &&
      selected.answer === correctAnswer.answer;

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
