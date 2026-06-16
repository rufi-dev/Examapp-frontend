import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getResultsByExam } from "../../../redux/features/quiz/resultSlice";
import { useParams } from "react-router-dom";
import ResultCard from "../../components/ResultCard";
import Loader from "../../components/Loader";
import { PDFDownloadLink } from "@react-pdf/renderer";
import PDFTemplate from "../../components/PDFTemplate";
import PDFAnswersTemplate from "../../components/PDFAnswersTemplate";
import AccountLayout from "../../components/AccountLayout";
import ExamAnalytics from "../../components/analytics/ExamAnalytics";
import { FiDownload, FiList, FiAlertTriangle } from "react-icons/fi";

const pdfBtn =
  "inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-text transition-colors hover:bg-surface2";

const ResultsByExam = () => {
  const dispatch = useDispatch();
  const { examId } = useParams();
  const { resultsByExam, isLoading } = useSelector((state) => state.result);
  const [tab, setTab] = useState("analytics"); // "analytics" | "students"

  useEffect(() => {
    dispatch(getResultsByExam(examId));
  }, [dispatch, examId]);

  if (isLoading) {
    return <Loader />;
  }

  const results = Array.isArray(resultsByExam) ? resultsByExam : [];
  const passingMarks = results[0]?.examId?.passingMarks;

  const tabBtn = (active) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
      active ? "bg-primary text-primary-fg shadow-soft" : "text-muted hover:text-text"
    }`;

  return (
    <AccountLayout
      title="İmtahan nəticələri"
      subtitle="Sinfin ümumi mənzərəsi və hər şagirdin cavabları."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <PDFDownloadLink
            document={<PDFTemplate results={results} />}
            fileName="imtahan-neticeleri.pdf"
          >
            {({ loading }) => (
              <span className={pdfBtn}>
                <FiDownload /> {loading ? "Hazırlanır..." : "Nəticələr (PDF)"}
              </span>
            )}
          </PDFDownloadLink>
          <PDFDownloadLink
            document={<PDFAnswersTemplate results={results} />}
            fileName="imtahan-cavablar.pdf"
          >
            {({ loading }) => (
              <span className={pdfBtn}>
                <FiList /> {loading ? "Hazırlanır..." : "Cavablar (PDF)"}
              </span>
            )}
          </PDFDownloadLink>
        </div>
      }
    >
      <div className="mb-6 inline-flex rounded-xl border border-line bg-surface2/50 p-1">
        <button type="button" onClick={() => setTab("analytics")} className={tabBtn(tab === "analytics")}>
          Analitika
        </button>
        <button type="button" onClick={() => setTab("students")} className={tabBtn(tab === "students")}>
          Şagirdlər ({results.length})
        </button>
      </div>

      {results.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-surface p-16 text-center text-muted">
          Hələ nəticə yoxdur.
        </div>
      ) : tab === "analytics" ? (
        <ExamAnalytics results={results} passingMarks={passingMarks} />
      ) : (
        <div className="flex flex-col gap-6">
          {results.map((result, index) => (
            <div
              key={result._id || index}
              className={`rounded-3xl bg-surface p-6 shadow-soft ${
                result.terminated ? "border-2 border-danger" : "border border-line"
              }`}
            >
              {result.terminated && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white">
                  <FiAlertTriangle /> Pozuntuya görə dayandırıldı ({result.violations || 0} pozuntu)
                </div>
              )}
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
                <div className="flex items-center gap-2">
                  {result.violations > 0 && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-danger/12 px-3 py-1 text-sm font-semibold text-danger"
                      title="Anti-cheat pozuntuları (tab keçidi / pəncərədən çıxma)"
                    >
                      <FiAlertTriangle /> {result.violations}
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-full bg-primary/12 px-3 py-1 text-sm font-semibold text-primary">
                    {result.earnPoints} bal
                  </span>
                </div>
              </div>
              <ResultCard result={result} />
            </div>
          ))}
        </div>
      )}
    </AccountLayout>
  );
};

export default ResultsByExam;
