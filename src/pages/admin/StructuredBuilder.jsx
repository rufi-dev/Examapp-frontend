import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { addQuestion, getExam } from "../../../redux/features/quiz/quizSlice";
import { PRESETS, presetTypes, presetPointsPlan, presetTotalMarks } from "../../helper/examPresets";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import Spinner from "../../components/Spinner";
import Button from "../../components/ui/Button";
import { inputClass } from "../../components/ui/Field";
import { MathTextField } from "../../components/MathEditor";
import { textHasMath } from "../../components/Math";
import QuestionType from "../../components/QuestionType";
import QuestionMap from "../../components/QuestionMap";
import PdfCropper from "../../components/PdfCropper";
import { uploadImage } from "../../helper/cloudinary";
import {
  FiPlus,
  FiX,
  FiImage,
  FiCopy,
  FiCrop,
  FiChevronUp,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiRotateCcw,
  FiRotateCw,
  FiSave,
  FiUploadCloud,
  FiClock,
  FiZap,
  FiInfo,
  FiCheckCircle,
} from "react-icons/fi";
import { questionPoints, hasAnswer } from "../../helper/helper";

// Compact answered-progress ring for the preview sidebar (mirrors the live exam).
const PreviewRing = ({ value = 0, total = 0, size = 56, stroke = 5 }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-line" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          className="text-primary transition-all duration-500 ease-out"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xs font-bold tabular-nums text-text">
        {Math.round(frac * 100)}%
      </span>
    </div>
  );
};

// Rotating status lines shown while the AI extracts questions from the PDF.
const EXTRACT_STEPS = [
  "PDF oxunur…",
  "Suallar müəyyən edilir…",
  "Variantlar ayrılır…",
  "Düsturlar tanınır…",
  "Suallar hazırlanır…",
];

const norm = (v) => String(v ?? "").trim();

// Math now lives INLINE inside the text as `$...$`. Legacy questions stored it
// in a separate `latex` field that rendered after the text — fold that into the
// text (appended, where it used to show) so everything is one inline field.
const foldMath = (text, latex) => {
  const t = norm(text);
  const l = norm(latex);
  if (!l) return t;
  return (t ? `${t} ` : "") + `$${l}$`;
};

// AI extraction spend ledger (per browser): a list of { at, usd, questions,
// tokens, mode } so the teacher can see + tally what each PDF extraction cost.
const AI_SPEND_KEY = "aiSpendLog";
const readSpend = () => {
  try {
    const a = JSON.parse(localStorage.getItem(AI_SPEND_KEY) || "[]");
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
};
const fmtTokens = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n || 0));

// Multi-line fields need top padding + auto height (inputClass is a fixed-height
// single-line style, which top-aligns text and makes the placeholder look high).
const taClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] leading-relaxed text-text placeholder:text-muted/60 outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/25 resize-y";

// Native question types offered in the builder.
const TYPES = [
  { key: "Cm", label: "Tək seçim" },
  { key: "Cs", label: "Çox seçim" },
  { key: "Co", label: "Açıq cavab" },
  { key: "Cma", label: "Uyğunlaşdırma" },
];

const emptyChoice = () => ({ text: "", image: "", latex: "" });
const emptyPair = () => ({
  left: "",
  leftImage: "",
  leftLatex: "",
  right: "",
  rightImage: "",
  rightLatex: "",
});
const newQuestion = (type = "Cm") => ({
  type,
  text: "",
  image: "",
  latex: "",
  choices: [emptyChoice(), emptyChoice(), emptyChoice(), emptyChoice()],
  correct: type === "Cm" ? [0] : [], // indices into choices
  answer: "", // open (Co) correct text
  pairs: [emptyPair(), emptyPair()],
  explanation: "", // optional, shown to the student in review
});

// A choice/question/pair-side counts as filled if it has text, an image or latex.
const filledContent = (c) => !!(norm(c.text) || c.image || norm(c.latex));

// Does any question already use formulas / explanations? Used to auto-enable
// those builder features when editing an exam that has them.
const hasLatex = (qs) =>
  qs.some(
    (q) =>
      norm(q.latex) ||
      textHasMath(q.text) ||
      (q.choices || []).some((c) => norm(c.latex) || textHasMath(c.text)) ||
      (q.pairs || []).some(
        (p) =>
          norm(p.leftLatex) ||
          norm(p.rightLatex) ||
          textHasMath(p.left) ||
          textHasMath(p.right)
      )
  );
const hasExpl = (qs) => qs.some((q) => norm(q.explanation));

// Undo/redo history with time-coalescing: rapid edits (typing) within 500ms
// collapse into a single undo step, while a deliberate change after a pause
// gets its own restore point.
function useHistory(initial) {
  const [hist, setHist] = useState({ past: [], present: initial, future: [] });
  const lastPush = useRef(0);
  const set = useCallback((updater) => {
    setHist((h) => {
      const present = typeof updater === "function" ? updater(h.present) : updater;
      if (present === h.present) return h;
      const now = Date.now();
      const coalesce = now - lastPush.current < 500;
      lastPush.current = now;
      if (coalesce) return { past: h.past, present, future: [] };
      return { past: [...h.past, h.present].slice(-100), present, future: [] };
    });
  }, []);
  const reset = useCallback((present) => {
    lastPush.current = 0;
    setHist({ past: [], present, future: [] });
  }, []);
  const undo = useCallback(
    () =>
      setHist((h) => {
        if (!h.past.length) return h;
        lastPush.current = 0;
        const prev = h.past[h.past.length - 1];
        return { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future] };
      }),
    []
  );
  const redo = useCallback(
    () =>
      setHist((h) => {
        if (!h.future.length) return h;
        lastPush.current = 0;
        return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
      }),
    []
  );
  return {
    state: hist.present,
    set,
    reset,
    undo,
    redo,
    canUndo: hist.past.length > 0,
    canRedo: hist.future.length > 0,
  };
}

// ---- small reusable editors (module scope so they aren't re-created) --------
const ImagePicker = ({ url, onChange, label = "Şəkil" }) => {
  const [busy, setBusy] = useState(false);
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadImage(file));
    } catch (err) {
      toast.error(err?.message || "Şəkil yüklənmədi");
    } finally {
      setBusy(false);
    }
  };
  if (url) {
    return (
      <div className="relative inline-block">
        <img src={url} alt="" className="h-12 w-12 rounded-lg border border-line object-cover" />
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Şəkli sil"
          className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-danger text-xs leading-none text-white"
        >
          ×
        </button>
      </div>
    );
  }
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-primary hover:text-primary">
      {busy ? <Spinner size={14} /> : <FiImage />} {label}
      <input type="file" accept="image/*" onChange={onFile} className="hidden" />
    </label>
  );
};

// Tiny stacked up/down reorder control.
const Reorder = ({ onUp, onDown, upDisabled, downDisabled, label }) => (
  <div className="flex shrink-0 flex-col">
    <button
      type="button"
      onClick={onUp}
      disabled={upDisabled}
      aria-label={`${label} yuxarı`}
      className="grid h-3.5 w-5 place-items-center text-muted transition-colors hover:text-text disabled:opacity-25"
    >
      <FiChevronUp className="text-xs" />
    </button>
    <button
      type="button"
      onClick={onDown}
      disabled={downDisabled}
      aria-label={`${label} aşağı`}
      className="grid h-3.5 w-5 place-items-center text-muted transition-colors hover:text-text disabled:opacity-25"
    >
      <FiChevronDown className="text-xs" />
    </button>
  </div>
);

