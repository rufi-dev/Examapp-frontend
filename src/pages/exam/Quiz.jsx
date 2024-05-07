import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import Questions from "../../components/Questions";
import {
  RESET_QUIZ,
  getExam,
  getExamTagandClass,
  getPdfByExam,
  getQuestionByExam,
  moveNextQuestion,
  movePrevQuestion,
  startExam,
  startExamAction,
  userSelectedAnswer,
} from "../../../redux/features/quiz/quizSlice";

import {
  RESET_RESULT,
  addResult,
  pushResultAction,
} from "../../../redux/features/quiz/resultSlice";
import {
  attempts_Number,
  earnPoints_Number,
  flagResult,
} from "../../helper/helper";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FaChevronLeft, FaChevronRight, FaCheckCircle } from "react-icons/fa";
import Spinner from "../../components/Spinner";
import PdfOpener from "../../components/PdfOpener";
import QuestionType from "../../components/QuestionType";
import { toast } from "react-toastify";
import PDFPreview from "../../components/PDFPreview";

const Quiz = () => {
  const { queue, singleExam } = useSelector((state) => state.quiz);

  const [answers, setAnswers] = useState(
    Array.from({ length: queue?.correctAnswers?.length || 25 }, () => "")
  );
  const [aboutToEnd, setAboutToEnd] = useState(false);
  const [checked, setChecked] = useState(-1);
  const { examId } = useParams();
  const [pdfData, setPdfData] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { singleClass, singleTag, isExamStarted } = useSelector(
    (state) => state.quiz
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch(getExam(examId));
        const currentDate = new Date();
        if (singleExam) {
          const examStartDate = new Date(singleExam.startDate);
          const examEndDate = new Date(singleExam.endDate);
          if (currentDate < examStartDate || currentDate > examEndDate) {
            // Redirect the user
            navigate(-1);
            return;
          } else await dispatch(startExamAction({ examId, setPdfData }));
        }
        // dispatch(getExam(examId));
        // await dispatch(getExamTagandClass(examId));
        // const getPdfAction = await dispatch(getPdfByExam({ examId }));
        // setPdfData(getPdfAction.payload.path);
        // dispatch(getQuestionByExam(examId));
      } catch (error) {
        console.error("Error fetching PDF:", error);
      }
    };

    fetchData();
  }, [dispatch, examId, singleExam]);
  const [counter, setCounter] = useState(
    parseInt(localStorage.getItem("quizCountdown")) || singleExam?.duration
  );

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isExamStarted) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dispatch, isExamStarted, location]);

  const calculateResultData = () => {
    const attempts = attempts_Number(answers);
    const earnPoints = earnPoints_Number(
      answers,
      queue[0].correctAnswers,
      queue[0],
      singleClass,
      singleTag
    );
    console.log(queue[0].correctAnswers);
    return {
      attempts,
      earnPoints: earnPoints.earnedPoints > 0 ? earnPoints.earnedPoints : 0,
      selectedAnswers: answers.map((answer) => ({
        type: answer?.type,
        answer: answer?.answer,
      })),
      correctAnswers: queue[0].correctAnswers.map((answer) => ({
        type: answer.type,
        answer: answer.answer,
      })),
      correctAnswersByType: earnPoints.correctAnswersByType.map((item) => ({
        type: item.type,
        count: item.count,
      })),
    };
  };

  // const finishExam = async () => {
  //   if (checked !== -1) {
  //     await dispatch(pushResultAction(checked));
  //   }

  //   const newResult = checked !== -1 ? [...result, checked] : result;

  //   const resultData = calculateResultData(newResult);

  //   await dispatch(addResult({ examId, resultData }));

  //   localStorage.removeItem("quizCountdown");

  //   dispatch(RESET_QUIZ());
  //   dispatch(RESET_RESULT());

  //   navigate(`/exam/${examId}/result`);
  // };

  useEffect(() => {
    counter > 0 && setTimeout(() => setCounter(counter - 1), 1000);
    localStorage.setItem("quizCountdown", counter);

    if (counter == 0) {
      submitAnswerSheet();
    }
    if (counter <= 10) setAboutToEnd(true);
  }, [counter]);

  useEffect(() => {
    localStorage.setItem("quizCountdown", counter);
  }, [counter]);

  const submitAnswerSheet = async (e) => {
    try {
      const resultData = calculateResultData();
      console.log(resultData);
      await dispatch(addResult({ examId, resultData }));
      await dispatch(startExam(false));
      localStorage.removeItem("quizCountdown");
      navigate(`/exam/${examId}/result`);
    } catch (error) {
      console.error("Error submitting answer sheet:", error);
      toast.error("Failed to submit answer sheet");
    } finally {
      setIsSubmitting(false);
    }
  };
  const onChecked = (check) => {
    setChecked(check);
  };

  const handleAnswerChange = (e, index, type) => {
    const value = e.target.value;
    setAnswers((prevAnswers) => {
      const updatedAnswers = [...prevAnswers];
      updatedAnswers[index] = { ...updatedAnswers[index], answer: value, type };
      return updatedAnswers;
    });
    dispatch(userSelectedAnswer({ index, answer: value, type }));
  };

  const calculateRemainingTime = () => {
    const minutes = Math.floor(counter / 60);
    const seconds = counter % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // useEffect(() => {
  //   const timerInterval =
  //     counter > 0 &&
  //     setInterval(() => {
  //       setCounter((prevCounter) => prevCounter - 1);
  //     }, 1000);

  //   return () => clearInterval(timerInterval);
  // }, [counter]);

  // useEffect(() => {
  //   // Dispatch action to update timer in Redux state
  //   dispatch(updateTimer(counter));
  // }, [dispatch, counter, examId]);

  return (
    // singleExam && (
    <div className="flex lg:flex-row relative flex-col py-10 justify-center gap-[50px] mx-5">
      <div>
        {/* <PDFPreview pdfPath={pdfData} /> */}
        <PdfOpener pdfFile={pdfData} />
      </div>
      <div className="w-full max-w-[1240px] lg:max-w-[700px] bg-white p-8 rounded-md shadow-md">
        <div className="flex justify-between mb-8">
          <h1
            className={`text-3xl font-semibold ${aboutToEnd && "text-[red]"}`}
          >
            {calculateRemainingTime()}
          </h1>
        </div>
        <div className="w-full">
          {/* <Questions onChecked={onChecked} /> */}
          {pdfData && (
            <div>
              {/* Render dynamic question inputs */}
              {
                <QuestionType
                  answers={answers}
                  singleTag={singleTag}
                  singleClass={singleClass}
                  handleAnswerChange={handleAnswerChange}
                />
              }
            </div>
          )}
        </div>
        <div className="flex justify-between mt-6">
          <div></div>
          {/* ) : isLoading ? ( */}
          {/* <button
            className="bg-orange-500 w-[100px] flex justify-center text-white py-2 px-4 rounded-md text-sm"
            disabled
          >
            <Spinner />
          </button> */}
          {/* ) : ( */}
          <button
            onClick={submitAnswerSheet}
            className="bg-orange-500 text-white font-bold py-2 px-4 rounded transition-colors duration-300"
          >
            Finish <FaCheckCircle className="w-6 h-6 ml-2 inline" />
          </button>
          {/* )} */}
        </div>
      </div>
    </div>
  );
};

export default Quiz;
