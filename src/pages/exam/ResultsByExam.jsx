import { useEffect, useState, lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getResultsByExam } from "../../../redux/features/quiz/resultSlice";
import { useParams, Link } from "react-router-dom";
import ResultCard from "../../components/ResultCard";
import Loader from "../../components/Loader";
import AccountLayout from "../../components/AccountLayout";
import ExamAnalytics from "../../components/analytics/ExamAnalytics";
import { toast } from "react-toastify";
import { FiDownload, FiAlertTriangle, FiFileText, FiEye } from "react-icons/fi";
import Spinner from "../../components/Spinner";

// Heavy (@react-pdf/renderer ~1.3MB) — loaded only when a teacher clicks export.
const ResultsPdfExport = lazy(() => import("../../components/ResultsPdfExport"));

const pdfBtn =
  "inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-text transition-colors hover:bg-surface2";

const ResultsByExam = () => {
  const dispatch = useDispatch();
  const { examId } = useParams();
  const { resultsByExam, isLoading } = useSelector((state) => state.result);
  const [tab, setTab] = useState("analytics"); // "analytics" | "students"
  const [showPdf, setShowPdf] = useState(false); // defer the PDF export library
  const [excelBusy, setExcelBusy] = useState(false);

  useEffect(() => {
    dispatch(getResultsByExam(examId));
  }, [dispatch, examId]);

  if (isLoading) {
    return <Loader />;
  }

  const results = Array.isArray(resultsByExam) ? resultsByExam : [];
  const passingMarks = results[0]?.examId?.passingMarks;

  // Defer the (heavy) exceljs library until the teacher actually exports.
  const onExcel = async () => {
    if (!results.length) return toast.info("İxrac üçün nəticə yoxdur");
    setExcelBusy(true);
    try {
      const { exportResultsExcel } = await import("../../components/ResultsExcelExport");
      await exportResultsExcel(results);
    } catch (e) {
      toast.error("Excel hazırlanmadı");
      // eslint-disable-next-line no-console
      console.error("excel export:", e);
    } finally {
      setExcelBusy(false);
    }
  };

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
          {showPdf ? (
            <Suspense
              fallback={<span className={pdfBtn}>PDF hazırlanır...</span>}
            >
              <ResultsPdfExport results={results} />
            </Suspense>
          ) : (
            <button type="button" onClick={() => setShowPdf(true)} className={pdfBtn}>
              <FiDownload /> PDF ixrac et
            </button>
          )}
          <button type="button" onClick={onExcel} disabled={excelBusy} className={pdfBtn}>
            {excelBusy ? <Spinner size={16} /> : <FiFileText className="text-success" />} Excel ixrac et
          </button>
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
                  {result._id && (
                    <Link
                      to={`/result/${result._id}/review`}
                      title="Şagirdin cavablarına və həll şəkillərinə bax"
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/5 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                    >
                      <FiEye /> Bax
                    </Link>
                  )}
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
