import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import PdfOpener from "../../components/PdfOpener";
import {
  addQuestion,
  getExam,
  getExamTagandClass,
  getPdfByExam,
} from "../../../redux/features/quiz/quizSlice";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import Spinner from "../../components/Spinner";
import Button from "../../components/ui/Button";
import { inputClass } from "../../components/ui/Field";
import { FiPlus, FiX } from "react-icons/fi";
import { questionPoints } from "../../helper/helper";

// Questions 1-13 default to closed (Cm); 14+ default to open (Co).
const CLOSED_COUNT = 13;
const newQuestion = (type = "Cm") => ({
  type,
  answer: "",
  options: ["a", "b", "c", "d", "e"],
});

const nextLetter = (options) => {
  const used = new Set(options);
  for (let i = 0; i < 26; i++) {
    const ch = String.fromCharCode(97 + i);
    if (!used.has(ch)) return ch;
  }
  return String(options.length + 1);
};

const QuestionAdd = () => {
  useRedirectLoggedOutUser("/login");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [pdfData, setPdfData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState(() =>
    Array.from({ length: 25 }, (_, i) => newQuestion(i < CLOSED_COUNT ? "Cm" : "Co"))
  );
  const [mobileView, setMobileView] = useState("pdf"); // "pdf" | "builder"
  const { examId } = useParams();

  useEffect(() => {
    const fetchData = async () => {
      try {
        await dispatch(getExamTagandClass(examId));
        const getPdfAction = await dispatch(getPdfByExam({ examId }));
        setPdfData(getPdfAction.payload.path);

        // Pre-load the existing answer key if this exam already has questions,
        // so editing is non-destructive (instead of starting from blanks).
        const examAction = await dispatch(getExam(examId));
        const existing = examAction?.payload?.questions?.correctAnswers;
        if (existing && existing.length) {
          setQuestions(
            existing.map((q) => ({
              type: q.type || "Cm",
              answer: q.answer || "",
              options:
                q.options && q.options.length ? q.options : ["a", "b", "c", "d", "e"],
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching exam data:", error);
      }
    };
    fetchData();
  }, [dispatch, examId]);

  // Full-screen focus layout: lock page scroll like the exam runner.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const ph = html.style.overflow;
    const pb = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = ph;
      body.style.overflow = pb;
    };
  }, []);

  const update = (i, patch) =>
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  const setType = (i, type) => update(i, { type, answer: "" });
  const setAnswer = (i, answer) => update(i, { answer });
  const addOption = (i) =>
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === i ? { ...q, options: [...q.options, nextLetter(q.options)] } : q
      )
    );
  const removeOption = (i, opt) =>
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === i
          ? {
              ...q,
              options: q.options.filter((o) => o !== opt),
              answer: q.answer === opt ? "" : q.answer,
            }
          : q
      )
    );
  const removeQuestion = (i) => setQuestions((prev) => prev.filter((_, idx) => idx !== i));
  const addQuestionRow = () => setQuestions((prev) => [...prev, newQuestion("Co")]);

  const submit = async (e) => {
    e.preventDefault();
    if (questions.length === 0) return toast.error("Ən azı bir sual əlavə edin");
    if (questions.some((q) => !q.answer)) {
      return toast.error("Bütün suallara düzgün cavab seçin və ya yazın");
    }
    setLoading(true);
    try {
      const correctAnswers = questions.map((q) => ({
        type: q.type,
        answer: q.answer,
        ...(q.type === "Cm" ? { options: q.options } : {}),
      }));
      // Success/error toasts are handled by the addQuestion slice; unwrap() so
      // we only navigate away when the save actually succeeds.
      await dispatch(addQuestion({ examId, questionData: { correctAnswers } })).unwrap();
      navigate(-1);
    } catch {
      // error toast is shown by the slice's rejected case
    } finally {
      setLoading(false);
    }
  };

  const points = questionPoints(questions.length);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-bg">
      <header className="flex shrink-0 flex-col gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Geri"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-text transition-colors hover:bg-surface2"
            >
              <FiX className="text-[18px]" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-bold text-text sm:text-xl">
                Sualları əlavə et
              </h1>
              <p className="hidden text-xs text-muted sm:block">
                Hər sual üçün tip və düzgün cavabı təyin et.
              </p>
            </div>
          </div>
          <div className="hidden shrink-0 items-center gap-2 text-xs lg:flex">
            <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 font-semibold text-text">
              İlk 18 → 55
            </span>
            <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 font-semibold text-text">
              Qalanı → 45
            </span>
            <span className="rounded-full bg-primary/12 px-2.5 py-0.5 font-semibold text-primary">
              Cəmi 100 bal
            </span>
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
            onClick={() => setMobileView("builder")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              mobileView === "builder" ? "bg-primary text-primary-fg shadow-soft" : "text-muted"
            }`}
          >
            Cavablar
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 gap-4 p-3 sm:p-4 lg:p-6">
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg/70 backdrop-blur-sm">
            <Spinner size={46} className="text-primary" />
          </div>
        )}

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
            mobileView === "builder" ? "flex" : "hidden"
          }`}
        >
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
                {questions.map((q, i) => (
                  <div key={i} className="rounded-2xl border border-line bg-surface2/40 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-text">
                          Sual {i + 1}
                        </span>
                        <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-semibold text-muted">
                          {Number((points[i] || 0).toFixed(3))} bal
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex rounded-lg border border-line bg-surface p-0.5 text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => setType(i, "Cm")}
                            className={`rounded-md px-3 py-1 transition-colors ${
                              q.type === "Cm" ? "bg-primary text-primary-fg" : "text-muted"
                            }`}
                          >
                            Qapalı
                          </button>
                          <button
                            type="button"
                            onClick={() => setType(i, "Co")}
                            className={`rounded-md px-3 py-1 transition-colors ${
                              q.type === "Co" ? "bg-primary text-primary-fg" : "text-muted"
                            }`}
                          >
                            Açıq
                          </button>
                        </div>
                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(i)}
                            className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/12 hover:text-danger"
                            aria-label="Sualı sil"
                          >
                            <FiX />
                          </button>
                        )}
                      </div>
                    </div>

                    {q.type === "Cm" ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {q.options.map((opt) => (
                          <div key={opt} className="group relative">
                            <button
                              type="button"
                              onClick={() => setAnswer(i, opt)}
                              className={`grid h-11 w-11 place-items-center rounded-full border font-semibold transition-colors ${
                                q.answer === opt
                                  ? "border-success bg-success text-white"
                                  : "border-line bg-surface text-muted hover:border-primary/40"
                              }`}
                            >
                              {opt}
                            </button>
                            {q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeOption(i, opt)}
                                className="absolute -right-1 -top-1 hidden h-4 w-4 place-items-center rounded-full bg-danger text-[10px] leading-none text-white group-hover:grid"
                                aria-label="Variantı sil"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addOption(i)}
                          className="grid h-11 w-11 place-items-center rounded-full border border-dashed border-line text-muted transition-colors hover:border-primary hover:text-primary"
                          aria-label="Variant əlavə et"
                        >
                          <FiPlus />
                        </button>
                      </div>
                    ) : (
                      <input
                        value={q.answer}
                        onChange={(e) => setAnswer(i, e.target.value)}
                        placeholder="Düzgün cavabı yaz..."
                        className={inputClass}
                      />
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addQuestionRow}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-3 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
                >
                  <FiPlus /> Sual əlavə et
                </button>
              </div>

            <div className="shrink-0 border-t border-line p-3 sm:p-4">
              <Button type="submit" disabled={loading} size="lg" className="w-full">
                {loading ? <Spinner /> : `Sualları yadda saxla (${questions.length})`}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuestionAdd;
