export function attempts_Number(result) {
  return result.filter((r) => r !== -1).length;
}

export function earnPoints_Number(
  result,
  correctAnswers,
  queue,
  singleClass,
  singleTag
) {
  // Initialize counters for each type of question
  let correctMultipleChoice = 0;
  let incorrectMultipleChoice = 0;
  let correctOpenQuestion = 0;
  let incorrectOpenQuestion = 0;
  let correctDetailedQuestion = 0;
  let incorrectDetailedQuestion = 0;
  let correctMatchedQuestion = 0;
  let incorrectMatchedQuestion = 0;

  result.forEach((selectedAnswer, index) => {
    if (!queue) return; // Skip if no corresponding question
    // Determine the type of question
    const { type } = correctAnswers[index];

    // Increment counters based on the correctness of the answer
    if (selectedAnswer != null) {
      const correctAnswer = correctAnswers[index]; // Get correct answer from exam data

      if (selectedAnswer.answer === correctAnswer.answer) {
        switch (type) {
          case "Cm":
            correctMultipleChoice++;
            break;
          case "Co":
            correctOpenQuestion++;
            break;
          case "Cd":
            correctDetailedQuestion++;
            break;
          case "Cma":
            correctMatchedQuestion++;
            break;
          // Add cases for other question types if needed
          default:
            break;
        }
      }

      if (selectedAnswer.answer !== correctAnswer.answer) {
        switch (type) {
          case "Cm":
            incorrectMultipleChoice++;
            break;
          case "Co":
            incorrectOpenQuestion++;
            break;
          case "Cd":
            incorrectDetailedQuestion++;
            break;
          case "Cma":
            incorrectMatchedQuestion++;
            break;
          // Add cases for other question types if needed
          default:
            break;
        }
      }
    }
  });

  // Apply the formula to calculate earned points
  let earnedPoints;
  if (singleTag.name === "Buraxılış" && singleClass.level === 11) {
    earnedPoints =
      (correctMultipleChoice +
        correctOpenQuestion +
        2 * correctDetailedQuestion) *
      (25 / 8);
  }
  if (singleTag.name === "Buraxılış" && singleClass.level === 9) {
    earnedPoints =
      ((correctMultipleChoice +
        correctOpenQuestion +
        2 * correctDetailedQuestion) *
        100) /
      29;
  }

  if (
    singleTag.name === "Blok" &&
    (singleClass.level === 1 || singleClass || 2)
  ) {
    earnedPoints =
      ((
        (correctMultipleChoice - 
        (1/4) * incorrectMultipleChoice + correctOpenQuestion+correctMatchedQuestion)
        *(100/33)+
        (correctDetailedQuestion*200/33)
      )
        *1.5);
  }

  const correctAnswersByType = [
    {
      type: "Cm",
      count: correctMultipleChoice,
    },
    {
      type: "Co",
      count: correctOpenQuestion,
    },
    {
      type: "Cd",
      count: correctDetailedQuestion,
    },
    {
      type: "Cma",
      count: correctDetailedQuestion,
    },
  ];
  return {
    earnedPoints: parseFloat(earnedPoints.toFixed(2)),
    correctAnswersByType,
  };
}

export function flagResult(totalPoints, earnPoints) {
  return totalPoints <= earnPoints;
}
