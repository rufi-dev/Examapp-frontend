import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { startAttempt, getPdfByExam } from "../../../redux/features/quiz/quizSlice";
import { addResult } from "../../../redux/features/quiz/resultSlice";
import { useNavigate, useParams } from "react-router-dom";
import { FiClock, FiCheckCircle } from "react-icons/fi";
import { toast } from "react-toastify";
import PdfOpener from "../../components/PdfOpener";
import QuestionType from "../../components/QuestionType";
import Spinner from "../../components/Spinner";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

// Maps server denial reasons to a message + where to send the user.
const DENY = {
  unverified: { msg: "Hesabınız təsdiqlənməyib", to: (id) => `/exam/details/${id}` },
  not_started: { msg: "İmtahan hələ başlamayıb", to: (id) => `/exam/details/${id}` },
  finished: { msg: "İmtahan artıq bitib", to: (id) => `/exam/details/${id}` },
  no_questions: { msg: "Bu imtahana suallar əlavə edilməyib", to: (id) => `/exam/details/${id}` },
  max_tries: { msg: "Maksimum cəhd sayına çatmısınız", to: (id) => `/exam/${id}/result` },
};

const Quiz = () => {
  const { examId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const answersKey = `examAnswers_${examId}`;

  // Draft answers persist locally so a refresh/return doesn't lose them.
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem(`examAnswers_${examId}`);
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return Array.from({ length: 25 }, () => ({ answer: "", type: "" }));
  });

  const [attempt, setAttempt] = useState(null); // { expiresAt, name, duration, questions }
  const [pdfData, setPdfData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileView, setMobileView] = useState("pdf"); // mobile: "pdf" | "answers"
  const [access, setAccess] = useState("checking"); // "checking" | "allowed" | "denied"
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null); // seconds remaining
  const warned5 = useRef(false);
  const warned1 = useRef(false);

  // Refs so the (interval-based) auto-submit always reads the latest values.
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const submittingRef = useRef(false);

  const deadline = attempt?.expiresAt ? new Date(attempt.expiresAt).getTime() : null;
  const questions = attempt?.questions || [];
  const totalCount = questions.length || answers.length;

  // Start (or resume) the attempt on the server, then load the PDF. The server
  // gates access, owns the deadline, and returns questions without answers.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await dispatch(startAttempt(examId)).unwrap();
        if (cancelled) return;
        setAttempt(data);
        setAccess("allowed");
        dispatch(getPdfByExam({ examId }))
          .unwrap()
          .then((pdf) => {
            if (!cancelled) setPdfData(pdf?.path || null);
          })
          .catch(() => {});
      } catch (err) {
        if (cancelled) return;
        const rule = DENY[err?.reason];
        toast.error(rule ? rule.msg : err?.message || "İmtahana giriş alınmadı");
        setAccess("denied");
        navigate(rule ? rule.to(examId) : `/exam/details/${examId}`, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, examId]);

  // Lock the page to the viewport while the exam runs (no page scroll).
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

  // Resize answers array to match the question count once loaded.
  useEffect(() => {
    const len = questions.length;
    if (len) {
      setAnswers((prev) => {
        if (prev.length >= len) return prev;
        const next = [...prev];
        while (next.length < len) next.push({ answer: "", type: "" });
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // Persist draft answers on change.
  useEffect(() => {
    try {
      localStorage.setItem(answersKey, JSON.stringify(answers));
    } catch {
      /* ignore */
    }
  }, [answers, answersKey]);

  // Wall-clock countdown from the SERVER deadline: leaving / sleeping / closing
  // the tab can't pause it, and it can't be extended from localStorage.
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
    if (access !== "allowed") return;
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
  }, [access]);

  const submitAnswerSheet = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const latest = answersRef.current;
      const len = questions.length || latest.length;
      const selectedAnswers = latest
        .slice(0, len)
        .map((a) => ({ type: a?.type, answer: a?.answer }));
      // The server scores it (the browser never had the answer key).
      await dispatch(addResult({ examId, resultData: { selectedAnswers } })).unwrap();
      localStorage.removeItem(answersKey);
      navigate(`/exam/${examId}/result`);
    } catch (error) {
      // error toast is shown by the addResult slice
    } finally {
      submittingRef.current = false;
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
  };

  const remaining = () => {
    if (timeLeft === null) return "--:--";
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const aboutToEnd = timeLeft !== null && timeLeft <= 30;
  const answeredCount = answers.slice(0, totalCount).filter((a) => a && a.answer).length;
  const unansweredNums = answers
    .slice(0, totalCount)
    .map((a, i) => (a && a.answer ? null : i + 1))
    .filter((n) => n != null);

  // Don't render exam content until access is confirmed.
  if (access !== "allowed") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg">
        <Spinner size={44} className="text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-bg">
      <header className="flex shrink-0 flex-col gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            {attempt?.name && (
              <p className="mb-0.5 truncate text-xs font-medium text-muted">{attempt.name}</p>
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
                questions={questions}
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
