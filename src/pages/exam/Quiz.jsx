import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  getExam,
  startExam,
  startExamAction,
  userSelectedAnswer,
} from "../../../redux/features/quiz/quizSlice";
import { addResult, getResultsByUserByExam } from "../../../redux/features/quiz/resultSlice";
import { getUser } from "../../../redux/features/auth/authSlice";
import { attempts_Number, earnPoints_Number } from "../../helper/helper";
import { useNavigate, useParams } from "react-router-dom";
import { FiClock, FiCheckCircle } from "react-icons/fi";
import { toast } from "react-toastify";
import PdfOpener from "../../components/PdfOpener";
import QuestionType from "../../components/QuestionType";
import Spinner from "../../components/Spinner";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

const Quiz = () => {
  const { examId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { singleExam, singleClass, singleTag, isExamStarted } = useSelector(
    (state) => state.quiz
  );
  const { user } = useSelector((state) => state.auth);

  const answersKey = `examAnswers_${examId}`;
  const deadlineKey = `quizDeadline_${examId}`;

  // Persisted answers: survive accidental leave/return.
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem(`examAnswers_${examId}`);
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return Array.from({ length: 25 }, () => ({ answer: "", type: "" }));
  });

  const [pdfData, setPdfData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileView, setMobileView] = useState("pdf"); // mobile: "pdf" | "answers"
  const [access, setAccess] = useState("checking"); // "checking" | "allowed" | "denied"
  const [confirmFinish, setConfirmFinish] = useState(false);

  // Absolute end time (ms epoch). The timer is wall-clock based: it keeps
  // elapsing even if the tab is closed, the device sleeps, or the battery dies.
  const [deadline, setDeadline] = useState(() => {
    const saved = parseInt(localStorage.getItem(`quizDeadline_${examId}`), 10);
    return Number.isFinite(saved) ? saved : null;
  });
  const [timeLeft, setTimeLeft] = useState(null); // seconds remaining
  const warned5 = useRef(false);
  const warned1 = useRef(false);

  // Access guard: confirm with the server (fresh) that the exam is open and the
  // user is allowed BEFORE loading or showing anything. Blocks direct-URL access
  // when the exam hasn't started, has finished, the user is out of tries, or the
  // account isn't verified.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const exam = await dispatch(getExam(examId)).unwrap();
        const results = await dispatch(getResultsByUserByExam(examId)).unwrap();
        let u = user;
        if (!u) {
          try {
            u = await dispatch(getUser()).unwrap();
          } catch {
            u = null;
          }
        }
        if (cancelled) return;

        const now = new Date();
        const start = exam?.startDate ? new Date(exam.startDate) : null;
        const end = exam?.endDate ? new Date(exam.endDate) : null;
        const maxTry = exam?.maxTry || 0;
        const attempts = Array.isArray(results) ? results.length : 0;

        const deny = (msg, to) => {
          toast.error(msg);
          setAccess("denied");
          navigate(to, { replace: true });
        };

        if (!u?.isVerified) return deny("Hesabınız təsdiqlənməyib", `/exam/details/${examId}`);
        if (start && now < start) return deny("İmtahan hələ başlamayıb", `/exam/details/${examId}`);
        if (end && now > end) return deny("İmtahan artıq bitib", `/exam/details/${examId}`);
        if (maxTry > 0 && attempts >= maxTry)
          return deny("Maksimum cəhd sayına çatmısınız", `/exam/${examId}/result`);

        setAccess("allowed");
      } catch {
        if (cancelled) return;
        toast.error("İmtahana giriş alınmadı");
        setAccess("denied");
        navigate(`/exam/details/${examId}`, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, examId]);

  // Load the exam content (pdf + questions) only after access is granted.
  useEffect(() => {
    if (access !== "allowed") return;
    dispatch(startExamAction({ examId, setPdfData })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, examId]);

  // Lock the page to the viewport while the exam runs: no page scroll or
  // scrollbar — only the PDF and the answers list scroll, inside their panels.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  // Resize the answers array to match the question count once loaded.
  useEffect(() => {
    const len = singleExam?.questions?.correctAnswers?.length;
    if (len) {
      setAnswers((prev) => {
        if (prev.length >= len) return prev;
        const next = [...prev];
        while (next.length < len) next.push({ answer: "", type: "" });
        return next;
      });
    }
  }, [singleExam]);

  // Persist answers on every change.
  useEffect(() => {
    try {
      localStorage.setItem(answersKey, JSON.stringify(answers));
    } catch {
      /* ignore */
    }
  }, [answers, answersKey]);

  // Establish the absolute deadline once the exam is open (or keep the stored
  // one on resume). Stored as an epoch timestamp -> wall-clock based countdown.
  useEffect(() => {
    if (access !== "allowed" || deadline != null) return;
    const dur = singleExam?.duration;
    if (dur) {
      const dl = Date.now() + dur * 1000;
      localStorage.setItem(deadlineKey, String(dl));
      setDeadline(dl);
    }
  }, [access, deadline, singleExam, deadlineKey]);

  // Wall-clock countdown: recompute remaining from the absolute deadline every
  // second, so leaving / sleeping / closing the tab does NOT pause the timer.
  // On return after the deadline, remaining is 0 and it auto-submits at once.
  useEffect(() => {
    if (access !== "allowed" || deadline == null) return;
    let id;
    const tick = () => {
      const rem = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setTimeLeft(rem);
      if (rem <= 300 && rem > 60 && !warned5.current) {
        warned5.current = true;
        toast.warn("5 dəqiqə qaldı!");
      }
      if (rem <= 60 && rem > 0 && !warned1.current) {
        warned1.current = true;
        toast.warn("1 dəqiqə qaldı!");
      }
      if (rem <= 0) {
        clearInterval(id);
        toast.info("Vaxt bitdi! Cavablar avtomatik təqdim olunur...");
        submitAnswerSheet();
      }
    };
    tick();
    id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, deadline]);

  // Block back navigation + warn on reload/close while the exam is active.
  useEffect(() => {
    if (!isExamStarted) return;

    window.history.pushState(null, "", window.location.href);
    const onPopState = () => {
      window.history.pushState(null, "", window.location.href);
      toast.info("İmtahan zamanı geri qayıtmaq mümkün deyil");
    };
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [isExamStarted]);

  const calculateResultData = () => {
    const correctAnswers = singleExam?.questions?.correctAnswers || [];
    // Only score against as many answers as there are questions.
    const len = correctAnswers.length || answers.length;
    const sliced = answers.slice(0, len);

    const attempts = attempts_Number(sliced);
    const earnPoints = earnPoints_Number(
      sliced,
      correctAnswers,
      correctAnswers,
      singleClass,
      singleTag
    );

    return {
      attempts,
      earnPoints: earnPoints.earnedPoints > 0 ? earnPoints.earnedPoints : 0,
      selectedAnswers: sliced.map((a) => ({ type: a?.type, answer: a?.answer })),
      correctAnswers: correctAnswers.map((a) => ({ type: a.type, answer: a.answer })),
      correctAnswersByType: earnPoints.correctAnswersByType.map((item) => ({
        type: item.type,
        count: item.count,
      })),
    };
  };

  const submitAnswerSheet = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const resultData = calculateResultData();
      await dispatch(addResult({ examId, resultData }));
      await dispatch(startExam(false));
      localStorage.removeItem(deadlineKey);
      localStorage.removeItem(answersKey);
      navigate(`/exam/${examId}/result`);
    } catch (error) {
      console.error("Error submitting answer sheet:", error);
      toast.error("Cavabları təqdim etmək alınmadı");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswerChange = (e, index, type) => {
    const value = e.target.value;
    setAnswers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], answer: value, type };
      return updated;
    });
    dispatch(userSelectedAnswer({ index, answer: value, type }));
  };

  const remaining = () => {
    if (timeLeft === null) return "--:--";
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const aboutToEnd = timeLeft !== null && timeLeft <= 30;
  const answeredCount = answers.filter((a) => a && a.answer).length;
  const totalCount = singleExam?.questions?.correctAnswers?.length || answers.length;
  const questionDefs = singleExam?.questions?.correctAnswers?.map((q) => ({
    type: q.type,
    options: q.options,
  }));
  const unansweredNums = answers
    .slice(0, totalCount)
    .map((a, i) => (a && a.answer ? null : i + 1))
    .filter((n) => n != null);

  // Don't render exam content until access is confirmed (avoids flashing the
  // PDF/answers during the check or to a denied user who is being redirected).
  if (access !== "allowed") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg">
        <Spinner size={44} className="text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-bg">
      {/* Top bar — timer + progress always visible; tab switch on mobile */}
      <header className="flex shrink-0 flex-col gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            {singleExam?.name && (
              <p className="mb-0.5 truncate text-xs font-medium text-muted">{singleExam.name}</p>
            )}
            <div
              className={`flex items-center gap-2 font-display text-xl font-bold sm:text-2xl ${
                aboutToEnd ? "text-danger" : "text-text"
              }`}
            >
              <FiClock className={aboutToEnd ? "text-danger" : "text-primary"} />
              {remaining()}
            </div>
          </div>
          <div className="shrink-0 text-sm font-medium text-muted">
            Cavablandı: <span className="text-text">{answeredCount}</span> / {totalCount}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface2/50 p-1 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileView("pdf")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              mobileView === "pdf" ? "bg-primary text-primary-fg shadow-soft" : "text-muted"
            }`}
          >
            Suallar (PDF)
          </button>
          <button
            type="button"
            onClick={() => setMobileView("answers")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              mobileView === "answers" ? "bg-primary text-primary-fg shadow-soft" : "text-muted"
            }`}
          >
            Cavablar
          </button>
        </div>
      </header>

      {/* Body — side-by-side on desktop; one full-screen panel per tab on mobile */}
      <div className="flex min-h-0 flex-1 gap-4 p-3 sm:p-4 lg:p-6">
        <div
          className={`min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft lg:flex ${
            mobileView === "pdf" ? "flex" : "hidden"
          }`}
        >
          <div className="hidden border-b border-line px-5 py-3 text-sm font-semibold text-muted lg:block">
            İmtahan sualları (PDF)
          </div>
          <div className="min-h-0 flex-1">
            <PdfOpener pdfFile={pdfData} />
          </div>
        </div>

        <div
          className={`min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft lg:flex ${
            mobileView === "answers" ? "flex" : "hidden"
          }`}
        >
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            {pdfData ? (
              <QuestionType
                answers={answers}
                singleTag={singleTag}
                singleClass={singleClass}
                questions={questionDefs}
                handleAnswerChange={handleAnswerChange}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Spinner size={36} className="text-primary" />
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-line p-3 sm:p-4">
            <Button
              onClick={() => setConfirmFinish(true)}
              disabled={isSubmitting}
              size="lg"
              className="w-full"
            >
              {isSubmitting ? (
                <Spinner />
              ) : (
                <>
                  İmtahanı bitir <FiCheckCircle />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        onConfirm={submitAnswerSheet}
        title="İmtahanı bitirmək istəyirsiniz?"
        confirmLabel="Bəli, təqdim et"
        cancelLabel="Geri qayıt"
        tone={unansweredNums.length ? "danger" : "primary"}
        loading={isSubmitting}
        icon={<FiCheckCircle className="text-[22px]" />}
      >
        <p>
          Cavablandırılıb: <span className="font-semibold text-text">{answeredCount}</span> /{" "}
          {totalCount}
        </p>
        {unansweredNums.length > 0 ? (
          <div className="mt-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5">
            <p className="font-semibold text-danger">
              {unansweredNums.length} sual cavabsız qalıb
            </p>
            <p className="mt-1 text-xs text-muted">Cavabsız suallar: {unansweredNums.join(", ")}</p>
            <p className="mt-1.5 text-xs text-text">Yenə də təqdim edilsin?</p>
          </div>
        ) : (
          <p className="mt-3 font-medium text-success">Bütün suallar cavablandırılıb. 🎉</p>
        )}
        <p className="mt-3 text-xs text-muted">
          Təqdim etdikdən sonra cavabları dəyişə bilməyəcəksiniz.
        </p>
      </ConfirmDialog>
    </div>
  );
};

export default Quiz;
