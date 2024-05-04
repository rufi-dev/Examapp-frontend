const ResultCard = ({ result }) => {
  let defaultMultipleChoice = 0;
  let defaultOpenQuestion = 0;
  let defaultDetailedQuestion = 0;
  let defaultMatchedQuestion = 0;
  result?.correctAnswers?.forEach((answer) => {
    switch (answer.type) {
      case "Cm":
        defaultMultipleChoice++;
        break;
      case "Co":
        defaultOpenQuestion++;
        break;
      case "Cd":
        defaultDetailedQuestion++;
        break;
      case "Cma":
        defaultMatchedQuestion++;
        break;
      default:
        break;
    }
  });

  return (
    <table className="w-full border-collapse border border-gray-200">
      <thead>
        {
          <tr className="bg-gray-100">
            <th className="border border-gray-200"></th>
            <th
              colSpan={defaultMultipleChoice}
              className="border border-gray-200 p-2"
            >
              Qapalı testlər
            </th>
            <th
              colSpan={defaultOpenQuestion}
              className="border border-gray-200 p-2"
            >
              Açıq testlər
            </th>
            {defaultMatchedQuestion > 0 && (
              <th
                colSpan={defaultMatchedQuestion}
                className="border border-gray-200 p-2"
              >
                Uyğunluq
              </th>
            )}
            <th
              colSpan={defaultDetailedQuestion}
              className="border border-gray-200 p-2"
            >
              Yazı işləri
            </th>
          </tr>
        }
      </thead>
      <tbody>
        <tr>
          <td className="border border-gray-200 p-2 font-bold">Doğru Cavab</td>
          {result?.correctAnswers.map((answer, index) => (
            <td
              key={index}
              className={`border text-center border-gray-200 p-2 ${
                answer?.answer === result?.selectedAnswers[index]?.answer
                  ? "bg-[#77DD77]"
                  : "bg-[#FF6961]"
              }`}
            >
              {answer.answer}
            </td>
          ))}
        </tr>
        <tr>
          <td className="border border-gray-200 p-2 font-bold">Cavab</td>
          {result?.selectedAnswers.map((answer, index) => (
            <td
              key={index}
              className={`border text-center border-gray-200 p-2 ${
                answer?.answer === result.correctAnswers[index].answer
                  ? "bg-[#77DD77]"
                  : "bg-[#FF6961]"
              }`}
            >
              {answer?.answer}
            </td>
          ))}
        </tr>
        <tr>
          <td className="border border-gray-200 p-2 font-bold">Nəticə</td>
          {result?.selectedAnswers.map((answer, index) => (
            <td
              key={index}
              className={`border text-center border-gray-200 p-2 ${
                answer?.answer === result.correctAnswers[index].answer
                  ? "bg-[#77DD77]"
                  : "bg-[#FF6961]"
              }`}
            >
              {answer?.answer === result?.correctAnswers[index].answer
                ? "+"
                : "-"}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
};

export default ResultCard;
