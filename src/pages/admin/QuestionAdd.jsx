import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import PdfOpener from "../../components/PdfOpener";
import {
  addQuestion,
  getExamTagandClass,
  getPdfByExam,
} from "../../../redux/features/quiz/quizSlice";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import Spinner from "../../components/Spinner";
import Loader from "../../components/Loader";
import { TailSpin } from "react-loader-spinner";
import QuestionType from "../../components/QuestionType";
import PDFPreview from "../../components/PDFPreview";

const QuestionAdd = () => {
  useRedirectLoggedOutUser("/login");
  const dispatch = useDispatch();
  const { singleClass, singleTag } = useSelector((state) => state.quiz);
  const [pdfData, setPdfData] = useState(null);
  const [questionCount, setQuestionCount] = useState(25);
  const [answers, setAnswers] = useState(Array.from({ length: 25 }, () => ({ answer: "", type: "" })));
  const [loading, setLoading] = useState(false); // State to track loading
  const { examId } = useParams();

  useEffect(() => {
    const fetchData = async () => {
      try {
        await dispatch(getExamTagandClass(examId));
        const getPdfAction = await dispatch(getPdfByExam({ examId }));
        setPdfData(getPdfAction.payload.path);
      } catch (error) {
        console.error("Error fetching PDF:", error);
      }
    };

    fetchData();
  }, [dispatch, examId]);

  const handleAnswerChange = (e, index, type) => {
    const value = e.target.value;
    setAnswers((prevAnswers) => {
      const updatedAnswers = [...prevAnswers];
      updatedAnswers[index] = { ...updatedAnswers[index], answer: value, type };
      return updatedAnswers;
    });
  };

  const submitAnswerSheet = async (e) => {
    e.preventDefault();
    setLoading(true); // Set loading to true when submitting

    try {
      const questionData = {
        correctAnswers: answers,
      };
      await dispatch(addQuestion({ examId, questionData }));
    } catch (error) {
      console.error("Error submitting answer sheet:", error);
      toast.error("Failed to submit answer sheet");
    } finally {
      setLoading(false);
    }
  };

  // Function to increase question count
  const increaseQuestionCount = () => {
    setQuestionCount((prevCount) => prevCount + 1);
    setAnswers((prevAnswers) => [...prevAnswers, ""]); // Add an empty answer for the new question
  };

  // Determine question count and types based on singleTag and singleClass

  return (
    <div className="bg-gray-50 max-w-[1640px] mx-auto my-5 relative">
      {loading && (
        <div className="absolute bg-gray-200 z-[1000] opacity-50 w-full h-full">
          <div className="w-full flex justify-center items-center h-full z-[100]">
            <TailSpin
              height="130"
              width="130"
              color="#1084da"
              ariaLabel="triangle-loading"
              wrapperStyle={{}}
              wrapperClassName=""
              visible={true}
            />
          </div>
        </div>
      )}

      <div className="flex lg:flex-row relative flex-col py-10 justify-center gap-[50px] mx-5">
        <div>
          {/* <PdfOpener pdfFile={pdfData} /> */}
          <PDFPreview pdfPath={pdfData} />
        </div>
        <div className="w-full max-w-[1240px] lg:max-w-[700px] bg-white p-8 rounded-md shadow-md">
          <form onSubmit={submitAnswerSheet}>
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
            <div className="mb-4">
              <button
                type="submit"
                className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                disabled={loading} // Disable button when loading
              >
                {loading ? "Əlavə Olunur..." : "Sualları Əlavə Et"}
              </button>
            </div>
          </form>
          <div className="text-center">
            <button
              onClick={increaseQuestionCount}
              className="text-blue-500 underline cursor-pointer"
            >
              Sual sayını artır
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionAdd;
