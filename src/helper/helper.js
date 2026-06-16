export function attempts_Number(result) {
  return result.filter((r) => r !== -1).length;
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
