import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getResultsByExam } from "../../../redux/features/quiz/resultSlice";
import { useParams } from "react-router-dom";
import ResultCard from "../../components/ResultCard";
import Loader from "../../components/Loader";
import { PDFDownloadLink } from "@react-pdf/renderer";
import PDFTemplate from "../../components/PDFTemplate";
import AccountLayout from "../../components/AccountLayout";
import { FiDownload } from "react-icons/fi";

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
    <AccountLayout
      title="İmtahan nəticələri"
      subtitle="Bu imtahanı həll edən bütün istifadəçilər."
      actions={
        <PDFDownloadLink
          document={<PDFTemplate results={resultsByExam} />}
          fileName="imtahan-neticeleri.pdf"
        >
          {({ loading }) => (
            <span className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-text transition-colors hover:bg-surface2">
              <FiDownload /> {loading ? "Hazırlanır..." : "Nəticələri yüklə (PDF)"}
            </span>
          )}
        </PDFDownloadLink>
      }
    >
        {resultsByExam && resultsByExam.length > 0 ? (
          <div className="flex flex-col gap-6">
            {resultsByExam.map((result, index) => (
              <div
                key={result._id || index}
                className="rounded-3xl border border-line bg-surface p-6 shadow-soft"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold text-text">
                      {result.userId?.name || "—"}
                    </p>
                    <p className="text-sm text-muted">
                      {result.userId?.email}
                      {result.userId?.phone ? ` · ${result.userId.phone}` : ""}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-primary/12 px-3 py-1 text-sm font-semibold text-primary">
                    {result.earnPoints} bal
                  </span>
                </div>
                <ResultCard result={result} />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-line bg-surface p-16 text-center text-muted">
            Hələ nəticə yoxdur.
          </div>
        )}
    </AccountLayout>
  );
};

export default ResultsByExam;
