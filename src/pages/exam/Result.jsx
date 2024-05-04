import React, { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Loader from "../../components/Loader";
import ResultTable from "../../components/ResultTable";
import { RESET_QUIZ, getExam } from "../../../redux/features/quiz/quizSlice";
import {
  RESET_RESULT,
  getResultsByUserByExam,
} from "../../../redux/features/quiz/resultSlice";
import { attempts_Number, earnPoints_Number } from "../../helper/helper";
import ResultCard from "../../components/ResultCard";

const Result = () => {
  const dispatch = useDispatch();
  const { examId } = useParams();
  const { resultByExam, isLoading } = useSelector((state) => state.result);
  const lastResult = resultByExam[resultByExam.length - 1];

  useEffect(() => {
    dispatch(getResultsByUserByExam(examId));
    dispatch(getExam(examId));
  }, [dispatch, examId]);

  if (isLoading || !lastResult) {
    return <Loader />;
  }

  return (
    <div className="px-8 max-w-[1440px] mx-auto">
      <h1 className="font-bold my-5 text-[30px]">İmtahan nəticələri</h1>
      {<ResultCard result={lastResult} />}
      <div className="flex items-center">
        <div className="w-full my-10 text-center">
          <Link
            to={`/exam/details/${examId}`}
            className="bg-orange-500 text-white px-4 py-2"
            onClick={() => {
              dispatch(RESET_QUIZ());
              dispatch(RESET_RESULT());
            }}
          >
            Restart
          </Link>
        </div>
        <div className="w-full my-10 text-center">
          <Link to={`/myResults`} className="bg-[#1084da] text-white px-4 py-2">
            My Results
          </Link>
        </div>
      </div>
      <ResultTable results={resultByExam} />
    </div>
  );
};

export default Result;
