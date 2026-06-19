import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { reviewResult } from "../../../redux/features/quiz/resultSlice";
import { getExamTagandClass, getPdfByExam } from "../../../redux/features/quiz/quizSlice";
import { FiArrowLeft } from "react-icons/fi";
import Spinner from "../../components/Spinner";
import PdfOpener from "../../components/PdfOpener";
import QuestionType from "../../components/QuestionType";
import ResultCard from "../../components/ResultCard";
import YoutubeVideoEmbed from "../../components/YoutubeVideoEmbed";

const Review = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { resultId } = useParams();
  const { review, isLoading } = useSelector((state) => state.result);
  const { singleClass, singleTag } = useSelector((state) => state.quiz);

  const [pdfData, setPdfData] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [mobileView, setMobileView] = useState("pdf"); // "pdf" | "answers"

  useEffect(() => {
    dispatch(reviewResult(resultId));
  }, [dispatch, resultId]);

  useEffect(() => {
    if (!review) return;
    const isStructured = review?.examId?.mode === "structured";
    const examQuestions = review?.examId?.questions?.correctAnswers;
    if (isStructured && Array.isArray(examQuestions)) {
      // Structured correct value, by type: choice index/indices for Cm/Cs, the
      // correct right text in left order for matching, the answer string for open.
      setAnswers(
        examQuestions.map((q) => {
          let answer = q.answer;
          if (Array.isArray(q.correct)) answer = q.correct;
          else if (q.type === "Cma" && Array.isArray(q.pairs)) answer = q.pairs.map((p) => p.right);
          return { type: q.type || "", answer };
        })
      );
    } else if (review.correctAnswers) {
      setAnswers(review.correctAnswers.map((a) => ({ answer: a.answer, type: a.type || "" })));
    }
  }, [review]);

  useEffect(() => {
    const fetchData = async () => {
      if (review && review.examId && review.examId._id) {
        await dispatch(getExamTagandClass(review.examId._id));
        // Structured exams have no PDF — skip the fetch (and its 404).
        if (review.examId.mode !== "structured") {
          const getPdfAction = await dispatch(getPdfByExam({ examId: review.examId._id }));
          setPdfData(getPdfAction.payload?.path || null);
        }
      }
    };
    fetchData();
  }, [dispatch, review]);

  // Lock the page to the viewport (panels scroll internally) — same focus
  // experience as the exam runner.
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

  if (isLoading && !review?._id) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg">
        <Spinner size={44} className="text-primary" />
      </div>
    );
  }

  const vis = review?.visibility;
  const canSeeScore = !vis || vis.canSeeScore;
  const hasAnswers = review?.correctAnswers?.length > 0;
  const structured = review?.examId?.mode === "structured";
  const examQuestions = review?.examId?.questions?.correctAnswers;
  // What the analysis renders: structured exams carry their display content
  // (text/choices) on the revealed exam questions; PDF exams just need type +
  // letter options from the stored result.
  const questionDefs =
    structured && Array.isArray(examQuestions)
      ? examQuestions.map((q) => ({
          type: q.type,
          options: q.options,
          text: q.text,
          image: q.image,
          images: q.images,
          latex: q.latex,
          choices: q.choices,
          pairs: q.pairs, // matching: full pairs (revealed) for the review rendering
          explanation: q.explanation, // teacher note, revealed only with answers
        }))
      : (review?.correctAnswers || []).map((q) => ({ type: q.type, options: q.options }));
  const solutionPhotos = [
    ...(review?.examId?.solutionPhotos || []),
    ...(review?.photos || []),
  ];

  const tabClass = (active) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
      active ? "bg-primary text-primary-fg shadow-soft" : "text-muted"
    }`;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-bg">
      <header className="flex shrink-0 flex-col gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line text-muted transition-colors hover:text-text"
              aria-label="Geri"
            >
              <FiArrowLeft />
            </button>
            <div className="min-w-0">
              {review?.examId?.name && (
                <p className="mb-0.5 truncate text-xs font-medium text-muted">
                  {review.examId.name}
                </p>
              )}
              <h1 className="truncate font-display text-lg font-bold text-text sm:text-xl">
                Cavabların təhlili
              </h1>
            </div>
          </div>
          {canSeeScore && review?.earnPoints != null && (
            <span className="inline-flex shrink-0 items-center rounded-full bg-primary/12 px-3.5 py-1.5 text-sm font-bold text-primary">
              {review.earnPoints} bal
            </span>
          )}
        </div>

        {!structured && (
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface2/50 p-1 lg:hidden">
            <button type="button" onClick={() => setMobileView("pdf")} className={tabClass(mobileView === "pdf")}>
              Suallar (PDF)
            </button>
            <button type="button" onClick={() => setMobileView("answers")} className={tabClass(mobileView === "answers")}>
              Cavablar
            </button>
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1 gap-4 p-3 sm:p-4 lg:p-6">
        {/* PDF panel (PDF exams only) */}
        {!structured && (
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
        )}

        {/* Answers / analysis panel */}
        <div
          className={`min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft lg:flex ${
            structured || mobileView === "answers" ? "flex" : "hidden"
          }`}
        >
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <div className={structured ? "mx-auto w-full max-w-2xl" : ""}>
            {review?._id && (
              <div className="mb-6">
                <h2 className="mb-2 text-sm font-semibold text-muted">Ümumi nəticə</h2>
                <ResultCard result={review} />
              </div>
            )}

            {hasAnswers ? (
              <QuestionType
                answers={answers}
                singleTag={singleTag}
                singleClass={singleClass}
                review={review}
                questions={questionDefs}
                handleAnswerChange={() => {}}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">
                Düzgün cavablar hələ açıqlanmayıb. Müəllim açıqladıqdan sonra burada görünəcək.
              </div>
            )}

            {review?.examId?.videoLink && (
              <div className="mt-8">
                <h2 className="mb-3 font-display text-lg font-bold text-text">Video həll</h2>
                <YoutubeVideoEmbed videoLink={review.examId.videoLink} />
              </div>
            )}

            {solutionPhotos.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 font-display text-lg font-bold text-text">Həll (yazı işi)</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {solutionPhotos.map((p, i) => (
                    <img key={i} src={p} alt="" className="w-full rounded-2xl border border-line" />
                  ))}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Review;
