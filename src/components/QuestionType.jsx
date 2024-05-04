import React from "react";
import { useSelector } from "react-redux";

const QuestionType = ({
  singleClass,
  singleTag,
  answers,
  review,
  handleAnswerChange,
}) => {
  const selectedAnswers = review?.selectedAnswers || [];

  const determineQuestionCountsAndTypes = () => {
    let multipleChoiceCount = 0;
    let openQuestionCount = 0;
    let detailedQuestionCount = 0;
    let matchingQuestionCount = 0; // Only for "1 ci qrup" or "2 ci qrup" and class level is "11"

    if (singleTag?.name === "Buraxılış" && singleClass?.level === 9) {
      multipleChoiceCount = 15;
      openQuestionCount = 6;
      detailedQuestionCount = 4;
    } else if (singleTag?.name === "Buraxılış" && singleClass?.level === 11) {
      multipleChoiceCount = 13;
      openQuestionCount = 5;
      detailedQuestionCount = 7;
    } else if (
      singleTag?.name === "Blok" && (singleClass?.level === 1 ||
      singleClass?.level === 2)
    ) {
      multipleChoiceCount = 22;
      openQuestionCount = 4;
      matchingQuestionCount = 1;
      detailedQuestionCount = 3;
    } else {
      multipleChoiceCount = 25;
      openQuestionCount = 0;
      matchingQuestionCount = 0;
      detailedQuestionCount = 0;
    }
    return {
      multipleChoiceCount,
      openQuestionCount,
      detailedQuestionCount,
      matchingQuestionCount,
    };
  };
  const renderQuestionInputs = () => {
    const {
      multipleChoiceCount,
      openQuestionCount,
      detailedQuestionCount,
      matchingQuestionCount,
    } = determineQuestionCountsAndTypes(singleClass, singleTag);
    const questionInputs = [];
    for (let i = 0; i < multipleChoiceCount; i++) {
      questionInputs.push(
        <div key={`mc-${i}`} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">{`Qapalı sual ${
            i + 1
          }:`}</label>
          <div className="flex flex-wrap items-center justify-between w-full">
            {["a", "b", "c", "d", "e"].map((option) => (
              <div
                key={option}
                className="flex items-center mr-4 justify-center"
              >
                <input
                  type="radio"
                  id={`answer-${i}-${option}`}
                  name={`answer-${i}`}
                  value={option}
                  onChange={(e) => handleAnswerChange(e, i, "Cm")}
                  className="sr-only"
                />
                <label
                  htmlFor={`answer-${i}-${option}`}
                  className="relative rounded-full p-2  mr-2 cursor-pointer"
                  style={{
                    background:
                      answers[i].answer === option
                        ? selectedAnswers[i]?.answer?.length > 0
                          ? "#77DD77"
                          : "#1084da" // Green color for correct answer
                        : option === selectedAnswers[i]?.answer
                        ? "#FF6961"
                        : "rgb(229 231 235)", // Default color
                  }}
                >
                  <span className="h-6 w-6 flex items-center justify-center bg-white rounded-full">
                    {option}
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>
      );
    }

    for (let i = 0; i < openQuestionCount; i++) {
      const correctAnswer = answers[multipleChoiceCount + i]?.answer || null;
      const selectedAnswer =
        selectedAnswers[multipleChoiceCount + i]?.answer || null;
      const isCorrect =
        correctAnswer === null || selectedAnswer === null
          ? null
          : correctAnswer === selectedAnswer;
      questionInputs.push(
        <div key={`open-${i}`} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {`Açıq sual ${multipleChoiceCount + i + 1}: ${
              isCorrect == null ? "" : isCorrect ? "✔" : "❌ " + correctAnswer
            }`}
          </label>
          <textarea
            rows={4}
            className="w-full border rounded-md p-2 focus:outline-none focus:ring focus:ring-blue-200"
            placeholder="Enter your answer..."
            value={selectedAnswer}
            onChange={(e) =>
              handleAnswerChange(e, multipleChoiceCount + i, "Co")
            }
          ></textarea>
          {}
        </div>
      );
    }

    // Add matching question input if applicable
    for (let i = 0; i < matchingQuestionCount; i++) {
      const correctAnswer =
        answers[multipleChoiceCount + openQuestionCount + i]?.answer || null;
      const selectedAnswer =
        selectedAnswers[multipleChoiceCount + openQuestionCount + i]?.answer ||
        null;
      const isCorrect =
        correctAnswer === null || selectedAnswer === null
          ? null
          : correctAnswer === selectedAnswer;

      if (matchingQuestionCount > 0) {
        questionInputs.push(
          <div key={`matching-0`} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {`Uyğunluq ${multipleChoiceCount + openQuestionCount + i + 1}: ${
                isCorrect == null ? "" : isCorrect ? "✔" : "❌ " + correctAnswer
              }`}
            </label>
            <textarea
              rows={6}
              className="w-full border rounded-md p-2 focus:outline-none focus:ring focus:ring-blue-200"
              placeholder="Enter your answer..."
              value={selectedAnswer}
              onChange={(e) =>
                handleAnswerChange(
                  e,
                  multipleChoiceCount + openQuestionCount + i,
                  "Cma"
                )
              }
            ></textarea>
          </div>
        );
      }
    }

    for (let i = 0; i < detailedQuestionCount; i++) {
      const correctAnswer =
        answers[
          multipleChoiceCount + openQuestionCount + matchingQuestionCount + i
        ]?.answer || null;
      const selectedAnswer =
        selectedAnswers[
          multipleChoiceCount + openQuestionCount + matchingQuestionCount + i
        ]?.answer || null;
      const isCorrect =
        correctAnswer === null || selectedAnswer === null
          ? null
          : correctAnswer === selectedAnswer;
      questionInputs.push(
        <div key={`detailed-${i}`} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {`Ətraflı yazı ${
              multipleChoiceCount +
              openQuestionCount +
              matchingQuestionCount +
              i +
              1
            }: ${
              isCorrect == null ? "" : isCorrect ? "✔" : "❌ " + correctAnswer
            }`}
          </label>
          <textarea
            rows={6}
            className="w-full border rounded-md p-2 focus:outline-none focus:ring focus:ring-blue-200"
            placeholder="Enter your answer..."
            value={selectedAnswer}
            onChange={(e) =>
              handleAnswerChange(
                e,
                multipleChoiceCount +
                  openQuestionCount +
                  matchingQuestionCount +
                  i,
                "Cd"
              )
            }
          ></textarea>
        </div>
      );
    }

    return questionInputs;
  };
  return <div>{renderQuestionInputs()}</div>;
};

export default QuestionType;
