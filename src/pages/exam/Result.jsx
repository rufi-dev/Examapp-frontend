import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Spinner from "../../components/Spinner";
import ResultTable from "../../components/ResultTable";
import { RESET_QUIZ, getExamSilent, getExamRank } from "../../../redux/features/quiz/quizSlice";
import {
  RESET_RESULT,
  getResultsByUserByExam,
} from "../../../redux/features/quiz/resultSlice";
import { getAttemptStatus } from "../../../redux/features/quiz/quizService";
import ResultCard from "../../components/ResultCard";
import AccountLayout from "../../components/AccountLayout";
import Button from "../../components/ui/Button";
import { isSelectionCorrect } from "../../helper/helper";
import { FiRotateCcw, FiList, FiAlertTriangle } from "react-icons/fi";

// The attempt whose result to show — persisted by the Quiz runner on submit so a
// multi-try student sees THIS attempt's result, not the stale "latest". Kept until
// a 7-day TTL (never cleared on success — an old pending sweep could otherwise make
// a newer result look like "latest").
const readExpectedAttempt = (examId) => {
  try {
    const t = localStorage.getItem("token");
    const uid = (t && JSON.parse(atob(t.split(".")[1])).id) || "anon";
    const raw = localStorage.getItem(`examLastSubmittedAttempt_${examId}_${uid}`);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (o && o.at && Date.now() - o.at > 7 * 24 * 60 * 60 * 1000) return null;
    return o && o.attemptId ? String(o.attemptId) : null;
  } catch {
    return null;
  }
};

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
  const navigate = useNavigate();
  const { examId } = useParams();
  const { resultByExam } = useSelector((state) => state.result);
  const [expectedAttemptId, setExpectedAttemptId] = useState(() => readExpectedAttempt(examId));
  const [rank, setRank] = useState(null);
  const [preparing, setPreparing] = useState(true);
  const [terminalReason, setTerminalReason] = useState(null); // unscorable -> no result
  const pollRef = useRef(null);
  const triesRef = useRef(0);

  // Null-safe list; select the EXPECTED attempt's result (string compare — an
  // ObjectId wrapper vs string would silently miss). Fall back to the latest only
  // when there's no expected-attempt context (browsing past results).
  const list = Array.isArray(resultByExam) ? resultByExam : [];
  const lastResult = expectedAttemptId
    ? list.find((r) => String(r.attemptId) === expectedAttemptId)
    : list[list.length - 1];

  // Initial loads. The exam is fetched SILENTLY — a finished student's exam may be
  // archived / un-assigned (403/404) and their result must still render with no toast.
  useEffect(() => {
    dispatch(getResultsByUserByExam(examId));
    dispatch(getExamSilent(examId));
    dispatch(getExamRank(examId))
      .unwrap()
      .then((r) => setRank(r))
      .catch(() => setRank(null));
  }, [dispatch, examId]);

  // Bounded polling (local timer, NOT redux isLoading): if the expected result
  // isn't present yet (server still finalizing), poll ~3s up to ~120s, and check
  // attemptStatus for a terminal `unscorable` (no result will ever arrive).
  useEffect(() => {
    const stop = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    if (lastResult) {
      setPreparing(false);
      stop();
      return;
    }
    setPreparing(true);
    const MAX = 40; // ~40 * 3s ≈ 120s
    const tick = async () => {
      triesRef.current += 1;
      try {
        const st = await getAttemptStatus(
          examId,
          expectedAttemptId ? { attemptId: expectedAttemptId } : {}
        );
        if (st && st.unscorable) {
          setTerminalReason(st.reason || "unscorable");
          setPreparing(false);
          stop();
          return;
        }
      } catch (e) {
        const status = e && e.response && e.response.status;
        const reason = e && e.response && e.response.data && e.response.data.reason;
        if (status === 401) {
          try {
            localStorage.setItem("postLoginRedirect", `/exam/${examId}/result`);
            localStorage.removeItem("token");
          } catch {
            /* ignore */
          }
          stop();
          navigate("/login");
          return;
        }
        if (reason === "invalid_attempt") {
          // The stored expected attempt is stale/foreign — clear it and fall back
          // to the latest result (don't get stuck polling a bad attempt forever).
          try {
            const t = localStorage.getItem("token");
            const uid = (t && JSON.parse(atob(t.split(".")[1])).id) || "anon";
            localStorage.removeItem(`examLastSubmittedAttempt_${examId}_${uid}`);
          } catch {
            /* ignore */
          }
          setExpectedAttemptId(null);
          // fall through: re-fetch results; lastResult now uses the latest.
        }
        // other 404 etc. — keep polling for the result.
      }
      dispatch(getResultsByUserByExam(examId))
        .unwrap()
        .catch(() => {});
      if (triesRef.current >= MAX) {
        setPreparing(false);
        stop();
      }
    };
    pollRef.current = setInterval(tick, 3000);
    tick();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResult, examId, expectedAttemptId]);

  // Terminal unscorable (deleted exam/user, retired duplicate) — no Result exists.
  if (!lastResult && terminalReason) {
    return (
      <AccountLayout title="İmtahan nəticəsi" subtitle="">
        <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-8 text-center shadow-soft">
          <FiAlertTriangle className="mx-auto mb-3 text-3xl text-danger" />
          <p className="font-display text-lg font-bold text-text">Nəticə mövcud deyil</p>
          <p className="mt-1 text-sm text-muted">
            Bu cəhd qiymətləndirilə bilmədi (imtahan və ya hesab silinib). Müəlliminizlə əlaqə saxlayın.
          </p>
          <Button className="mt-5" onClick={() => navigate("/dashboard")}>
            Ana səhifə
          </Button>
        </div>
      </AccountLayout>
    );
  }

  // Still finalizing — "preparing" state (never an endless spinner).
  if (!lastResult && preparing) {
    return (
      <AccountLayout title="İmtahan nəticəsi" subtitle="">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-3xl border border-line bg-surface p-10 text-center shadow-soft">
          <Spinner size={32} className="text-primary" />
          <p className="font-display text-base font-semibold text-text">Nəticə hazırlanır…</p>
          <p className="text-sm text-muted">Cavablarınız qeydə alındı. Bir neçə saniyə çəkə bilər.</p>
        </div>
      </AccountLayout>
    );
  }

  // Gave up after polling — gentle manual-refresh fallback (still no endless loader).
  if (!lastResult) {
    return (
      <AccountLayout title="İmtahan nəticəsi" subtitle="">
        <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-8 text-center shadow-soft">
          <p className="font-display text-lg font-bold text-text">Nəticə hazırlanır</p>
          <p className="mt-1 text-sm text-muted">Bir azdan səhifəni yeniləyin.</p>
          <Button className="mt-5" onClick={() => window.location.reload()}>
            Yenilə
          </Button>
        </div>
      </AccountLayout>
    );
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
