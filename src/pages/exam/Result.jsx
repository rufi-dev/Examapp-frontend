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
import { FiRotateCcw, FiList } from "react-icons/fi";

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
  const correct = correctAnswers.filter(
    (a, i) => a?.answer && selectedAnswers[i]?.answer === a.answer
  ).length;
  const pct = total ? Math.round((correct / total) * 100) : 0;

  return (
    <AccountLayout title="İmtahan nəticələri" subtitle="Son cəhdinin nəticəsi və təhlili.">
      {!canScore && !canAnswers ? (
        <div className="mb-10 rounded-3xl border border-line bg-surface p-6 shadow-soft">
          <p className="font-display text-lg font-bold text-text">Cavablarınız qəbul edildi ✓</p>
          <p className="mt-1 text-muted">
            Nəticə və düzgün cavablar açıqlandıqda burada görünəcək.
          </p>
        </div>
      ) : (
        <div className="mb-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {canAnswers && (
            <div className="flex items-center gap-5 rounded-3xl border border-line bg-surface p-6 shadow-soft">
              <ScoreRing value={pct} />
              <div>
                <p className="text-sm text-muted">Düzgün cavablar</p>
                <p className="font-display text-2xl font-bold text-text">
                  {correct} / {total}
                </p>
              </div>
            </div>
          )}
          {canScore && (
            <div className="flex flex-col justify-center rounded-3xl border border-line bg-surface p-6 shadow-soft">
              <p className="text-sm text-muted">Yığılan bal</p>
              <p className="font-display text-3xl font-extrabold text-primary">
                {lastResult.earnPoints}
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
