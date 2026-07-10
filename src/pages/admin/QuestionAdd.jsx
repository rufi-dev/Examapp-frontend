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
import { FiPlus, FiX, FiChevronUp, FiChevronDown } from "react-icons/fi";
import { RxDragHandleDots2 } from "react-icons/rx";
import { questionPoints } from "../../helper/helper";
import { PRESETS, presetTypes, presetPointsPlan, presetTotalMarks } from "../../helper/examPresets";
import ScoringEditor from "../../components/ScoringEditor";

// Questions 1-13 default to closed (Cm); 14+ default to open (Co).
const CLOSED_COUNT = 13;
const GRID_LETTERS = "abcdefghijklmnopqrstuvwxyz";
const newQuestion = (type = "Cm") => ({
  type,
  answer: "",
  answers: [""], // open (Co/Cd): all accepted answers (any match = correct)
  options: ["a", "b", "c", "d", "e"],
  // Correspondence (Cmu) defaults: 3 numbers, 5 letters, empty key per number.
  ...(type === "Cmu"
    ? { leftCount: 3, rightCount: 5, key: [[], [], []] }
    : {}),
});
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || lo)));

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
  const [ready, setReady] = useState(false); // exam/answer key loaded -> show builder
  const [questions, setQuestions] = useState(() =>
    Array.from({ length: 25 }, (_, i) => newQuestion(i < CLOSED_COUNT ? "Cm" : "Co"))
  );
  const [mobileView, setMobileView] = useState("pdf"); // "pdf" | "builder"
  const [preset, setPreset] = useState(""); // exam scoring preset (for bal preview)
  const [typePoints, setTypePoints] = useState(null); // manual per-type bal override
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
        const presetId = examAction?.payload?.preset;
        setPreset(presetId || "");
        setTypePoints(examAction?.payload?.typePoints || null);
        if (existing && existing.length) {
          setQuestions(
            existing.map((q) => ({
              type: q.type || "Cm",
              answer: q.answer || "",
              options:
                q.options && q.options.length ? q.options : ["a", "b", "c", "d", "e"],
              // Preserve the correspondence grid + answer key (owner payload).
              ...(q.type === "Cmu"
                ? {
                    leftCount: Number(q.leftCount) || 3,
                    rightCount: Number(q.rightCount) || 5,
                    key: Array.isArray(q.key) ? q.key : [],
                  }
                : {}),
            }))
          );
        } else if (presetId && PRESETS[presetId]) {
          // Seed the answer key from the preset. PDF mode supports closed (Cm),
          // open (Co), solution-required open (Cd) and correspondence (Cmu).
          // Matching slots (Cma/Cmu) both seed as the Uyğunluq grid (Cmu).
          const types = presetTypes(PRESETS[presetId]);
          setQuestions(
            types.map((t) =>
              newQuestion(
                t === "Cm" ? "Cm" : t === "Cma" || t === "Cmu" ? "Cmu" : t === "Cd" ? "Cd" : "Co"
              )
            )
          );
        }
      } catch (error) {
        console.error("Error fetching exam data:", error);
      } finally {
        setReady(true);
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

  const setType = (i, type) =>
    update(
      i,
      type === "Cmu"
        ? { type, answer: "", leftCount: 3, rightCount: 5, key: [[], [], []] }
        : { type, answer: "" }
    );
  const setAnswer = (i, answer) => update(i, { answer });

  // --- Correspondence (Cmu) grid editing ---
  // Resize the number of rows (numbers), keeping existing per-number selections.
  // While typing, accept the raw value (so clearing "5" and typing "3" doesn't
  // jump to 2/15); only cap the max. The min of 2 is enforced on blur (commit*).
  const setCmuLeft = (i, val) =>
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== i) return q;
        const cleaned = String(val).replace(/\D/g, "");
        if (cleaned === "") return { ...q, leftCount: "" }; // empty while typing — no auto-2
        const n = Math.min(15, parseInt(cleaned, 10) || 0);
        const key = Array.from({ length: n }, (_, k) =>
          Array.isArray(q.key?.[k]) ? q.key[k] : []
        );
        return { ...q, leftCount: n, key };
      })
    );
  const commitCmuLeft = (i) =>
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== i) return q;
        const n = clampInt(q.leftCount, 2, 15);
        const key = Array.from({ length: n }, (_, k) =>
          Array.isArray(q.key?.[k]) ? q.key[k] : []
        );
        return { ...q, leftCount: n, key };
      })
    );
  // Resize the number of letters, dropping any now-out-of-range selections.
  const setCmuRight = (i, val) =>
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== i) return q;
        const cleaned = String(val).replace(/\D/g, "");
        if (cleaned === "") return { ...q, rightCount: "" };
        const m = Math.min(12, parseInt(cleaned, 10) || 0);
        const key = (q.key || []).map((arr) =>
          Array.isArray(arr) ? arr.filter((ri) => ri < m) : []
        );
        return { ...q, rightCount: m, key };
      })
    );
  const commitCmuRight = (i) =>
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== i) return q;
        const m = clampInt(q.rightCount, 2, 12);
        const key = (q.key || []).map((arr) =>
          Array.isArray(arr) ? arr.filter((ri) => ri < m) : []
        );
        return { ...q, rightCount: m, key };
      })
    );
  // Toggle one letter for one number (multi-select per number).
  const toggleCmuKey = (i, li, ri) =>
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== i) return q;
        const n = Number(q.leftCount) || 0;
        const key = Array.from({ length: n }, (_, k) =>
          Array.isArray(q.key?.[k]) ? [...q.key[k]] : []
        );
        const row = new Set(key[li] || []);
        if (row.has(ri)) row.delete(ri);
        else row.add(ri);
        key[li] = Array.from(row).sort((a, b) => a - b);
        return { ...q, key };
      })
    );
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
  // Reorder (drag-and-drop + up/down buttons).
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const moveQuestion = (i, dir) =>
    setQuestions((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const reorderQuestion = (from, to) =>
    setQuestions((prev) => {
      if (
        from == null || to == null || from === to ||
        from < 0 || to < 0 || from >= prev.length || to >= prev.length
      )
        return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  const endDrag = () => {
    setDragIdx(null);
    setOverIdx(null);
  };
  const removeQuestion = (i) => setQuestions((prev) => prev.filter((_, idx) => idx !== i));
  const addQuestionRow = () => setQuestions((prev) => [...prev, newQuestion("Co")]);

  const submit = async (e) => {
    e.preventDefault();
    if (questions.length === 0) return toast.error("Ən azı bir sual əlavə edin");
    // A Cmu question is "answered" when every number has at least one correct
    // letter marked; other types just need a non-empty answer.
    const isAnswered = (q) =>
      q.type === "Cmu"
        ? Array.isArray(q.key) &&
          q.key.length === (Number(q.leftCount) || 0) &&
          q.key.length > 0 &&
          q.key.every((arr) => Array.isArray(arr) && arr.length > 0)
        : !!q.answer;
    if (questions.some((q) => !isAnswered(q))) {
      return toast.error("Bütün suallara düzgün cavab seçin və ya yazın");
    }
    setLoading(true);
    try {
      const correctAnswers = questions.map((q) =>
        q.type === "Cmu"
          ? {
              type: "Cmu",
              leftCount: Number(q.leftCount),
              rightCount: Number(q.rightCount),
              key: q.key,
            }
          : {
              type: q.type,
              answer: q.answer,
              // Open (Co/Cd): store every accepted answer; a typed answer matching
              // ANY (case/space-insensitive) is correct.
              ...((q.type === "Co" || q.type === "Cd") && Array.isArray(q.answers)
                ? (() => {
                    const acc = [
                      ...new Set(q.answers.map((s) => String(s || "").trim()).filter(Boolean)),
                    ];
                    return acc.length > 1 ? { answer: acc[0], answers: acc } : {};
                  })()
                : {}),
              ...(q.type === "Cm" ? { options: q.options } : {}),
            }
      );
      // Success/error toasts are handled by the addQuestion slice; unwrap() so
      // we only navigate away when the save actually succeeds.
      await dispatch(
        addQuestion({ examId, questionData: { correctAnswers, typePoints } })
      ).unwrap();
      // Take the teacher to the exam instructions overview after saving.
      navigate(`/exam/details/${examId}`);
    } catch {
      // error toast is shown by the slice's rejected case
    } finally {
      setLoading(false);
    }
  };

  // Preview the per-question bal from the exam's preset (e.g. Blok = 150) so the
  // builder matches the server score; legacy/Buraxılış fall back to questionPoints.
  const customPlan = presetPointsPlan(preset, questions.length, questions.map((q) => q.type));
  const points = customPlan || questionPoints(questions.length);
  // Effective per-question bal: a manual per-type override wins over the preset's
  // auto value; types absent from the override keep the auto value.
  const effPoints = typePoints
    ? questions.map((q, i) => {
        const ov = typePoints[q.type];
        return ov === undefined || ov === null || ov === "" ? points[i] : Number(ov) || 0;
      })
    : points;
  const totalBal = typePoints
    ? Number(effPoints.reduce((s, p) => s + (p || 0), 0).toFixed(2))
    : presetTotalMarks(preset);

  // Hold back the answer-key builder until the existing key is loaded, so the
  // teacher never sees the blank default sheet flash before it populates.
  if (!ready) {
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
            {customPlan ? (
              <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 font-semibold text-text">
                Son 3 sual → 9 bal
              </span>
            ) : (
              <>
                <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 font-semibold text-text">
                  İlk 18 → 55
                </span>
                <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 font-semibold text-text">
                  Qalanı → 45
                </span>
              </>
            )}
            <span className="rounded-full bg-primary/12 px-2.5 py-0.5 font-semibold text-primary">
              Cəmi {totalBal} bal
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
                <ScoringEditor
                  questions={questions}
                  autoPoints={points}
                  typePoints={typePoints}
                  onChange={setTypePoints}
                />
                {questions.map((q, i) => (
                  <div
                    key={i}
                    onDragOver={(e) => {
                      if (dragIdx === null) return;
                      e.preventDefault();
                      if (overIdx !== i) setOverIdx(i);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      reorderQuestion(dragIdx, i);
                      endDrag();
                    }}
                    className={`rounded-2xl border bg-surface2/40 p-4 transition-shadow ${
                      dragIdx === i
                        ? "border-primary opacity-50"
                        : overIdx === i && dragIdx !== null
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-line"
                    }`}
                  >
                    <div className="mb-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <button
                            type="button"
                            draggable
                            onDragStart={() => setDragIdx(i)}
                            onDragEnd={endDrag}
                            className="-ml-1 grid h-7 w-6 shrink-0 cursor-grab place-items-center rounded-md text-muted/60 transition-colors hover:bg-surface2 hover:text-text active:cursor-grabbing"
                            aria-label="Sürüklə"
                            title="Sürükləyib yerini dəyiş"
                          >
                            <RxDragHandleDots2 className="text-lg" />
                          </button>
                          <span className="font-display text-sm font-bold text-text">
                            Sual {i + 1}
                          </span>
                          <span className="shrink-0 rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-semibold text-muted">
                            {Number((effPoints[i] || 0).toFixed(3))} bal
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveQuestion(i, -1)}
                            disabled={i === 0}
                            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text disabled:opacity-30"
                            aria-label="Yuxarı"
                          >
                            <FiChevronUp />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveQuestion(i, 1)}
                            disabled={i === questions.length - 1}
                            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text disabled:opacity-30"
                            aria-label="Aşağı"
                          >
                            <FiChevronDown />
                          </button>
                          {questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeQuestion(i)}
                              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/12 hover:text-danger"
                              aria-label="Sualı sil"
                            >
                              <FiX />
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Type selector — full-width, equal buttons: 2×2 on mobile, 1×4 on desktop. */}
                      <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface2/50 p-1 text-xs font-semibold sm:grid-cols-4">
                        {[
                          { t: "Cm", label: "Qapalı" },
                          { t: "Co", label: "Açıq" },
                          { t: "Cd", label: "Həll tələb", title: "Həlli tələb olunan açıq sual" },
                          { t: "Cmu", label: "Uyğunluq" },
                        ].map(({ t, label, title }) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setType(i, t)}
                            title={title}
                            className={`rounded-lg px-2 py-1.5 text-center transition-colors ${
                              q.type === t
                                ? "bg-primary text-primary-fg shadow-soft"
                                : "text-muted hover:text-text"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {q.type === "Cmu" ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-4">
                          <label className="flex items-center gap-2 text-xs font-semibold text-muted">
                            Nömrələr
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={2}
                              value={q.leftCount ?? ""}
                              onChange={(e) => setCmuLeft(i, e.target.value)}
                              onBlur={() => commitCmuLeft(i)}
                              className="w-16 rounded-lg border border-line bg-surface px-2 py-1 text-center text-sm text-text outline-none focus:border-primary"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold text-muted">
                            Hərflər
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={2}
                              value={q.rightCount ?? ""}
                              onChange={(e) => setCmuRight(i, e.target.value)}
                              onBlur={() => commitCmuRight(i)}
                              className="w-16 rounded-lg border border-line bg-surface px-2 py-1 text-center text-sm text-text outline-none focus:border-primary"
                            />
                          </label>
                          <span className="text-xs text-muted">
                            Hər nömrə üçün düzgün hərf(lər)i seç
                          </span>
                        </div>
                        <div className="space-y-2">
                          {Array.from({ length: Number(q.leftCount) || 0 }).map((_, li) => {
                            const row = new Set(
                              Array.isArray(q.key?.[li]) ? q.key[li].map(Number) : []
                            );
                            return (
                              <div
                                key={li}
                                className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2"
                              >
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/12 text-sm font-bold text-primary">
                                  {li + 1}
                                </span>
                                <span className="text-muted">→</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {Array.from({ length: Number(q.rightCount) || 0 }).map(
                                    (__, ri) => {
                                      const on = row.has(ri);
                                      return (
                                        <button
                                          key={ri}
                                          type="button"
                                          onClick={() => toggleCmuKey(i, li, ri)}
                                          className={`grid h-8 w-8 place-items-center rounded-lg border text-sm font-bold transition-colors ${
                                            on
                                              ? "border-success bg-success text-white"
                                              : "border-line bg-surface text-muted hover:border-primary/40"
                                          }`}
                                        >
                                          {GRID_LETTERS[ri]}
                                        </button>
                                      );
                                    }
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : q.type === "Cm" ? (
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
                      (() => {
                        // Multiple accepted answers — correct if the student types ANY.
                        const accepted =
                          Array.isArray(q.answers) && q.answers.length
                            ? q.answers
                            : [q.answer || ""];
                        const setAcc = (next) =>
                          update(i, {
                            answers: next.length ? next : [""],
                            answer: next[0] || "",
                          });
                        return (
                          <div className="space-y-2">
                            {accepted.map((ans, ai) => (
                              <div key={ai} className="flex items-center gap-2">
                                <input
                                  value={ans}
                                  onChange={(e) => {
                                    const next = [...accepted];
                                    next[ai] = e.target.value;
                                    setAcc(next);
                                  }}
                                  placeholder={
                                    ai === 0
                                      ? "Düzgün cavab (məs: x+2)..."
                                      : "Alternativ cavab (məs: x + 2)..."
                                  }
                                  className={inputClass}
                                />
                                {accepted.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAcc(accepted.filter((_, k) => k !== ai))
                                    }
                                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                                    aria-label="Sil"
                                  >
                                    <FiX />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => setAcc([...accepted, ""])}
                              className="flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-semibold text-muted transition-colors hover:text-primary"
                            >
                              <FiPlus className="text-base" /> Alternativ cavab əlavə et
                            </button>
                          </div>
                        );
                      })()
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
