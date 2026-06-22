import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Loader from "../../components/Loader";
import ResultTable from "../../components/ResultTable";
import { RESET_QUIZ, getExam, getExamRank } from "../../../redux/features/quiz/quizSlice";
import {
  RESET_RESULT,
  getResultsByUserByExam,
} from "../../../redux/features/quiz/resultSlice";
import ResultCard from "../../components/ResultCard";
import AccountLayout from "../../components/AccountLayout";
import Button from "../../components/ui/Button";
import { isSelectionCorrect } from "../../helper/helper";
import { FiRotateCcw, FiList, FiAlertTriangle } from "react-icons/fi";

const ScoreRing = ({ value = 0 }) => {
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value / 100);
  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
        <circle cx="40" cy="40" r={r} className="fill-none stroke-surface2" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={r}
          className="fill-none stroke-primary"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute font-display text-lg font-extrabold text-text">{value}%</span>
    </div>
  );
};

const Result = () => {
  const dispatch = useDispatch();
  const { examId } = useParams();
  const { resultByExam, isLoading } = useSelector((state) => state.result);
  const lastResult = resultByExam[resultByExam.length - 1];
  const [rank, setRank] = useState(null);

  useEffect(() => {
    dispatch(getResultsByUserByExam(examId));
    dispatch(getExam(examId));
    dispatch(getExamRank(examId))
      .unwrap()
      .then((r) => setRank(r))
      .catch(() => setRank(null));
  }, [dispatch, examId]);

  if (isLoading || !lastResult) {
    return <Loader />;
  }

  const correctAnswers = lastResult.correctAnswers || [];
  const selectedAnswers = lastResult.selectedAnswers || [];
  const canScore = lastResult.earnPoints != null;
  const canAnswers = correctAnswers.length > 0;
  const total = correctAnswers.length;
  // Correct-count mirrors the server scorer for every type (Cm/Cs/Cma/open) via
  // the shared helper, so this tally agrees with the score ring and the analysis.
  const correct = correctAnswers.filter((a, i) =>
    isSelectionCorrect(a?.answer, selectedAnswers[i]?.answer, a?.type)
  ).length;
  // Score denominator: preset exams (e.g. Blok = 150) are out of their own total;
  // legacy/custom exams stay out of 100 (questionPoints), regardless of a
  // possibly mis-set totalMarks — so existing results never shift.
  const scoreTotal =
    lastResult.examId?.preset && Number(lastResult.examId?.totalMarks)
      ? Number(lastResult.examId.totalMarks)
      : 100;
  const scorePct = canScore
    ? Math.max(0, Math.min(100, Math.round((lastResult.earnPoints / scoreTotal) * 100)))
    : 0;

  return (
    <AccountLayout title="İmtahan nəticələri" subtitle="Son cəhdinin nəticəsi və təhlili.">
      {lastResult.terminated && (
        <div className="mb-8 flex items-start gap-4 rounded-3xl border-2 border-danger bg-danger/10 p-6 shadow-lift">
          <div className="grid h-12 w-12 shrink-0 animate-pulse place-items-center rounded-2xl bg-danger text-white">
            <FiAlertTriangle className="text-2xl" />
          </div>
          <div>
            <h2 className="font-display text-lg font-extrabold uppercase tracking-wide text-danger sm:text-xl">
              İmtahan pozuntuya görə dayandırıldı
            </h2>
            <p className="mt-1 text-sm text-text">
              Anti-cheat qaydaları pozuldu (tab/pəncərə dəyişmə, pəncərəni kiçiltmə və ya ikinci
              monitor). İmtahan avtomatik təqdim edildi
              {lastResult.violations ? ` — ${lastResult.violations} pozuntu` : ""}.
            </p>
          </div>
        </div>
      )}
      {!canScore && !canAnswers ? (
        <div className="mb-10 rounded-3xl border border-line bg-surface p-6 shadow-soft">
          <p className="font-display text-lg font-bold text-text">Cavablarınız qəbul edildi ✓</p>
          <p className="mt-1 text-muted">
            Nəticə və düzgün cavablar açıqlandıqda burada görünəcək.
          </p>
        </div>
      ) : (
        <div className="mb-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {canScore && (
            <div className="flex items-center gap-5 rounded-3xl border border-line bg-surface p-6 shadow-soft">
              <ScoreRing value={scorePct} />
              <div>
                <p className="text-sm text-muted">Nəticə (bal)</p>
                <p className="font-display text-3xl font-extrabold text-primary">
                  {lastResult.earnPoints}
                  <span className="text-lg font-bold text-muted"> / {scoreTotal}</span>
                </p>
              </div>
            </div>
          )}
          {canAnswers && (
            <div className="flex flex-col justify-center rounded-3xl border border-line bg-surface p-6 shadow-soft">
              <p className="text-sm text-muted">Düzgün cavablar</p>
              <p className="font-display text-2xl font-bold text-text">
                {correct} / {total}
              </p>
            </div>
          )}
          {rank?.visible && rank?.participated && (
            <div className="flex flex-col justify-center rounded-3xl border border-line bg-surface p-6 shadow-soft">
              <p className="text-sm text-muted">Sıra</p>
              <p className="font-display text-3xl font-extrabold text-text">
                {rank.rank}
                <span className="text-lg font-bold text-muted"> / {rank.total}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {rank.total > 1
                  ? `İlk ${Math.max(1, Math.round((rank.rank / rank.total) * 100))}% · Orta: ${rank.average}`
                  : "Tək iştirakçı"}
              </p>
            </div>
          )}
          <div className="flex flex-col justify-center rounded-3xl border border-line bg-surface p-6 shadow-soft">
            <p className="text-sm text-muted">Cəhd sayı</p>
            <p className="font-display text-3xl font-extrabold text-text">{resultByExam.length}</p>
          </div>
        </div>
      )}

      {canAnswers ? (
        <>
          <h2 className="mb-3 font-display text-lg font-bold text-text">Cavabların təhlili</h2>
          <ResultCard result={lastResult} />
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-muted">
          Düzgün cavablar hələ açıqlanmayıb.
        </div>
      )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            to={`/exam/details/${examId}`}
            variant="secondary"
            onClick={() => {
              dispatch(RESET_QUIZ());
              dispatch(RESET_RESULT());
            }}
          >
            <FiRotateCcw /> Yenidən cəhd et
          </Button>
          <Button to="/myResults" variant="soft">
            <FiList /> Nəticələrim
          </Button>
        </div>

        <div className="mt-12">
          <h2 className="mb-3 font-display text-lg font-bold text-text">Bütün cəhdlər</h2>
          <ResultTable results={resultByExam} />
        </div>
    </AccountLayout>
  );
};

export default Result;
