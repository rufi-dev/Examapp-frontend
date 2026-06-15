import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  startExam,
  startExamAction,
  userSelectedAnswer,
} from "../../../redux/features/quiz/quizSlice";
import { addResult } from "../../../redux/features/quiz/resultSlice";
import { attempts_Number, earnPoints_Number } from "../../helper/helper";
import { useNavigate, useParams } from "react-router-dom";
import { FiClock, FiCheckCircle } from "react-icons/fi";
import { toast } from "react-toastify";
import PdfOpener from "../../components/PdfOpener";
import QuestionType from "../../components/QuestionType";
import Spinner from "../../components/Spinner";
import Button from "../../components/ui/Button";

const Quiz = () => {
  const { examId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { singleExam, singleClass, singleTag, isExamStarted } = useSelector(
    (state) => state.quiz
  );

  const answersKey = `examAnswers_${examId}`;
  const countdownKey = `quizCountdown_${examId}`;

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

  const [counter, setCounter] = useState(() => {
    const saved = parseInt(localStorage.getItem(`quizCountdown_${examId}`), 10);
    return Number.isFinite(saved) ? saved : null;
  });

  // Start the exam (loads pdf + questions into state).
  useEffect(() => {
    dispatch(startExamAction({ examId, setPdfData })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, examId]);

  // Initialise / resize answers + counter once the exam data is loaded.
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
    if (counter === null && singleExam?.duration) {
      setCounter(singleExam.duration);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleExam]);

  // Persist answers on every change.
  useEffect(() => {
    try {
      localStorage.setItem(answersKey, JSON.stringify(answers));
    } catch {
      /* ignore */
    }
  }, [answers, answersKey]);

  // Countdown timer.
  useEffect(() => {
    if (counter === null) return;
    localStorage.setItem(countdownKey, String(counter));
    if (counter <= 0) {
      submitAnswerSheet();
      return;
    }
    const id = setTimeout(() => setCounter((c) => c - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counter]);

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
      localStorage.removeItem(countdownKey);
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
    if (counter === null) return "--:--";
    const m = Math.floor(counter / 60);
    const s = counter % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const aboutToEnd = counter !== null && counter <= 30;
  const answeredCount = answers.filter((a) => a && a.answer).length;
  const totalCount = singleExam?.questions?.correctAnswers?.length || answers.length;
  const questionDefs = singleExam?.questions?.correctAnswers?.map((q) => ({
    type: q.type,
    options: q.options,
  }));

  return (
    <div className="flex h-screen flex-col bg-bg">
      {/* Top bar — timer + progress always visible; tab switch on mobile */}
      <header className="flex flex-col gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div
            className={`flex items-center gap-2 font-display text-xl font-bold sm:text-2xl ${
              aboutToEnd ? "text-danger" : "text-text"
            }`}
          >
            <FiClock className={aboutToEnd ? "text-danger" : "text-primary"} />
            {remaining()}
          </div>
          <div className="text-sm font-medium text-muted">
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

          <div className="border-t border-line p-3 sm:p-4">
            <Button
              onClick={submitAnswerSheet}
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
    </div>
  );
};

export default Quiz;
