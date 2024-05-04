import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getResultsByExam } from "../../../redux/features/quiz/resultSlice";
import { useParams } from "react-router-dom";
import ResultCard from "../../components/ResultCard";
import Loader from "../../components/Loader";
import { PDFDownloadLink } from "@react-pdf/renderer";
import PDFTemplate from "../../components/PDFTemplate";

const ResultsByExam = () => {
  const dispatch = useDispatch();
  const { examId } = useParams();

  const { resultsByExam, isLoading } = useSelector((state) => state.result);
  useEffect(() => {
    dispatch(getResultsByExam(examId));
  }, [dispatch, examId]);
  if (isLoading) {
    return <Loader />;
  }
  
  return (
    <div className="max-w-[1440px] mx-auto p-5">
      <PDFDownloadLink document={<PDFTemplate results={resultsByExam}/>} fileName="exam_results.pdf">
        {(
          { blob, url, loading, error }
        ) =>
          loading ? (
            <button>Loading document...</button>
          ) : (
            <button onClick={()=>{}} className="my-2 bg-gray-200 px-2 py-1 rounded-md text-sm">Nəticələri yüklə</button>
          )
        }
      </PDFDownloadLink>
      <div className="flex flex-col gap-5">
        {resultsByExam &&
          resultsByExam.length > 0 &&
          resultsByExam.map((result, index) => (
            <div className="border">
              <div className="flex font-bold justify-between p-4">
                <span className="">{result.userId.name}</span>
                <span className="">{result.userId.bio}</span>
                <span className="">{result.userId.phone}</span>
                <span className="">{result.userId.email}</span>
                <span>{result.earnPoints} bal</span>
                <span>{result.examId.name}</span>
              </div>
              <ResultCard key={index} result={result} />
            </div>
          ))}
      </div>
    </div>
  );
};

export default ResultsByExam;
