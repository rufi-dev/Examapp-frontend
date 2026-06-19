import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { addQuestion, getExam } from "../../../redux/features/quiz/quizSlice";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import Spinner from "../../components/Spinner";
import Button from "../../components/ui/Button";
import { inputClass } from "../../components/ui/Field";
import { FormulaField } from "../../components/MathEditor";
import QuestionType from "../../components/QuestionType";
import { uploadImage } from "../../helper/cloudinary";
import {
  FiPlus,
  FiX,
  FiImage,
  FiCopy,
  FiChevronUp,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiRotateCcw,
  FiRotateCw,
  FiSave,
} from "react-icons/fi";
import { questionPoints } from "../../helper/helper";

const norm = (v) => String(v ?? "").trim();

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
      (q.choices || []).some((c) => norm(c.latex)) ||
      (q.pairs || []).some((p) => norm(p.leftLatex) || norm(p.rightLatex))
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
  const [examName, setExamName] = useState("");
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
  // Builder feature toggles (clean UI for non-math exams): formula buttons and
  // explanation fields only appear when enabled.
  const [mathEnabled, setMathEnabled] = useState(false);
  const [explEnabled, setExplEnabled] = useState(false);
  // Display paging: how many questions per page (default all).
  const [perPage, setPerPage] = useState("all");
  const [page, setPage] = useState(0);

  // Autosave / dirty tracking.
  const draftKey = `structDraft_${examId}`;
  // Builder UI preferences (which feature panels are shown) persist separately
  // from the content draft, so toggling them never marks the exam "unsaved".
  const prefsKey = `structPrefs_${examId}`;
  const loadedRef = useRef(false);
  const serverQsRef = useRef(null);
  const savedJsonRef = useRef(""); // JSON of the last server-saved questions
  const dirty = JSON.stringify(questions) !== savedJsonRef.current;

  // Pre-load existing structured questions so editing is non-destructive.
  useEffect(() => {
    const fetchData = async () => {
      let serverQs = [newQuestion()];
      try {
        const examAction = await dispatch(getExam(examId));
        const exam = examAction?.payload;
        if (exam?.name) setExamName(exam.name);
        const existing = exam?.questions?.correctAnswers;
        const isStructured =
          Array.isArray(existing) &&
          existing.some((q) => Array.isArray(q.choices) || Array.isArray(q.pairs) || q.text);
        if (isStructured) {
          serverQs = existing.map((q) => ({
            type: q.type || "Cm",
            text: q.text || "",
            image: q.image || "",
            latex: q.latex || "",
            choices:
              Array.isArray(q.choices) && q.choices.length
                ? q.choices.map((c) => ({
                    text: c.text || "",
                    image: c.image || "",
                    latex: c.latex || "",
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
                    left: p.left || "",
                    leftImage: p.leftImage || "",
                    leftLatex: p.leftLatex || "",
                    right: p.right || "",
                    rightImage: p.rightImage || "",
                    rightLatex: p.rightLatex || "",
                  }))
                : [emptyPair(), emptyPair()],
            explanation: q.explanation || "",
          }));
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
      await dispatch(addQuestion({ examId, questionData: { correctAnswers } })).unwrap();
      savedJsonRef.current = JSON.stringify(questions);
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
      navigate(-1);
    } catch {
      // error toast shown by the slice's rejected case
    } finally {
      setLoading(false);
    }
  };

  const points = questionPoints(questions.length);
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

        <div className="space-y-1.5 border-t border-line pt-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Səhifədə sual sayı</span>
          <Dropdown value={perPage} options={PAGE_OPTIONS} onChange={setPageCount} />
        </div>

        <div className="border-t border-line pt-3 text-xs text-muted">{total} sual · 100 bal</div>
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

      <div className="relative flex min-h-0 flex-1">
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg/70 backdrop-blur-sm">
            <Spinner size={46} className="text-primary" />
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

                  {/* Question stem: text + image (+ formula when enabled) */}
                  <textarea
                    value={q.text}
                    onChange={(e) => patch(i, (qq) => ({ ...qq, text: e.target.value }))}
                    rows={2}
                    placeholder="Sual mətni..."
                    className={`${taClass} mb-2`}
                  />
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start">
                    <ImagePicker url={q.image} onChange={(u) => patch(i, (qq) => ({ ...qq, image: u }))} />
                    {mathEnabled && (
                      <FormulaField value={q.latex} onChange={(v) => patch(i, (qq) => ({ ...qq, latex: v }))} />
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
                            <div className="flex items-center gap-2">
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
                              <input
                                value={c.text}
                                onChange={(e) => setChoice(i, ci, { text: e.target.value })}
                                placeholder={`Variant ${String.fromCharCode(65 + ci)}`}
                                className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
                              />
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
                            {mathEnabled && (
                              <div className="mt-1.5 pl-9">
                                <FormulaField value={c.latex} onChange={(v) => setChoice(i, ci, { latex: v })} />
                              </div>
                            )}
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
                            <input
                              value={p.left}
                              onChange={(e) => setPair(i, pi, { left: e.target.value })}
                              placeholder={`Sol ${pi + 1}`}
                              className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-text outline-none focus:border-primary"
                            />
                            <div className="flex items-start gap-2">
                              <ImagePicker url={p.leftImage} label="" onChange={(u) => setPair(i, pi, { leftImage: u })} />
                              {mathEnabled && (
                                <FormulaField value={p.leftLatex} onChange={(v) => setPair(i, pi, { leftLatex: v })} />
                              )}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <input
                              value={p.right}
                              onChange={(e) => setPair(i, pi, { right: e.target.value })}
                              placeholder={`Sağ ${pi + 1}`}
                              className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-text outline-none focus:border-primary"
                            />
                            <div className="flex items-start gap-2">
                              <ImagePicker url={p.rightImage} label="" onChange={(u) => setPair(i, pi, { rightImage: u })} />
                              {mathEnabled && (
                                <FormulaField value={p.rightLatex} onChange={(v) => setPair(i, pi, { rightLatex: v })} />
                              )}
                            </div>
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
                    <textarea
                      value={q.explanation}
                      onChange={(e) => patch(i, (qq) => ({ ...qq, explanation: e.target.value }))}
                      rows={2}
                      placeholder="İzah (ixtiyari) — tələbə nəticələrdə görəcək..."
                      className={`${taClass} mt-3 text-sm`}
                    />
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

      {/* Preview-as-student. */}
      {preview && (
        <div className="fixed inset-0 z-[1400] flex flex-col bg-bg">
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <h2 className="truncate font-display text-lg font-bold text-text">Önizləmə</h2>
              <p className="text-xs text-muted">Tələbə imtahanı belə görəcək (cavablar gizlidir).</p>
            </div>
            <button
              type="button"
              onClick={() => setPreview(false)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary"
            >
              <FiX /> Bağla
            </button>
          </header>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto w-full max-w-2xl">
              <QuestionType answers={previewAnswers} questions={buildPreviewDefs()} handleAnswerChange={previewChange} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StructuredBuilder;