// A polished on/off switch (used for the builder feature toggles).
const Switch = ({ checked, onChange, label, hint }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
      checked ? "border-primary/40 bg-primary/5" : "border-line bg-surface hover:border-primary/30"
    }`}
  >
    <span className="min-w-0">
      <span className="block text-sm font-semibold text-text">{label}</span>
      {hint && <span className="block text-[11px] text-muted">{hint}</span>}
    </span>
    <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-line"}`}>
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
          checked ? "left-[18px]" : "left-0.5"
        }`}
      />
    </span>
  </button>
);

// Custom styled dropdown — replaces the inconsistent native <select> look.
const Dropdown = ({ value, options, onChange, className = "" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const current = options.find((o) => o.value === value);
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-text transition-colors hover:border-primary/40"
      >
        {current?.label ?? value}
        <FiChevronDown className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-line bg-surface py-1 shadow-lift">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`block w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-surface2 ${
                o.value === value ? "font-semibold text-primary" : "text-text"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const PAGE_OPTIONS = [
  { value: "all", label: "Hamısı" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
];

const StructuredBuilder = () => {
  useRedirectLoggedOutUser("/login");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { examId } = useParams();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false); // exam/questions loaded -> show builder
  const [extracting, setExtracting] = useState(false); // AI PDF import running
  // AI provider for PDF extraction: "gemini" (cheaper, default) or "claude".
  const [aiProvider, setAiProvider] = useState("gemini");
  const pdfInputRef = useRef(null);
  // PDF import: "append" adds to the end, "replace" overwrites everything. We
  // ask (a 2-button dialog) only when the builder already has real content.
  const [importChoice, setImportChoice] = useState(false);
  const importModeRef = useRef("replace");
  const [examName, setExamName] = useState("");
  const [preset, setPreset] = useState(""); // exam scoring preset (for bal preview)
  const {
    state: questions,
    set: setQuestions,
    reset: resetQuestions,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory([newQuestion()]);
  const [preview, setPreview] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState([]);
  const [previewPage, setPreviewPage] = useState(0);
  const [previewMarked, setPreviewMarked] = useState([]);
  // Cycling status step shown in the animated AI extraction loader.
  const [extractStep, setExtractStep] = useState(0);
  // AI extraction cost tracking (per browser).
  const [aiSpend, setAiSpend] = useState(readSpend);
  const [aiLogOpen, setAiLogOpen] = useState(false);
  // Imported PDF kept in memory so figures can be cropped from it (no AI tokens);
  // cropFor = the question index currently choosing a figure crop.
  const [aiPdfFile, setAiPdfFile] = useState(null);
  const [cropFor, setCropFor] = useState(null);
  // Builder feature toggles (clean UI for non-math exams): formula buttons and
  // explanation fields only appear when enabled.
  const [mathEnabled, setMathEnabled] = useState(false);
  const [explEnabled, setExplEnabled] = useState(false);
  // Display paging: how many questions per page (default all).
  const [perPage, setPerPage] = useState("all");
  // Linear mode: student can only go forward (no going back to earlier pages).
  const [forwardOnly, setForwardOnly] = useState(false);
  const [page, setPage] = useState(0);

  // Cycle the AI loader status lines while an extraction runs.
  useEffect(() => {
    if (!extracting) {
      setExtractStep(0);
      return;
    }
    const id = setInterval(() => setExtractStep((s) => (s + 1) % EXTRACT_STEPS.length), 2200);
    return () => clearInterval(id);
  }, [extracting]);

  // Autosave / dirty tracking.
  const draftKey = `structDraft_${examId}`;
  // Builder UI preferences (which feature panels are shown) persist separately
  // from the content draft, so toggling them never marks the exam "unsaved".
  const prefsKey = `structPrefs_${examId}`;
  const loadedRef = useRef(false);
  const serverQsRef = useRef(null);
  const savedJsonRef = useRef(""); // JSON of the last server-saved questions
  const savedPerPageRef = useRef(0); // last server-saved questionsPerPage (0 = all)
  const savedForwardOnlyRef = useRef(false); // last server-saved forwardOnly
  // "all" -> 0; otherwise the numeric per-page count.
  const perPageNum = perPage === "all" ? 0 : Number(perPage);
  const dirty =
    JSON.stringify(questions) !== savedJsonRef.current ||
    perPageNum !== savedPerPageRef.current ||
    forwardOnly !== savedForwardOnlyRef.current;

  // Pre-load existing structured questions so editing is non-destructive.
  useEffect(() => {
    const fetchData = async () => {
      let serverQs = [newQuestion()];
      try {
        const examAction = await dispatch(getExam(examId));
        const exam = examAction?.payload;
        if (exam?.name) setExamName(exam.name);
        setPreset(exam?.preset || "");
        // Restore the saved per-page layout (0/absent => "all").
        const qpp = Number(exam?.questionsPerPage || 0);
        savedPerPageRef.current = qpp;
        setPerPage(qpp > 0 ? String(qpp) : "all");
        savedForwardOnlyRef.current = !!exam?.forwardOnly;
        setForwardOnly(!!exam?.forwardOnly);
        const existing = exam?.questions?.correctAnswers;
        const isStructured =
          Array.isArray(existing) &&
          existing.some((q) => Array.isArray(q.choices) || Array.isArray(q.pairs) || q.text);
        if (isStructured) {
          serverQs = existing.map((q) => ({
            type: q.type || "Cm",
            text: foldMath(q.text, q.latex),
            image: q.image || "",
            latex: "",
            choices:
              Array.isArray(q.choices) && q.choices.length
                ? q.choices.map((c) => ({
                    text: foldMath(c.text, c.latex),
                    image: c.image || "",
                    latex: "",
                  }))
                : [emptyChoice(), emptyChoice()],
            correct: Array.isArray(q.correct)
              ? q.correct.map(Number)
              : q.type === "Cm"
              ? [0]
              : [],
            answer: q.type === "Co" || q.type === "Cd" ? q.answer || "" : "",
            pairs:
              Array.isArray(q.pairs) && q.pairs.length
                ? q.pairs.map((p) => ({
                    left: foldMath(p.left, p.leftLatex),
                    leftImage: p.leftImage || "",
                    leftLatex: "",
                    right: foldMath(p.right, p.rightLatex),
                    rightImage: p.rightImage || "",
                    rightLatex: "",
                  }))
                : [emptyPair(), emptyPair()],
            explanation: q.explanation || "",
          }));
        } else if (exam?.preset && PRESETS[exam.preset]) {
          // Brand-new exam created with a preset → seed the question slots
          // (types in order, e.g. 22 closed, 4 open, matching at #27, 3 open).
          serverQs = presetTypes(PRESETS[exam.preset]).map((t) => newQuestion(t));
        }
      } catch (error) {
        console.error("Error fetching exam data:", error);
      }

      serverQsRef.current = serverQs;
      savedJsonRef.current = JSON.stringify(serverQs);
      // Prefer an unsaved local draft if one exists for this exam.
      let draft = null;
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) draft = JSON.parse(raw);
      } catch {
        /* ignore */
      }
      // Silently restore the autosaved draft (if any) — no banner; autosave is
      // the contract, so a reload just continues where the teacher left off.
      const baseQs =
        draft && Array.isArray(draft.questions) && draft.questions.length
          ? draft.questions
          : serverQs;
      resetQuestions(baseQs);
      // Toggle prefs: saved preference wins, else auto-enable from the content.
      let prefs = null;
      try {
        const raw = localStorage.getItem(prefsKey);
        if (raw) prefs = JSON.parse(raw);
      } catch {
        /* ignore */
      }
      setMathEnabled(prefs?.mathEnabled ?? hasLatex(baseQs));
      setExplEnabled(prefs?.explEnabled ?? hasExpl(baseQs));
      loadedRef.current = true;
      setReady(true);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, examId]);

  // Persist the working draft — but only while there are unsaved changes. When
  // the questions match the server copy (incl. right after a discard) the draft
  // is removed instead, so a discarded draft can't resurrect itself.
  useEffect(() => {
    if (!loadedRef.current) return;
    const isDirty = JSON.stringify(questions) !== savedJsonRef.current;
    if (!isDirty) {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      localStorage.setItem(draftKey, JSON.stringify({ questions }));
    } catch {
      /* ignore */
    }
  }, [questions, draftKey]);

  // Persist builder UI prefs separately, so toggling a panel never marks the
  // exam unsaved and the preference survives a reload of a clean exam.
  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      localStorage.setItem(prefsKey, JSON.stringify({ mathEnabled, explEnabled }));
    } catch {
      /* ignore */
    }
  }, [mathEnabled, explEnabled, prefsKey]);

  const discardDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
    if (serverQsRef.current) resetQuestions(serverQsRef.current);
  };

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

  // Keyboard undo/redo.
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = (e.key || "").toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (k === "y" || (k === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // Keep the current page in range as questions are added/removed.
  const total = questions.length;
  const pageSize = perPage === "all" ? Math.max(1, total) : Number(perPage);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    setPage((p) => Math.min(Math.max(0, p), pageCount - 1));
  }, [pageCount]);

  // ---- immutable updates -----------------------------------------------------
  const patch = (i, updater) =>
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? updater(q) : q)));

  const setType = (i, type) =>
    patch(i, (q) => {
      let correct = q.correct;
      if (type === "Cm") correct = q.correct.length ? [q.correct[0]] : [0];
      return { ...q, type, correct };
    });

  const toggleCorrect = (i, ci) =>
    patch(i, (q) => {
      if (q.type === "Cm") return { ...q, correct: [ci] };
      const has = q.correct.includes(ci);
      return {
        ...q,
        correct: has
          ? q.correct.filter((x) => x !== ci)
          : [...q.correct, ci].sort((a, b) => a - b),
      };
    });

  const setChoice = (i, ci, p) =>
    patch(i, (q) => ({
      ...q,
      choices: q.choices.map((c, j) => (j === ci ? { ...c, ...p } : c)),
    }));
  const addChoice = (i) => patch(i, (q) => ({ ...q, choices: [...q.choices, emptyChoice()] }));
  const removeChoice = (i, ci) =>
    patch(i, (q) => {
      const choices = q.choices.filter((_, j) => j !== ci);
      let correct = q.correct.filter((x) => x !== ci).map((x) => (x > ci ? x - 1 : x));
      if (q.type === "Cm" && !correct.length) correct = [0];
      return { ...q, choices, correct };
    });
  const moveChoice = (i, ci, dir) =>
    patch(i, (q) => {
      const cj = ci + dir;
      if (cj < 0 || cj >= q.choices.length) return q;
      const choices = [...q.choices];
      [choices[ci], choices[cj]] = [choices[cj], choices[ci]];
      // Keep the correct marker(s) pointing at the same choices after the swap.
      const correct = q.correct.map((x) => (x === ci ? cj : x === cj ? ci : x));
      return { ...q, choices, correct };
    });

  const setPair = (i, pi, p) =>
    patch(i, (q) => ({
      ...q,
      pairs: q.pairs.map((pr, j) => (j === pi ? { ...pr, ...p } : pr)),
    }));
  const addPair = (i) => patch(i, (q) => ({ ...q, pairs: [...q.pairs, emptyPair()] }));
  const removePair = (i, pi) =>
    patch(i, (q) => ({ ...q, pairs: q.pairs.filter((_, j) => j !== pi) }));
  const movePair = (i, pi, dir) =>
    patch(i, (q) => {
      const pj = pi + dir;
      if (pj < 0 || pj >= q.pairs.length) return q;
      const pairs = [...q.pairs];
      [pairs[pi], pairs[pj]] = [pairs[pj], pairs[pi]];
      return { ...q, pairs };
    });

  const removeQuestion = (i) => setQuestions((prev) => prev.filter((_, idx) => idx !== i));
  const addQuestionRow = () => setQuestions((prev) => [...prev, newQuestion("Cm")]);
  const duplicateQuestion = (i) =>
    setQuestions((prev) => {
      const clone = JSON.parse(JSON.stringify(prev[i])); // plain data — safe deep copy
      const next = [...prev];
      next.splice(i + 1, 0, clone);
      return next;
    });
  const moveQuestion = (i, dir) =>
    setQuestions((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // Map the working questions to the STUDENT-facing shape (answer key stripped).
  const buildPreviewDefs = () =>
    questions.map((q) => {
      const d = {
        type: q.type,
        text: norm(q.text),
        image: q.image || undefined,
        latex: norm(q.latex) || undefined,
      };
      if (q.type === "Cm" || q.type === "Cs") {
        d.choices = q.choices.filter(filledContent).map((c) => ({
          text: norm(c.text),
          image: c.image || undefined,
          latex: norm(c.latex) || undefined,
        }));
      } else if (q.type === "Cma") {
        const kept = q.pairs.filter((p) => norm(p.left) && norm(p.right));
        d.lefts = kept.map((p) => ({
          text: norm(p.left),
          latex: norm(p.leftLatex) || undefined,
          image: p.leftImage || undefined,
        }));
        d.rights = kept.map((p) => ({
          text: norm(p.right),
          latex: norm(p.rightLatex) || undefined,
          image: p.rightImage || undefined,
        }));
      }
      return d;
    });
  const openPreview = () => {
    setPreviewAnswers([]);
    setPreviewMarked([]);
    setPreviewPage(0);
    setPreview(true);
  };
  const previewChange = (e, index, type) => {
    const value = e.target.value;
    setPreviewAnswers((prev) => {
      const u = [...prev];
      u[index] = { ...u[index], answer: value, type };
      return u;
    });
  };
  const previewToggleMark = (i) =>
    setPreviewMarked((prev) => {
      const u = [...prev];
      u[i] = !u[i];
      return u;
    });
  // Jump to a question in the preview (switch page when paginated, then scroll).
  const previewJump = (i) => {
    const size = perPage === "all" ? Math.max(1, questions.length) : Number(perPage);
    if (perPage !== "all") setPreviewPage(Math.floor(i / size));
    setTimeout(() => {
      const el = document.getElementById(`q-${i}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  // ---- AI import from PDF ----------------------------------------------------
  // Map one AI-extracted question into the builder's working shape.
  const fromAi = (q) => {
    const type = ["Cm", "Cs", "Co", "Cma"].includes(q.type) ? q.type : "Cm";
    const choices =
      Array.isArray(q.choices) && q.choices.length
        ? q.choices.map((c) => ({ text: foldMath(c?.text, c?.latex), image: "", latex: "" }))
        : [emptyChoice(), emptyChoice(), emptyChoice(), emptyChoice()];
    const correct = (Array.isArray(q.correct) ? q.correct : [])
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0 && n < choices.length);
    return {
      type,
      // The AI now returns math inline as $...$ inside text; fold any stray
      // separate latex it still emits into the text so nothing renders at the end.
      text: foldMath(q.text, q.latex),
      image: "",
      latex: "",
      choices,
      correct: type === "Cm" && correct.length > 1 ? [correct[0]] : correct,
      answer: type === "Co" || type === "Cd" ? q.openAnswer || "" : "",
      // Builder-only hint (not saved): the AI flagged a figure to add manually.
      needsFigure: !!q.hasFigure,
      pairs:
        Array.isArray(q.pairs) && q.pairs.length
          ? q.pairs.map((p) => ({
              left: foldMath(p?.left, p?.leftLatex),
              leftImage: "",
              leftLatex: "",
              right: foldMath(p?.right, p?.rightLatex),
              rightImage: "",
              rightLatex: "",
            }))
          : [emptyPair(), emptyPair()],
      explanation: q.explanation || "",
    };
  };

  // Does the builder already hold real (non-empty) questions? Used to decide
  // whether a PDF import needs to ask "add or replace".
  const builderHasContent = () =>
    questions.some(
      (q) =>
        filledContent({ text: q.text, image: q.image, latex: q.latex }) ||
        (q.choices || []).some(filledContent) ||
        (q.pairs || []).some((p) => norm(p.left) || norm(p.right)) ||
        norm(q.answer)
    );

  // Import button: ask add-vs-replace only when there is content to preserve;
  // otherwise import straight away (nothing to lose).
  const startImport = () => {
    if (builderHasContent()) {
      setImportChoice(true);
    } else {
      importModeRef.current = "replace";
      pdfInputRef.current?.click();
    }
  };
  const pickImportMode = (mode) => {
    importModeRef.current = mode;
    setImportChoice(false);
    pdfInputRef.current?.click();
  };

  const onExtractFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") return toast.error("PDF fayl seçin");
    const mode = importModeRef.current === "append" ? "append" : "replace";
    setAiPdfFile(file); // keep the PDF so figures can be cropped from it
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append("pdf", file);
      fd.append("provider", aiProvider);
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/quiz/extractQuestions/${examId}`,
        fd
      );
      const aiQs = res.data?.questions || [];
      if (!aiQs.length) {
        toast.error("PDF-də sual tapılmadı");
        return;
      }
      const mapped = aiQs.map(fromAi);
      if (mode === "append") {
        // Drop a lone empty starter so appending doesn't keep a leading blank.
        setQuestions((prev) => {
          const base =
            prev.length === 1 && !filledContent({ text: prev[0].text, image: prev[0].image, latex: prev[0].latex })
              ? []
              : prev;
          return [...base, ...mapped];
        });
      } else {
        setQuestions(mapped); // undoable — Ctrl+Z restores the prior state
      }
      setMathEnabled((v) => v || hasLatex(mapped));
      setExplEnabled((v) => v || hasExpl(mapped));
      toast.success(
        mode === "append"
          ? `${mapped.length} sual əlavə edildi — düzgün cavabları yoxlayın.`
          : `${mapped.length} sual idxal edildi — düzgün cavabları yoxlayın.`
      );
      if (res.data?.fellBack) {
        toast.info("Gemini məşğul idi — bu çıxarış Claude ilə emal olundu.");
      }
      const figs = aiQs.filter((q) => q.hasFigure).length;
      if (figs) toast.info(`${figs} sualda şəkil var — şəkilləri əl ilə əlavə edin.`);
      const noKey = mapped.filter(
        (q) => (q.type === "Cm" || q.type === "Cs") && !q.correct.length
      ).length;
      if (noKey) toast.info(`${noKey} sualda düzgün cavab işarələnməlidir.`);

      // Record what this extraction cost so it can be tallied later.
      const cost = res.data?.cost;
      if (cost && typeof cost.usd === "number") {
        const entry = {
          at: Date.now(),
          usd: cost.usd,
          questions: mapped.length,
          tokens: cost.totalTokens,
          mode,
        };
        setAiSpend((prev) => {
          const next = [entry, ...prev].slice(0, 200);
          try {
            localStorage.setItem(AI_SPEND_KEY, JSON.stringify(next));
          } catch {
            /* ignore */
          }
          return next;
        });
        toast.info(`Bu çıxarışın xərci: $${cost.usd.toFixed(4)} · ${fmtTokens(cost.totalTokens)} token`);
        // eslint-disable-next-line no-console
        console.log(
          `[AI extract] $${cost.usd} — in:${cost.inputTokens} out:${cost.outputTokens} cacheRead:${cost.cacheReadTokens} cacheWrite:${cost.cacheWriteTokens} total:${cost.totalTokens}`
        );
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "AI emalı alınmadı");
    } finally {
      setExtracting(false);
    }
  };

  const aiTotal = aiSpend.reduce((s, e) => s + (e.usd || 0), 0);
  const clearSpend = () => {
    setAiSpend([]);
    try {
      localStorage.removeItem(AI_SPEND_KEY);
    } catch {
      /* ignore */
    }
  };

  // ---- submit ----------------------------------------------------------------
  const buildPayload = () => {
    const correctAnswers = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const num = i + 1;
      if (!filledContent({ text: q.text, image: q.image, latex: q.latex })) {
        toast.error(`Sual ${num}: sual mətni və ya şəkil/düstur lazımdır`);
        return null;
      }
      const stem = {
        text: norm(q.text),
        image: q.image || undefined,
        latex: norm(q.latex) || undefined,
        explanation: norm(q.explanation) || undefined,
      };

      if (q.type === "Cm" || q.type === "Cs") {
        const map = new Map();
        const kept = [];
        q.choices.forEach((c, idx) => {
          if (filledContent(c)) {
            map.set(idx, kept.length);
            kept.push(c);
          }
        });
        if (kept.length < 2) {
          toast.error(`Sual ${num}: ən azı 2 variant lazımdır`);
          return null;
        }
        const correct = q.correct
          .filter((idx) => map.has(idx))
          .map((idx) => map.get(idx))
          .sort((a, b) => a - b);
        if (q.type === "Cm" && correct.length !== 1) {
          toast.error(`Sual ${num}: bir düzgün variant seçin`);
          return null;
        }
        if (q.type === "Cs" && correct.length < 1) {
          toast.error(`Sual ${num}: ən azı bir düzgün variant seçin`);
          return null;
        }
        correctAnswers.push({
          type: q.type,
          ...stem,
          choices: kept.map((c) => ({
            text: norm(c.text),
            image: c.image || undefined,
            latex: norm(c.latex) || undefined,
          })),
          correct,
          answer: correct.join(","),
        });
      } else if (q.type === "Co" || q.type === "Cd") {
        if (!norm(q.answer)) {
          toast.error(`Sual ${num}: düzgün cavabı yazın`);
          return null;
        }
        correctAnswers.push({ type: q.type, ...stem, answer: norm(q.answer) });
      } else if (q.type === "Cma") {
        const kept = q.pairs.filter((p) => norm(p.left) && norm(p.right));
        if (kept.length < 2) {
          toast.error(`Sual ${num}: ən azı 2 tam cüt (sol və sağ) lazımdır`);
          return null;
        }
        const rights = kept.map((p) => norm(p.right));
        if (new Set(rights).size !== rights.length) {
          toast.error(`Sual ${num}: sağ sütundakı cavablar fərqli olmalıdır`);
          return null;
        }
        correctAnswers.push({
          type: "Cma",
          ...stem,
          pairs: kept.map((p) => ({
            left: norm(p.left),
            leftImage: p.leftImage || undefined,
            leftLatex: norm(p.leftLatex) || undefined,
            right: norm(p.right),
            rightImage: p.rightImage || undefined,
            rightLatex: norm(p.rightLatex) || undefined,
          })),
          answer: rights.join(" | "),
        });
      }
    }
    return correctAnswers;
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!questions.length) return toast.error("Ən azı bir sual əlavə edin");
    const correctAnswers = buildPayload();
    if (!correctAnswers) return;
    setLoading(true);
    try {
      await dispatch(
        addQuestion({
          examId,
          questionData: { correctAnswers, questionsPerPage: perPageNum, forwardOnly },
        })
      ).unwrap();
      savedJsonRef.current = JSON.stringify(questions);
      savedPerPageRef.current = perPageNum;
      savedForwardOnlyRef.current = forwardOnly;
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
      // After saving questions, take the teacher to the exam's instructions
      // page (a clean overview) rather than back to the previous page.
      navigate(`/exam/details/${examId}`);
    } catch {
      // error toast shown by the slice's rejected case
    } finally {
      setLoading(false);
    }
  };

  // Per-question bal preview from the exam's preset (e.g. Blok = 150) so the
  // builder matches the server score; legacy/Buraxılış fall back to questionPoints.
  const points = presetPointsPlan(preset, questions.length) || questionPoints(questions.length);
  const totalBal = presetTotalMarks(preset);
  const isChoice = (t) => t === "Cm" || t === "Cs";

  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const startIdx = perPage === "all" ? 0 : safePage * pageSize;
  const visible = perPage === "all" ? questions : questions.slice(startIdx, startIdx + pageSize);

  const toolBtn =
    "grid h-8 w-8 place-items-center rounded-lg border border-line text-muted transition-colors hover:text-text disabled:opacity-30 disabled:hover:text-muted";
  const togglePill = (active) =>
    `rounded-lg border px-2.5 py-1 text-sm font-semibold transition-colors ${
      active ? "border-primary bg-primary/10 text-primary" : "border-line text-muted hover:text-text"
    }`;

  // Jump to a question (switching page first when paging is on).
  const goToQuestion = (idx) => {
    if (perPage !== "all") setPage(Math.floor(idx / pageSize));
    setTimeout(() => {
      const el = document.getElementById(`builder-q-${idx}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  // All the builder tools. Rendered vertically in the right sidebar (desktop)
  // and horizontally in a scrollable strip (mobile).
  const setPageCount = (v) => {
    setPerPage(v);
    setPage(0);
  };
  const renderTools = (vertical) => {
    const saveBtn = (
      <button
        type="button"
        onClick={() => submit()}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
          dirty ? "bg-primary text-primary-fg shadow-soft hover:bg-primary-hover" : "border border-line bg-surface text-muted"
        } ${vertical ? "w-full" : ""}`}
      >
        {loading ? <Spinner size={16} /> : <FiSave />} {dirty ? "Yadda saxla" : "Saxlanılıb"}
      </button>
    );
    const previewBtn = (
      <button
        type="button"
        onClick={openPreview}
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary ${
          vertical ? "w-full" : ""
        }`}
      >
        <FiEye /> Önizləmə
      </button>
    );
    const importBtn = (
      <div className={`flex flex-col gap-1.5 ${vertical ? "w-full" : "shrink-0"}`}>
        <button
          type="button"
          onClick={startImport}
          disabled={extracting}
          title="Süni intellekt PDF-dən sualları avtomatik çıxarır"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-gradient-to-r from-primary/10 to-accent2/10 px-3 py-2.5 text-sm font-bold text-primary transition-colors hover:from-primary/20 hover:to-accent2/20 disabled:opacity-60"
        >
          {extracting ? <Spinner size={16} /> : <FiZap />} PDF-dən idxal
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-primary-fg">
            AI
          </span>
        </button>
        {/* AI model: Gemini (cheaper) or Claude (more precise). */}
        <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setAiProvider("gemini")}
            disabled={extracting}
            className={`flex-1 rounded-md px-2 py-1 transition-colors ${
              aiProvider === "gemini" ? "bg-primary text-primary-fg" : "text-muted hover:text-text"
            }`}
          >
            Gemini · ucuz
          </button>
          <button
            type="button"
            onClick={() => setAiProvider("claude")}
            disabled={extracting}
            className={`flex-1 rounded-md px-2 py-1 transition-colors ${
              aiProvider === "claude" ? "bg-primary text-primary-fg" : "text-muted hover:text-text"
            }`}
          >
            Claude · dəqiq
          </button>
        </div>
      </div>
    );
    const undoRedo = (
      <div className="flex items-center gap-1">
        <button type="button" onClick={undo} disabled={!canUndo} title="Geri al (Ctrl+Z)" className={toolBtn}>
          <FiRotateCcw />
        </button>
        <button type="button" onClick={redo} disabled={!canRedo} title="İrəli (Ctrl+Y)" className={toolBtn}>
          <FiRotateCw />
        </button>
        {vertical && <span className="ml-1 text-xs text-muted">Geri al / İrəli</span>}
      </div>
    );

    if (!vertical) {
      return (
        <div className="flex items-center gap-2 overflow-x-auto px-4 py-2">
          {saveBtn}
          {previewBtn}
          {importBtn}
          {undoRedo}
          <button type="button" onClick={() => setMathEnabled((v) => !v)} className={togglePill(mathEnabled)}>
            <span className="font-serif italic">ƒx</span> Düstur
          </button>
          <button type="button" onClick={() => setExplEnabled((v) => !v)} className={togglePill(explEnabled)}>
            İzah
          </button>
          <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted">
            Səhifədə:
            <Dropdown value={perPage} options={PAGE_OPTIONS} onChange={setPageCount} className="w-28" />
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="space-y-2">
          {saveBtn}
          {previewBtn}
          {importBtn}
          {aiSpend.length > 0 && (
            <button
              type="button"
              onClick={() => setAiLogOpen(true)}
              title="AI çıxarış xərclərini gör"
              className="w-full rounded-lg border border-line bg-surface2/40 px-2.5 py-1.5 text-center text-[11px] text-muted transition-colors hover:border-primary/40 hover:text-text"
            >
              AI xərci: <span className="font-bold text-text">${aiTotal.toFixed(2)}</span> ·{" "}
              {aiSpend.length} idxal
            </button>
          )}
          <p className="text-center text-[11px] leading-relaxed text-muted">
            {dirty ? (
              <>
                ✓ Avtomatik saxlanıldı ·{" "}
                <button type="button" onClick={discardDraft} className="font-semibold text-primary hover:underline">
                  geri qaytar
                </button>
              </>
            ) : (
              "Hər şey saxlanılıb"
            )}
          </p>
        </div>

        <div className="border-t border-line pt-3">{undoRedo}</div>

        <div className="space-y-2 border-t border-line pt-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Funksiyalar</span>
          <Switch checked={mathEnabled} onChange={setMathEnabled} label="Düstur (ƒx)" hint="Riyazi düsturlar əlavə et" />
          <Switch checked={explEnabled} onChange={setExplEnabled} label="İzah" hint="Cavaba izah göstər" />
        </div>

        <div className="space-y-2 border-t border-line pt-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Səhifədə sual sayı</span>
          <Dropdown value={perPage} options={PAGE_OPTIONS} onChange={setPageCount} />
          <Switch
            checked={forwardOnly}
            onChange={setForwardOnly}
            label="Yalnız irəli"
            hint="Şagird geri qayıda bilməz — yalnız növbəti səhifəyə keçir"
          />
        </div>

        <div className="border-t border-line pt-3 text-xs text-muted">{total} sual · {totalBal} bal</div>
      </div>
    );
  };

  // Left-side question navigator (outline) — fills the left margin on desktop.
  const renderNav = () => (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-line px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-muted">
        Suallar ({total})
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
        {questions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => goToQuestion(idx)}
            className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface2"
          >
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded bg-surface2 text-[11px] font-bold text-text">
              {idx + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-text">
                {norm(q.text) || TYPES.find((t) => t.key === q.type)?.label || "Sual"}
              </span>
              <span className="block text-[11px] text-muted">
                {TYPES.find((t) => t.key === q.type)?.label}
              </span>
            </span>
          </button>
        ))}
      </div>
      <div className="shrink-0 border-t border-line p-2">
        <button
          type="button"
          onClick={addQuestionRow}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line py-2 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
        >
          <FiPlus /> Sual əlavə et
        </button>
      </div>
    </div>
  );

  // Hold the full builder back until the exam + saved questions are loaded, so
  // the teacher never sees the empty/default state flash before it populates.
  if (!ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg">
        <Spinner size={44} className="text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-bg">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-4 py-3 sm:px-6">
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
              Sualları yaz
            </h1>
            <p className="hidden truncate text-xs text-muted sm:block">
              {examName || "Variantlı, çox seçimli, açıq və uyğunlaşdırma sualları."}
            </p>
          </div>
        </div>
      </header>

      {/* Tools — horizontal strip on mobile; the right sidebar holds them on desktop. */}
      <div className="shrink-0 border-b border-line bg-surface lg:hidden">{renderTools(false)}</div>

      {/* Hidden file picker for the AI PDF import. */}
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        onChange={onExtractFile}
        className="hidden"
      />

      {/* PDF import: add to the end, or replace everything? Shown only when the
          builder already has questions worth keeping. */}
      {importChoice && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setImportChoice(false)}
          />
          <div className="relative w-full max-w-md animate-scale-in rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-7">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary">
              <FiUploadCloud className="text-2xl" />
            </div>
            <h2 className="font-display text-xl font-bold text-text">PDF-dən idxal</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Bu imtahanda artıq suallar var. Yeni sualları necə idxal edək?
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => pickImportMode("append")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-fg shadow-soft transition-colors hover:bg-primary-hover"
              >
                <FiPlus /> Sona əlavə et
              </button>
              <button
                type="button"
                onClick={() => pickImportMode("replace")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-text transition-colors hover:border-danger hover:text-danger"
              >
                <FiRotateCcw /> Hamısını əvəz et
              </button>
              <button
                type="button"
                onClick={() => setImportChoice(false)}
                className="mt-1 text-sm font-semibold text-muted transition-colors hover:text-text"
              >
                Ləğv et
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        {loading && !extracting && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg/70 backdrop-blur-sm">
            <Spinner size={46} className="text-primary" />
          </div>
        )}

        {/* Animated AI extraction panel — scanning document + rotating status. */}
        {extracting && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg/85 p-6 backdrop-blur-md">
            <div className="w-full max-w-sm animate-scale-in rounded-3xl border border-line bg-surface p-8 text-center shadow-lift">
              <div className="relative mx-auto mb-7 h-28 w-24">
                <div className="absolute inset-0 overflow-hidden rounded-2xl border-2 border-primary/25 bg-surface2/60 shadow-glow">
                  <div className="space-y-2.5 p-4">
                    {[92, 70, 84, 58, 78, 66].map((w, k) => (
                      <div key={k} className="h-1.5 rounded-full bg-primary/25" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                  <div className="absolute inset-x-0 top-0 h-10 animate-scan bg-gradient-to-b from-primary/0 via-primary/40 to-primary/0" />
                </div>
                <FiZap className="absolute -right-2.5 -top-2.5 animate-float text-lg text-primary" />
                <FiZap
                  className="absolute -left-3 top-9 animate-float text-accent2"
                  style={{ animationDelay: "0.6s" }}
                />
                <span
                  className="absolute -bottom-1 right-1 animate-float text-lg"
                  style={{ animationDelay: "1.1s" }}
                >
                  ✨
                </span>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                <FiZap className="text-[13px]" /> Süni intellekt
              </span>
              <h3 className="mt-3 font-display text-lg font-bold text-text">Suallar çıxarılır</h3>
              <p key={extractStep} className="mt-1.5 animate-fade-in text-sm font-semibold text-primary">
                {EXTRACT_STEPS[extractStep]}
              </p>

              <div className="relative mt-5 h-1.5 w-full overflow-hidden rounded-full bg-surface2">
                <div className="absolute inset-y-0 w-1/3 animate-indeterminate rounded-full bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
              </div>
              <div className="mt-4 flex items-center justify-center gap-1.5">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="h-2 w-2 animate-bounce rounded-full bg-primary/60"
                    style={{ animationDelay: `${d * 0.15}s` }}
                  />
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted">
                Bir neçə saniyə çəkə bilər — PDF-in həcmindən asılıdır.
              </p>
            </div>
          </div>
        )}

        {/* Left: question navigator (fills the left margin on desktop). */}
        <aside className="hidden w-56 shrink-0 border-r border-line bg-surface lg:block">
          {renderNav()}
        </aside>

        <form onSubmit={submit} className="flex min-w-0 flex-1 flex-col">
          <div className="scrollbar-thin mx-auto min-h-0 w-full max-w-3xl flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {visible.map((q, localIdx) => {
              const i = startIdx + localIdx;
              return (
                <div
                  key={i}
                  id={`builder-q-${i}`}
                  className="scroll-mt-4 rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-5"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-bold text-text">Sual {i + 1}</span>
                      <span className="rounded-full border border-line bg-surface2/60 px-2 py-0.5 text-xs font-semibold text-muted">
                        {Number((points[i] || 0).toFixed(3))} bal
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-wrap rounded-lg border border-line bg-surface p-0.5 text-xs font-semibold">
                        {TYPES.map((t) => (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => setType(i, t.key)}
                            className={`rounded-md px-2.5 py-1 transition-colors ${
                              q.type === t.key ? "bg-primary text-primary-fg" : "text-muted"
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveQuestion(i, -1)}
                          disabled={i === 0}
                          className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text disabled:opacity-30 disabled:hover:bg-transparent"
                          aria-label="Yuxarı daşı"
                        >
                          <FiChevronUp />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(i, 1)}
                          disabled={i === questions.length - 1}
                          className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text disabled:opacity-30 disabled:hover:bg-transparent"
                          aria-label="Aşağı daşı"
                        >
                          <FiChevronDown />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateQuestion(i)}
                          className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-primary"
                          aria-label="Sualı kopyala"
                          title="Sualı kopyala"
                        >
                          <FiCopy />
                        </button>
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
                  </div>

                  {/* Question stem: text with inline $...$ math (ƒx inserts at the
                      cursor) + image. */}
                  <div className="mb-2">
                    <MathTextField
                      value={q.text}
                      onChange={(v) => patch(i, (qq) => ({ ...qq, text: v }))}
                      multiline
                      rows={2}
                      placeholder="Sual mətni..."
                      inputClassName={taClass}
                      enableMath={mathEnabled}
                    />
                  </div>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <ImagePicker url={q.image} onChange={(u) => patch(i, (qq) => ({ ...qq, image: u }))} />
                    <button
                      type="button"
                      onClick={() => setCropFor(i)}
                      title="Şəkli/qrafiki PDF-dən kəs"
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        q.needsFigure && !q.image
                          ? "border-warning bg-warning/10 text-warning hover:bg-warning/20"
                          : "border-dashed border-line text-muted hover:border-primary hover:text-primary"
                      }`}
                    >
                      <FiCrop /> PDF-dən kəs
                    </button>
                    {q.needsFigure && !q.image && (
                      <span className="text-[11px] font-semibold text-warning">Şəkil lazımdır</span>
                    )}
                  </div>

                  {/* Type-specific body */}
                  {isChoice(q.type) && (
                    <div className="space-y-2">
                      {q.choices.map((c, ci) => {
                        const on = q.correct.includes(ci);
                        return (
                          <div
                            key={ci}
                            className={`rounded-xl border px-2.5 py-2 transition-colors ${
                              on ? "border-success bg-success/8" : "border-line bg-surface2/40"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <button
                                type="button"
                                onClick={() => toggleCorrect(i, ci)}
                                aria-label="Düzgün variant"
                                title="Düzgün variant"
                                className={`grid h-7 w-7 shrink-0 place-items-center text-xs font-bold transition-colors ${
                                  q.type === "Cm" ? "rounded-full" : "rounded-md"
                                } border ${
                                  on
                                    ? "border-success bg-success text-white"
                                    : "border-line bg-surface text-muted hover:border-success/50"
                                }`}
                              >
                                {q.type === "Cm" ? String.fromCharCode(65 + ci) : on ? "✓" : ""}
                              </button>
                              <div className="min-w-0 flex-1">
                                <MathTextField
                                  value={c.text}
                                  onChange={(v) => setChoice(i, ci, { text: v })}
                                  placeholder={`Variant ${String.fromCharCode(65 + ci)}`}
                                  inputClassName="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-text outline-none focus:border-primary"
                                  enableMath={mathEnabled}
                                />
                              </div>
                              {q.choices.length > 1 && (
                                <Reorder
                                  label="Variantı"
                                  onUp={() => moveChoice(i, ci, -1)}
                                  onDown={() => moveChoice(i, ci, 1)}
                                  upDisabled={ci === 0}
                                  downDisabled={ci === q.choices.length - 1}
                                />
                              )}
                              <ImagePicker url={c.image} label="" onChange={(u) => setChoice(i, ci, { image: u })} />
                              {q.choices.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeChoice(i, ci)}
                                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-danger/12 hover:text-danger"
                                  aria-label="Variantı sil"
                                >
                                  <FiX className="text-sm" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => addChoice(i)}
                        className="flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-semibold text-muted transition-colors hover:text-primary"
                      >
                        <FiPlus className="text-base" /> Variant əlavə et
                      </button>
                      {q.type === "Cs" && (
                        <p className="text-xs text-muted">
                          Bütün düzgün variantları işarələ. Tam düzgün cavab tam bal qazanır.
                        </p>
                      )}
                    </div>
                  )}

                  {(q.type === "Co" || q.type === "Cd") && (
                    <input
                      value={q.answer}
                      onChange={(e) => patch(i, (qq) => ({ ...qq, answer: e.target.value }))}
                      placeholder="Düzgün cavab (dəqiq mətn)..."
                      className={inputClass}
                    />
                  )}

                  {q.type === "Cma" && (
                    <div className="space-y-2">
                      <div className="hidden grid-cols-[1fr_1fr_auto] gap-2 px-1 text-xs font-semibold text-muted sm:grid">
                        <span>Sol</span>
                        <span>Sağ (uyğun cavab)</span>
                        <span />
                      </div>
                      {q.pairs.map((p, pi) => (
                        <div
                          key={pi}
                          className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-surface2/40 p-2 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
                        >
                          <div className="space-y-1.5">
                            <MathTextField
                              value={p.left}
                              onChange={(v) => setPair(i, pi, { left: v })}
                              placeholder={`Sol ${pi + 1}`}
                              inputClassName="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-text outline-none focus:border-primary"
                              enableMath={mathEnabled}
                            />
                            <ImagePicker url={p.leftImage} label="" onChange={(u) => setPair(i, pi, { leftImage: u })} />
                          </div>
                          <div className="space-y-1.5">
                            <MathTextField
                              value={p.right}
                              onChange={(v) => setPair(i, pi, { right: v })}
                              placeholder={`Sağ ${pi + 1}`}
                              inputClassName="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-text outline-none focus:border-primary"
                              enableMath={mathEnabled}
                            />
                            <ImagePicker url={p.rightImage} label="" onChange={(u) => setPair(i, pi, { rightImage: u })} />
                          </div>
                          <div className="flex items-center gap-1 self-start">
                            {q.pairs.length > 1 && (
                              <Reorder
                                label="Cütü"
                                onUp={() => movePair(i, pi, -1)}
                                onDown={() => movePair(i, pi, 1)}
                                upDisabled={pi === 0}
                                downDisabled={pi === q.pairs.length - 1}
                              />
                            )}
                            {q.pairs.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removePair(i, pi)}
                                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-danger/12 hover:text-danger"
                                aria-label="Cütü sil"
                              >
                                <FiX />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addPair(i)}
                        className="flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-semibold text-muted transition-colors hover:text-primary"
                      >
                        <FiPlus className="text-base" /> Cüt əlavə et
                      </button>
                      <p className="text-xs text-muted">
                        İmtahanda sağ sütun qarışdırılır. Sağ cavablar fərqli olmalıdır.
                      </p>
                    </div>
                  )}

                  {/* Optional explanation (only when the İzah feature is on). */}
                  {explEnabled && (
                    <div className="mt-3">
                      <MathTextField
                        value={q.explanation}
                        onChange={(v) => patch(i, (qq) => ({ ...qq, explanation: v }))}
                        multiline
                        rows={2}
                        placeholder="İzah (ixtiyari) — tələbə nəticələrdə görəcək..."
                        inputClassName={`${taClass} text-sm`}
                        enableMath={mathEnabled}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Page navigation (only when paging is active). */}
            {perPage !== "all" && pageCount > 1 && (
              <div className="flex items-center justify-center gap-3 py-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className={toolBtn}
                  aria-label="Əvvəlki səhifə"
                >
                  <FiChevronLeft />
                </button>
                <span className="text-sm font-semibold text-text">
                  Səhifə {safePage + 1} / {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={safePage >= pageCount - 1}
                  className={toolBtn}
                  aria-label="Növbəti səhifə"
                >
                  <FiChevronRight />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={addQuestionRow}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-3 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
            >
              <FiPlus /> Sual əlavə et
            </button>
          </div>

          {/* Bottom save — mobile only (desktop saves from the sidebar, so the
              column bottoms line up). */}
          <div className="shrink-0 border-t border-line bg-surface p-3 lg:hidden">
            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? <Spinner /> : `Sualları yadda saxla (${questions.length})`}
            </Button>
          </div>
        </form>

        {/* Right: tools sidebar (fills the right margin on desktop). */}
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-line bg-surface lg:block">
          {renderTools(true)}
        </aside>
      </div>

      {/* Crop a figure out of the imported PDF (client-side, no AI tokens). */}
      {cropFor != null && (
        <PdfCropper
          file={aiPdfFile}
          onClose={() => setCropFor(null)}
          onCrop={async (f) => {
            const idx = cropFor;
            try {
              const url = await uploadImage(f);
              patch(idx, (qq) => ({ ...qq, image: url }));
              setCropFor(null);
              toast.success("Şəkil əlavə edildi");
            } catch (err) {
              toast.error(err?.message || "Şəkil yüklənmədi");
            }
          }}
        />
      )}

      {/* AI extraction cost ledger. */}
      {aiLogOpen && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setAiLogOpen(false)}
          />
          <div className="relative flex max-h-[80vh] w-full max-w-md animate-scale-in flex-col rounded-3xl border border-line bg-surface p-6 shadow-lift">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-text">AI çıxarış xərcləri</h2>
              <button
                type="button"
                onClick={() => setAiLogOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
                aria-label="Bağla"
              >
                <FiX />
              </button>
            </div>
            <div className="mb-3 rounded-2xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-center">
              <p className="text-2xl font-bold tabular-nums text-text">${aiTotal.toFixed(4)}</p>
              <p className="text-xs text-muted">{aiSpend.length} idxal · ümumi xərc (bu brauzer)</p>
            </div>
            <div className="scrollbar-thin -mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-[11px] uppercase tracking-wide text-muted">
                    <th className="py-1 text-left font-semibold">Tarix</th>
                    <th className="py-1 text-right font-semibold">Sual</th>
                    <th className="py-1 text-right font-semibold">Token</th>
                    <th className="py-1 text-right font-semibold">Məbləğ</th>
                  </tr>
                </thead>
                <tbody>
                  {aiSpend.map((e, k) => (
                    <tr key={k} className="border-t border-line">
                      <td className="py-1.5 text-muted">{new Date(e.at).toLocaleString()}</td>
                      <td className="py-1.5 text-right tabular-nums">{e.questions}</td>
                      <td className="py-1.5 text-right tabular-nums text-muted">{fmtTokens(e.tokens)}</td>
                      <td className="py-1.5 text-right font-semibold tabular-nums text-text">
                        ${(e.usd || 0).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={clearSpend}
                className="text-xs font-semibold text-muted transition-colors hover:text-danger"
              >
                Tarixçəni təmizlə
              </button>
              <button
                type="button"
                onClick={() => setAiLogOpen(false)}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
              >
                Bağla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview-as-student — mirrors the real exam runner (map + progress +
          stats + pager) so the teacher sees exactly what students will. */}
      {preview &&
        (() => {
          const pvTotal = questions.length;
          const pvSize = perPage === "all" ? Math.max(1, pvTotal) : Number(perPage);
          const pvCount = Math.max(1, Math.ceil(Math.max(1, pvTotal) / pvSize));
          const pvSafe = Math.min(Math.max(0, previewPage), pvCount - 1);
          const pvRange =
            perPage === "all" ? null : { start: pvSafe * pvSize, end: pvSafe * pvSize + pvSize };
          const answered = previewAnswers.slice(0, pvTotal).filter(hasAnswer).length;
          const flagged = previewMarked.slice(0, pvTotal).filter(Boolean).length;
          const remaining = Math.max(0, pvTotal - answered);
          const firstBlank = previewAnswers.slice(0, pvTotal).findIndex((a) => !hasAnswer(a));
          const isLast = pvSafe >= pvCount - 1;
          const close = () => setPreview(false);

          return (
            <div className="fixed inset-0 z-[1400] flex flex-col overflow-hidden bg-bg">
              <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-4 py-3 sm:px-6">
                <div className="min-w-0">
                  {examName && (
                    <p className="mb-0.5 truncate text-xs font-medium text-muted">{examName}</p>
                  )}
                  <div className="flex items-center gap-2 font-display text-xl font-bold text-text sm:text-2xl">
                    <FiClock className="text-primary" /> --:--
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                    <FiEye /> Önizləmə
                  </span>
                  <button
                    type="button"
                    onClick={close}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary"
                  >
                    <FiX /> Bağla
                  </button>
                </div>
              </header>

              <div className="flex min-h-0 flex-1 gap-3 p-3 sm:gap-4 sm:p-4 lg:p-5">
                {/* LEFT: answered progress + question map. */}
                <aside className="hidden w-72 shrink-0 flex-col gap-3 lg:flex">
                  <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
                    <div className="flex items-center gap-3">
                      <PreviewRing value={answered} total={pvTotal} />
                      <div className="min-w-0">
                        <p className="text-2xl font-bold tabular-nums leading-none text-text">
                          {answered}
                          <span className="text-base font-semibold text-muted">/{pvTotal}</span>
                        </p>
                        <p className="mt-1 text-xs text-muted">cavablandırılıb</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-line bg-surface p-4 shadow-soft">
                    <QuestionMap
                      total={pvTotal}
                      answers={previewAnswers}
                      marked={previewMarked}
                      activeRange={pvRange}
                      onJump={previewJump}
                      onFinish={close}
                    />
                  </div>
                </aside>

                {/* CENTER: the current page + pager. */}
                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
                  {perPage !== "all" && (
                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-surface2/40 px-4 py-2.5 sm:px-6">
                      <span className="text-sm font-bold text-text">
                        {pvRange.end - pvRange.start > 1
                          ? `Suallar ${pvRange.start + 1}–${Math.min(pvRange.end, pvTotal)}`
                          : `Sual ${pvRange.start + 1}`}
                      </span>
                      <span className="rounded-lg bg-surface px-2 py-0.5 text-xs font-semibold text-muted">
                        Səhifə {pvSafe + 1} / {pvCount}
                      </span>
                    </div>
                  )}
                  <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                    <div className="mx-auto w-full max-w-2xl">
                      <QuestionType
                        answers={previewAnswers}
                        questions={buildPreviewDefs()}
                        handleAnswerChange={previewChange}
                        marked={previewMarked}
                        onToggleMark={previewToggleMark}
                        range={pvRange}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 border-t border-line p-3 sm:p-4">
                    <div className="mx-auto w-full max-w-2xl">
                      {perPage !== "all" ? (
                        <div className="flex items-center justify-between gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
                            disabled={pvSafe <= 0}
                          >
                            ← Əvvəlki
                          </Button>
                          <span className="hidden text-sm font-semibold text-muted sm:block">
                            {pvSafe + 1} / {pvCount}
                          </span>
                          {isLast ? (
                            <Button
                              type="button"
                              onClick={close}
                              className="bg-success text-white hover:brightness-105"
                            >
                              İmtahanı bitir <FiCheckCircle />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              onClick={() => setPreviewPage((p) => Math.min(pvCount - 1, p + 1))}
                            >
                              Növbəti →
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          type="button"
                          onClick={close}
                          size="lg"
                          className="w-full bg-success text-white hover:brightness-105"
                        >
                          İmtahanı bitir <FiCheckCircle />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT: at-a-glance stats + tips (wide screens). */}
                <aside className="hidden w-60 shrink-0 flex-col gap-3 xl:flex">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-line bg-surface p-2.5 text-center shadow-soft">
                      <p className="text-lg font-bold tabular-nums text-success">{answered}</p>
                      <p className="text-[10px] text-muted">Cavablı</p>
                    </div>
                    <div className="rounded-xl border border-line bg-surface p-2.5 text-center shadow-soft">
                      <p className="text-lg font-bold tabular-nums text-text">{remaining}</p>
                      <p className="text-[10px] text-muted">Qalıb</p>
                    </div>
                    <div className="rounded-xl border border-line bg-surface p-2.5 text-center shadow-soft">
                      <p className="text-lg font-bold tabular-nums text-warning">{flagged}</p>
                      <p className="text-[10px] text-muted">İşarəli</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => firstBlank >= 0 && previewJump(firstBlank)}
                    disabled={firstBlank < 0}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
                  >
                    <FiZap /> Növbəti cavabsız
                  </button>
                  <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                      <FiInfo /> Önizləmə
                    </p>
                    <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted">
                      <li>• Tələbə imtahanı tam belə görəcək.</li>
                      <li>• Sualları sınaq üçün cavablandıra bilərsiniz.</li>
                      <li>• Cavablar saxlanılmır — bu yalnız önizlədir.</li>
                    </ul>
                  </div>
                </aside>
              </div>
            </div>
          );
        })()}
    </div>
  );
};

export default StructuredBuilder;
