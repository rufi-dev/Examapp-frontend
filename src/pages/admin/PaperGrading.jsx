import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiCamera,
  FiImage,
  FiX,
  FiCheck,
  FiMinus,
  FiAlertTriangle,
  FiSearch,
  FiUser,
  FiUsers,
  FiTrash2,
  FiSave,
  FiEdit3,
  FiBarChart2,
  FiZap,
  FiKey,
} from "react-icons/fi";
import AccountLayout from "../../components/AccountLayout";
import Button from "../../components/ui/Button";
import Spinner from "../../components/Spinner";
import ZoomableImage from "../../components/ZoomableImage";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import CameraCapture, { normalizeImageBlob } from "../../components/CameraCapture";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { uploadImage } from "../../helper/cloudinary";
import {
  fetchPaperSheet,
  readPaperSheet,
  previewPaperScore,
  savePaperResult,
  deletePaperResult,
  apiError,
} from "../../helper/paperApi";

/*
 * Paper exam grading workspace.
 *
 * Students write the exam in class on answer cards. For each sheet the teacher:
 *   1. photographs it (one or more pages) or picks photos from the gallery,
 *   2. lets the AI read what the student marked — or fills it in by hand,
 *   3. reviews the answer sheet against the key, corrects any misread answer,
 *      assigns the student and saves.
 * The score is always computed by the server (same scoring as online exams); the
 * number shown while editing is a live server preview.
 */

const MAX_PAGES = 6;
const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const TYPE_LABEL = {
  Cm: "Qapalı",
  Co: "Açıq",
  Cd: "Yazılı həll",
  Cmu: "Uyğunluq",
  Cs: "Çoxseçimli",
  Cma: "Uyğunlaşdırma",
};
const STEPS = [
  { id: "capture", label: "Vərəq" },
  { id: "reading", label: "Oxunuş" },
  { id: "review", label: "Yoxla və saxla" },
];

const optionsOf = (q) =>
  (Array.isArray(q.options) && q.options.length ? q.options : ["a", "b", "c", "d", "e"]).map((o) =>
    String(o).toLowerCase()
  );
const openNorm = (v) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const blankAnswer = (q) => (q.type === "Cmu" ? {} : "");
const isMap = (v) => !!v && typeof v === "object" && !Array.isArray(v);

const isBlank = (q, a) =>
  q.type === "Cmu"
    ? !isMap(a) || !Object.values(a).some((row) => Array.isArray(row) && row.length)
    : String(a ?? "").trim() === "";

// Client-side mirror of the server's per-question check — only for the ✓/✗ marks
// while editing. The score itself always comes from the server.
function isRight(q, a) {
  if (isBlank(q, a)) return false;
  if (q.type === "Cmu") {
    const rows = Array.isArray(q.key) ? q.key : [];
    if (!rows.length) return false;
    return rows.every((row, k) => {
      const want = (Array.isArray(row) ? row : []).map(Number).sort((x, y) => x - y);
      const got = (Array.isArray(a[k]) ? a[k] : []).map(Number).sort((x, y) => x - y);
      return want.length === got.length && want.every((v, j) => v === got[j]);
    });
  }
  if (q.type === "Cm") return openNorm(a) === openNorm(q.answer);
  // Handwriting spacing doesn't matter ("2 + x" = "2+x") — same rule the server
  // applies to paper sheets.
  const compact = (v) => String(v ?? "").toLowerCase().replace(/\s+/g, "");
  const accepted = (Array.isArray(q.answers) && q.answers.length ? q.answers : [q.answer])
    .map(compact)
    .filter(Boolean);
  return accepted.includes(compact(a));
}
const rowState = (q, a) => (isBlank(q, a) ? "blank" : isRight(q, a) ? "right" : "wrong");

function correctLabel(q) {
  if (q.type === "Cm") return String(q.answer || "—").toUpperCase();
  if (q.type === "Cmu") {
    return (Array.isArray(q.key) ? q.key : [])
      .map((row, k) => `${k + 1}: ${(Array.isArray(row) ? row : []).map((i) => LETTERS[i]).join(",") || "—"}`)
      .join(" · ");
  }
  const acc = (Array.isArray(q.answers) && q.answers.length ? q.answers : [q.answer]).filter(Boolean);
  return acc.length ? acc.join(" / ") : "—";
}

const initials = (name = "") =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0] || "")
    .join("")
    .toUpperCase() || "?";

const nameKey = (s) =>
  String(s || "")
    .toLocaleLowerCase("az")
    .replace(/[^\p{L}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

// Match the name the AI read off the sheet to exactly one roster student. Only a
// full match or a two-word overlap counts, and a tie picks nobody — a wrong
// automatic assignment is worse than asking.
function matchStudent(students, written) {
  const w = nameKey(written);
  if (w.length < 3) return null;
  const parts = w.split(" ").filter((p) => p.length >= 3);
  const scored = students
    .map((s) => {
      const n = nameKey(s.name);
      if (!n) return { s, score: 0 };
      if (n === w) return { s, score: 3 };
      const words = n.split(" ");
      const hits = parts.filter((p) => words.includes(p)).length;
      return { s, score: hits >= 2 ? 2 : 0 };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  if (scored.length > 1 && scored[0].score === scored[1].score) return null;
  return scored[0].s;
}

const Avatar = ({ s, size = "h-9 w-9" }) =>
  s?.photo ? (
    <img src={s.photo} alt="" className={`${size} shrink-0 rounded-full border border-line object-cover`} />
  ) : (
    <span
      className={`${size} grid shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-bold text-primary`}
    >
      {initials(s?.name)}
    </span>
  );

const Stepper = ({ phase }) => {
  const idx = STEPS.findIndex((s) => s.id === phase);
  return (
    <ol className="flex items-center gap-1.5 sm:gap-2">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const now = i === idx;
        return (
          <li key={s.id} className="flex items-center gap-1.5 sm:gap-2">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors ${
                done ? "bg-success/15 text-success" : now ? "bg-primary text-primary-fg" : "bg-surface2 text-muted"
              }`}
            >
              {done ? <FiCheck /> : i + 1}
            </span>
            <span className={`hidden text-sm sm:inline ${now ? "font-bold text-text" : "text-muted"}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-line sm:w-8" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
};

// What is actually happening while the AI reads. One request returns one answer,
// so the step timing is a paced estimate; the elapsed counter is real.
const READ_STEPS = ["Şəkillər hazırlanır", "Vərəqdəki işarələr oxunur", "Cavablar açarla uyğunlaşdırılır"];
const ReadingPanel = ({ startedAt, photos }) => {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs(Math.round((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  const step = secs < 4 ? 0 : secs < 20 ? 1 : 2;
  return (
    <div className="mx-auto max-w-md py-8">
      <div className="mb-6 flex justify-center -space-x-6">
        {photos.slice(0, 3).map((p, i) => (
          <img
            key={p.id}
            src={p.url || p.preview}
            alt=""
            className="h-24 w-[4.5rem] rounded-xl border-2 border-surface object-cover shadow-soft"
            style={{ transform: `rotate(${(i - 1) * 6}deg)` }}
          />
        ))}
      </div>
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-surface2">
        <div className="h-full w-full animate-pulse rounded-full bg-primary/70" />
      </div>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <p className="font-display text-lg font-bold text-text">AI vərəqi oxuyur…</p>
        <span className="rounded-lg bg-surface2 px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-muted">
          {String(Math.floor(secs / 60)).padStart(2, "0")}:{String(secs % 60).padStart(2, "0")}
        </span>
      </div>
      <ol className="space-y-2.5">
        {READ_STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2.5 text-sm">
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                i < step
                  ? "bg-success/15 text-success"
                  : i === step
                    ? "bg-primary text-primary-fg"
                    : "bg-surface2 text-muted"
              }`}
            >
              {i < step ? <FiCheck /> : i + 1}
            </span>
            <span className={i === step ? "font-semibold text-text" : "text-muted"}>{label}</span>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-center text-xs text-muted">Adətən 20–60 saniyə çəkir. Səhifəni bağlamayın.</p>
    </div>
  );
};

const ChoiceEditor = ({ q, value, state, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {optionsOf(q).map((o) => {
      const on = String(value ?? "").trim().toLowerCase() === o;
      return (
        <button
          key={o}
          type="button"
          aria-pressed={on}
          onClick={() => onChange(on ? "" : o)}
          className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-bold uppercase transition-colors ${
            on
              ? state === "right"
                ? "bg-success text-white shadow-soft"
                : "bg-danger text-white shadow-soft"
              : "border border-line bg-surface text-muted hover:border-primary/50 hover:text-text"
          }`}
        >
          {o}
        </button>
      );
    })}
  </div>
);

const MatchEditor = ({ q, value, onChange }) => {
  const n = Number(q.leftCount) || 0;
  const m = Number(q.rightCount) || 0;
  const map = isMap(value) ? value : {};
  const toggle = (k, j) => {
    const row = new Set(Array.isArray(map[k]) ? map[k] : []);
    if (row.has(j)) row.delete(j);
    else row.add(j);
    const next = { ...map };
    const arr = [...row].sort((a, b) => a - b);
    if (arr.length) next[k] = arr;
    else delete next[k];
    onChange(next);
  };
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1">
        <thead>
          <tr>
            <th aria-hidden />
            {Array.from({ length: m }, (_, j) => (
              <th key={j} className="w-8 text-center text-xs font-bold uppercase text-muted">
                {LETTERS[j]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: n }, (_, k) => (
            <tr key={k}>
              <td className="pr-1 text-right text-xs font-bold tabular-nums text-muted">{k + 1}</td>
              {Array.from({ length: m }, (_, j) => {
                const on = Array.isArray(map[k]) && map[k].includes(j);
                return (
                  <td key={j}>
                    <button
                      type="button"
                      aria-pressed={on}
                      aria-label={`${k + 1}${LETTERS[j]}`}
                      onClick={() => toggle(k, j)}
                      className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-bold transition-colors ${
                        on
                          ? "bg-primary text-primary-fg"
                          : "border border-line bg-surface text-muted hover:border-primary/50"
                      }`}
                    >
                      {on ? <FiCheck /> : null}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SheetRow = ({ index, q, value, ai, edited, onChange }) => {
  const state = rowState(q, value);
  const flagged = !!ai && ai.confidence !== "high" && !edited;
  const tone = flagged
    ? "border-warning/50 bg-warning/[0.07]"
    : state === "right"
      ? "border-success/25 bg-success/[0.05]"
      : state === "wrong"
        ? "border-danger/25 bg-danger/[0.05]"
        : "border-line bg-surface";
  return (
    <div className={`rounded-2xl border p-3 transition-colors sm:p-3.5 ${tone}`}>
      <div className="flex items-start gap-3">
        <span className="mt-1 w-7 shrink-0 text-center font-display text-base font-extrabold tabular-nums text-text">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-surface2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
              {TYPE_LABEL[q.type] || q.type}
            </span>
            {flagged && (
              <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning">
                <FiAlertTriangle /> Yoxla{ai.note ? ` · ${ai.note}` : ""}
              </span>
            )}
            {edited && (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                <FiEdit3 /> Düzəliş edilib
              </span>
            )}
          </div>
          {q.type === "Cm" ? (
            <ChoiceEditor q={q} value={value} state={state} onChange={onChange} />
          ) : q.type === "Cmu" ? (
            <MatchEditor q={q} value={value} onChange={onChange} />
          ) : (
            <input
              value={typeof value === "string" ? value : ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Şagirdin cavabı"
              className="h-10 w-full max-w-sm rounded-xl border border-line bg-surface px-3 text-sm text-text outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-ring/25"
            />
          )}
          <p className="mt-2 text-xs text-muted">
            Düzgün cavab: <span className="font-semibold text-text">{correctLabel(q)}</span>
          </p>
        </div>
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
            state === "right"
              ? "bg-success text-white"
              : state === "wrong"
                ? "bg-danger text-white"
                : "bg-surface2 text-muted"
          }`}
          aria-label={state === "right" ? "Doğru" : state === "wrong" ? "Səhv" : "Boş"}
        >
          {state === "right" ? <FiCheck /> : state === "wrong" ? <FiX /> : <FiMinus />}
        </span>
      </div>
    </div>
  );
};

const PaperGrading = () => {
  useRedirectLoggedOutUser("/login");
  const { examId } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [rosterFilter, setRosterFilter] = useState("all"); // all | pending | graded
  const [studentId, setStudentId] = useState("");
  const [photos, setPhotos] = useState([]); // { id, preview, url, status, blob }
  const [phase, setPhase] = useState("capture"); // capture | reading | review
  const [answers, setAnswers] = useState([]);
  const [ai, setAi] = useState(null); // [{ answer, confidence, note }] from the last AI read
  const [edited, setEdited] = useState(() => new Set());
  const [dirty, setDirty] = useState(false);
  const [sheetName, setSheetName] = useState("");
  const [camOpen, setCamOpen] = useState(false);
  const [readStartedAt, setReadStartedAt] = useState(0);
  const [preview, setPreview] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sheetFilter, setSheetFilter] = useState("all"); // all | flagged | wrong
  const [activePage, setActivePage] = useState(0);
  const galleryRef = useRef(null);
  const pagesRef = useRef(0);
  const blobUrls = useRef(new Set());
  const preselected = useRef(false);

  const load = useCallback(async () => {
    try {
      const d = await fetchPaperSheet(examId);
      setData(d);
      setLoadError("");
    } catch (e) {
      setLoadError(apiError(e, "Məlumat yüklənmədi"));
    }
  }, [examId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    pagesRef.current = photos.length;
  }, [photos.length]);

  // Free local previews when leaving the page.
  useEffect(() => {
    const urls = blobUrls.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  // Unsaved sheet → warn before the tab is closed/reloaded.
  useEffect(() => {
    if (!dirty) return undefined;
    const onLeave = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const key = useMemo(() => data?.key || [], [data]);
  const results = useMemo(() => data?.results || [], [data]);
  const resultByStudent = useMemo(() => {
    const m = new Map();
    results.forEach((r) => m.set(String(r.userId), r));
    return m;
  }, [results]);

  // Class roster, plus anyone graded who has since left the class (their sheet
  // stays reviewable).
  const roster = useMemo(() => {
    const list = (data?.students || []).map((s) => ({ ...s, inClass: true }));
    const ids = new Set(list.map((s) => String(s._id)));
    results.forEach((r) => {
      if (r.student && !ids.has(String(r.userId))) list.push({ ...r.student, inClass: false });
    });
    return list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "az"));
  }, [data, results]);

  const selected = roster.find((s) => String(s._id) === String(studentId)) || null;
  const selectedResult = studentId ? resultByStudent.get(String(studentId)) || null : null;
  const inClass = roster.filter((s) => s.inClass);
  const gradedInClass = inClass.filter((s) => resultByStudent.has(String(s._id))).length;
  const scoreTotal =
    data?.exam?.preset && Number(data?.exam?.totalMarks) ? Number(data.exam.totalMarks) : 100;
  const average = results.length
    ? Math.round((results.reduce((s, r) => s + (Number(r.earnPoints) || 0), 0) / results.length) * 10) / 10
    : null;

  const donePhotos = photos.filter((p) => p.status === "done" && p.url);
  const uploading = photos.some((p) => p.status === "uploading");

  const resetSheet = useCallback(() => {
    setPhotos((prev) => {
      prev.forEach((p) => {
        if (p.preview && p.preview.startsWith("blob:")) {
          URL.revokeObjectURL(p.preview);
          blobUrls.current.delete(p.preview);
        }
      });
      return [];
    });
    pagesRef.current = 0;
    setAnswers([]);
    setAi(null);
    setEdited(new Set());
    setSheetName("");
    setPreview(null);
    setSheetFilter("all");
    setActivePage(0);
    setDirty(false);
    setPhase("capture");
  }, []);

  // Open an already-graded sheet for review/correction.
  const openResult = useCallback(
    (r) => {
      setPhotos((r.sheetPhotos || []).map((url, i) => ({ id: `saved-${i}`, url, preview: url, status: "done" })));
      setAnswers(
        key.map((q, i) => {
          const a = r.selectedAnswers?.[i]?.answer;
          if (q.type === "Cmu") return isMap(a) ? a : {};
          return a == null ? "" : String(a);
        })
      );
      setAi(null); // already reviewed by the teacher — no re-flagging
      setEdited(new Set());
      setSheetName("");
      setSheetFilter("all");
      setActivePage(0);
      setDirty(false);
      setPhase("review");
    },
    [key]
  );

  // Deep link (?student=…) from the results page opens that student's sheet.
  useEffect(() => {
    if (!data || preselected.current) return;
    preselected.current = true;
    const sid = params.get("student");
    if (!sid) return;
    if (roster.some((s) => String(s._id) === sid)) {
      setStudentId(sid);
      const r = resultByStudent.get(sid);
      if (r) openResult(r);
    }
  }, [data, params, roster, resultByStudent, openResult]);

  const selectStudent = (s) => {
    const id = String(s._id);
    if (id === String(studentId)) return;
    const existing = resultByStudent.get(id);
    // A sheet is in progress: just assign it to this student.
    if (dirty) {
      setStudentId(id);
      if (existing) toast.info("Bu şagird artıq yoxlanılıb — yadda saxlasanız nəticəsi yenilənəcək.");
      return;
    }
    setStudentId(id);
    if (existing) openResult(existing);
    else resetSheet();
  };

  const uploadPhoto = async (id, blob) => {
    try {
      const file = await normalizeImageBlob(blob, { prefix: "sheet", max: 2400 });
      const url = await uploadImage(file);
      setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, url, status: "done", blob: undefined } : p)));
    } catch (e) {
      setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, status: "error" } : p)));
      toast.error(apiError(e, "Şəkil yüklənmədi"));
    }
  };

  const addBlob = (blob) => {
    if (!blob) return;
    if (pagesRef.current >= MAX_PAGES) {
      toast.info(`Bir vərəq üçün ən çox ${MAX_PAGES} şəkil əlavə etmək olar`);
      return;
    }
    pagesRef.current += 1;
    const id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const previewUrl = URL.createObjectURL(blob);
    blobUrls.current.add(previewUrl);
    setDirty(true);
    setPhotos((prev) => [...prev, { id, preview: previewUrl, url: "", status: "uploading", blob }]);
    uploadPhoto(id, blob);
  };

  const retryPhoto = (p) => {
    if (!p.blob) return;
    setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: "uploading" } : x)));
    uploadPhoto(p.id, p.blob);
  };

  const removePhoto = (id) => {
    setPhotos((prev) => {
      const p = prev.find((x) => x.id === id);
      if (p?.preview?.startsWith("blob:")) {
        URL.revokeObjectURL(p.preview);
        blobUrls.current.delete(p.preview);
      }
      return prev.filter((x) => x.id !== id);
    });
    setActivePage(0);
    setDirty(true);
  };

  const onGalleryPick = (e) => {
    const files = Array.from(e.target.files || []).filter((f) => !f.type || f.type.startsWith("image/"));
    e.target.value = "";
    files.forEach(addBlob);
  };

  const runRead = async () => {
    if (!donePhotos.length) return toast.error("Əvvəlcə vərəqin şəklini əlavə edin");
    setPhase("reading");
    setReadStartedAt(Date.now());
    try {
      const res = await readPaperSheet(
        examId,
        donePhotos.map((p) => p.url)
      );
      const list = Array.isArray(res.answers) ? res.answers : [];
      setAnswers(
        key.map((q, i) => {
          const a = list[i]?.answer;
          if (q.type === "Cmu") return isMap(a) ? a : {};
          return a == null ? "" : String(a);
        })
      );
      setAi(
        key.map((q, i) => ({
          answer: list[i]?.answer ?? blankAnswer(q),
          confidence: list[i]?.confidence || "low",
          note: list[i]?.note || "",
        }))
      );
      setEdited(new Set());
      setSheetName(res.studentName || "");
      setSheetFilter("all");
      setActivePage(0);
      setDirty(true);
      if (!studentId && res.studentName) {
        const match = matchStudent(inClass, res.studentName);
        if (match) {
          setStudentId(String(match._id));
          toast.success(`Vərəqdəki ada görə seçildi: ${match.name}`);
        }
      }
      setPhase("review");
    } catch (e) {
      toast.error(apiError(e, "AI vərəqi oxuya bilmədi"));
      setPhase("capture");
    }
  };

  const manualEntry = () => {
    setAnswers(key.map(blankAnswer));
    setAi(null);
    setEdited(new Set());
    setSheetFilter("all");
    setDirty(true);
    setPhase("review");
  };

  const setAnswer = (i, value) => {
    setAnswers((prev) => prev.map((a, idx) => (idx === i ? value : a)));
    setEdited((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      return next;
    });
    setDirty(true);
  };

  // Live server score while correcting (debounced).
  useEffect(() => {
    if (phase !== "review" || !answers.length) return undefined;
    let alive = true;
    setPreviewBusy(true);
    const t = setTimeout(async () => {
      try {
        const p = await previewPaperScore(
          examId,
          answers.map((a) => ({ answer: a }))
        );
        if (alive) setPreview(p);
      } catch {
        /* keep the last score */
      } finally {
        if (alive) setPreviewBusy(false);
      }
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [answers, phase, examId]);

  const save = async () => {
    if (!studentId) return toast.error("Vərəqin hansı şagirdə aid olduğunu seçin");
    if (uploading) return toast.info("Şəkillər hələ yüklənir…");
    setSaving(true);
    try {
      const res = await savePaperResult(examId, {
        studentId,
        answers: answers.map((a) => ({ answer: a })),
        photos: donePhotos.map((p) => p.url),
        aiAnswers: ai ? ai.map((x) => ({ answer: x.answer, confidence: x.confidence })) : undefined,
      });
      const saved = res.result;
      const gradedIds = new Set([...results.map((r) => String(r.userId)), String(saved.userId)]);
      setData((prev) =>
        prev
          ? {
              ...prev,
              results: [saved, ...prev.results.filter((r) => String(r.userId) !== String(saved.userId))],
            }
          : prev
      );
      toast.success(`${saved.student?.name || selected?.name || "Şagird"} — ${saved.earnPoints} bal yadda saxlanıldı`);
      // Straight on to the next ungraded student.
      const next = inClass.find((s) => !gradedIds.has(String(s._id)));
      resetSheet();
      setStudentId(next ? String(next._id) : "");
    } catch (e) {
      toast.error(apiError(e, "Yadda saxlanılmadı"));
    } finally {
      setSaving(false);
    }
  };

  const removeResult = async () => {
    if (!selectedResult) return;
    setDeleting(true);
    try {
      await deletePaperResult(examId, selectedResult._id);
      setData((prev) => ({ ...prev, results: prev.results.filter((r) => r._id !== selectedResult._id) }));
      setConfirmDelete(false);
      resetSheet();
      toast.success("Nəticə silindi");
    } catch (e) {
      toast.error(apiError(e, "Silinmədi"));
    } finally {
      setDeleting(false);
    }
  };

  const stats = useMemo(() => {
    let right = 0;
    let wrong = 0;
    let blank = 0;
    let flagged = 0;
    key.forEach((q, i) => {
      const st = rowState(q, answers[i]);
      if (st === "right") right += 1;
      else if (st === "wrong") wrong += 1;
      else blank += 1;
      const c = ai?.[i]?.confidence;
      if (c && c !== "high" && !edited.has(i)) flagged += 1;
    });
    return { right, wrong, blank, flagged };
  }, [key, answers, ai, edited]);

  if (!data) {
    return (
      <AccountLayout title="Kağız imtahanı yoxlama">
        {loadError ? (
          <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-8 text-center shadow-soft">
            <FiAlertTriangle className="mx-auto mb-3 text-3xl text-danger" />
            <p className="font-display text-lg font-bold text-text">{loadError}</p>
            <Button className="mt-5" onClick={() => navigate(-1)}>
              Geri
            </Button>
          </div>
        ) : (
          <div className="flex justify-center py-24">
            <Spinner size={36} className="text-primary" />
          </div>
        )}
      </AccountLayout>
    );
  }

  const q = query.trim().toLowerCase();
  const filteredRoster = roster.filter((s) => {
    const graded = resultByStudent.has(String(s._id));
    if (rosterFilter === "pending" && (graded || !s.inClass)) return false;
    if (rosterFilter === "graded" && !graded) return false;
    if (!q) return true;
    return String(s.name || "").toLowerCase().includes(q) || String(s.email || "").toLowerCase().includes(q);
  });

  const visibleRows = key
    .map((question, i) => ({ question, i }))
    .filter(({ question, i }) => {
      if (sheetFilter === "flagged") return ai?.[i] && ai[i].confidence !== "high" && !edited.has(i);
      if (sheetFilter === "wrong") return rowState(question, answers[i]) === "wrong";
      return true;
    });

  const tab = (active) =>
    `rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
      active ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
    }`;
  const chip = (active, tone) =>
    `inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
      active ? `${tone} ring-2 ring-offset-1 ring-offset-surface` : tone
    }`;

  const activePhoto = photos[Math.min(activePage, Math.max(0, photos.length - 1))];

  return (
    <AccountLayout
      title="Kağız imtahanı yoxlama"
      subtitle={`${data.exam.name}${data.exam.className ? ` · ${data.exam.className}` : ""}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button to={`/exam/${examId}/addQuestion`} variant="secondary" size="sm">
            <FiKey /> Cavab açarı
          </Button>
          <Button to={`/exam/${examId}/resultsByExam`} variant="secondary" size="sm">
            <FiBarChart2 /> Nəticələr
          </Button>
        </div>
      }
    >
      {/* Progress strip */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Yoxlanılıb</p>
          <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-text">
            {gradedInClass}
            <span className="text-base font-bold text-muted"> / {inClass.length}</span>
          </p>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface2">
            <div
              className="h-full rounded-full bg-success transition-[width] duration-500"
              style={{ width: `${inClass.length ? Math.round((gradedInClass / inClass.length) * 100) : 0}%` }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Orta bal</p>
          <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-text">
            {average ?? "—"}
            <span className="text-base font-bold text-muted"> / {scoreTotal}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Cavab açarı</p>
          <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-text">
            {key.length}
            <span className="text-base font-bold text-muted"> sual</span>
          </p>
        </div>
      </div>

      {!key.length ? (
        <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-line bg-surface p-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/12 text-primary">
            <FiKey className="text-2xl" />
          </span>
          <p className="mt-4 font-display text-xl font-bold text-text">Cavab açarı hələ daxil edilməyib</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
            Vərəqləri yoxlamaq üçün əvvəlcə hər sualın düzgün cavabını daxil edin.
          </p>
          <Button to={`/exam/${examId}/addQuestion`} className="mt-6" size="lg">
            <FiKey /> Cavab açarını daxil et
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
          {/* Roster */}
          <aside className="xl:sticky xl:top-20 xl:self-start">
            <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-soft">
              <div className="border-b border-line p-4">
                <p className="flex items-center gap-2 font-display text-sm font-bold text-text">
                  <FiUsers className="text-primary" /> Şagirdlər
                </p>
                <div className="relative mt-3">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    type="search"
                    placeholder="Ad ilə axtar…"
                    className="h-10 w-full rounded-xl border border-line bg-surface2/40 pl-9 pr-3 text-sm text-text outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-ring/25"
                  />
                </div>
                <div className="mt-3 inline-flex w-full rounded-xl bg-surface2/70 p-1">
                  <button type="button" onClick={() => setRosterFilter("all")} className={`flex-1 ${tab(rosterFilter === "all")}`}>
                    Hamısı
                  </button>
                  <button type="button" onClick={() => setRosterFilter("pending")} className={`flex-1 ${tab(rosterFilter === "pending")}`}>
                    Gözləyir {inClass.length - gradedInClass}
                  </button>
                  <button type="button" onClick={() => setRosterFilter("graded")} className={`flex-1 ${tab(rosterFilter === "graded")}`}>
                    Hazır {results.length}
                  </button>
                </div>
              </div>
              <ul className="scrollbar-thin max-h-72 space-y-0.5 overflow-y-auto p-2 xl:max-h-[calc(100vh-19rem)]">
                {filteredRoster.map((s) => {
                  const r = resultByStudent.get(String(s._id));
                  const on = String(s._id) === String(studentId);
                  return (
                    <li key={s._id}>
                      <button
                        type="button"
                        onClick={() => selectStudent(s)}
                        className={`flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors ${
                          on ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-surface2"
                        }`}
                      >
                        <Avatar s={s} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-text">{s.name || "—"}</span>
                          <span className="block truncate text-[11px] text-muted">
                            {s.inClass ? s.email || "" : "Sinifdə deyil"}
                          </span>
                        </span>
                        {r ? (
                          <span className="shrink-0 rounded-full bg-success/12 px-2 py-0.5 text-xs font-bold tabular-nums text-success">
                            {r.earnPoints}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-surface2 px-2 py-0.5 text-[11px] font-semibold text-muted">
                            Gözləyir
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
                {!filteredRoster.length && (
                  <li className="px-3 py-8 text-center text-sm text-muted">
                    {roster.length ? "Heç kim tapılmadı" : "Sinifdə təsdiqlənmiş şagird yoxdur"}
                  </li>
                )}
              </ul>
            </div>
          </aside>

          {/* Workbench */}
          <section className="min-w-0">
            <div className="rounded-3xl border border-line bg-surface shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
                <Stepper phase={phase} />
                {selected ? (
                  <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-surface2/70 py-1 pl-1 pr-3">
                    <Avatar s={selected} size="h-7 w-7" />
                    <span className="truncate text-sm font-semibold text-text">{selected.name}</span>
                    {selectedResult && (
                      <span className="shrink-0 text-xs font-bold tabular-nums text-success">
                        {selectedResult.earnPoints} bal
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-sm text-muted">Şagird seçilməyib</span>
                )}
              </div>

              <div className="p-4 sm:p-6">
                {phase === "capture" &&
                  (photos.length === 0 ? (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        Array.from(e.dataTransfer.files || [])
                          .filter((f) => f.type.startsWith("image/"))
                          .forEach(addBlob);
                      }}
                      className="rounded-3xl border-2 border-dashed border-line bg-surface2/40 px-6 py-12 text-center"
                    >
                      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-fg shadow-soft">
                        <FiCamera className="text-2xl" />
                      </span>
                      <h3 className="mt-5 font-display text-xl font-extrabold text-text">Cavab vərəqini çəkin</h3>
                      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
                        Vərəqin hamısı kadrda, düz və yaxşı işıqda olsun. Vərəq bir neçə səhifədirsə, hər
                        birini ayrıca çəkin.
                      </p>
                      <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                        <Button size="lg" onClick={() => setCamOpen(true)}>
                          <FiCamera /> Kamera ilə çək
                        </Button>
                        <Button size="lg" variant="secondary" onClick={() => galleryRef.current?.click()}>
                          <FiImage /> Qalereyadan seç
                        </Button>
                      </div>
                      <p className="mt-5 text-xs text-muted">
                        {selected ? (
                          <>
                            Vərəq <b className="text-text">{selected.name}</b> üçün yoxlanılacaq.
                          </>
                        ) : (
                          "Şagirdi indi siyahıdan və ya oxunuşdan sonra seçə bilərsiniz."
                        )}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {photos.map((p, idx) => (
                          <div
                            key={p.id}
                            className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-surface2"
                          >
                            <img src={p.preview || p.url} alt={`Səhifə ${idx + 1}`} className="h-full w-full object-cover" />
                            <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">
                              {idx + 1}
                            </span>
                            {p.status === "uploading" && (
                              <div className="absolute inset-0 grid place-items-center bg-black/35">
                                <Spinner size={26} className="text-white" />
                              </div>
                            )}
                            {p.status === "error" && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 p-2 text-center text-xs font-semibold text-white">
                                <FiAlertTriangle className="text-lg" /> Yüklənmədi
                                {p.blob && (
                                  <button
                                    type="button"
                                    onClick={() => retryPhoto(p)}
                                    className="rounded-lg bg-white/15 px-2.5 py-1 hover:bg-white/25"
                                  >
                                    Yenidən
                                  </button>
                                )}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removePhoto(p.id)}
                              aria-label="Şəkli sil"
                              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-danger"
                            >
                              <FiX />
                            </button>
                          </div>
                        ))}
                        {photos.length < MAX_PAGES && (
                          <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line p-3">
                            <button
                              type="button"
                              onClick={() => setCamOpen(true)}
                              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
                            >
                              <FiCamera /> Çək
                            </button>
                            <button
                              type="button"
                              onClick={() => galleryRef.current?.click()}
                              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-surface2 hover:text-text"
                            >
                              <FiImage /> Qalereya
                            </button>
                            <span className="text-[11px] text-muted">Səhifə əlavə et</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-6 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
                        <button
                          type="button"
                          onClick={resetSheet}
                          className="self-start text-sm font-semibold text-muted transition-colors hover:text-danger"
                        >
                          Vərəqi at
                        </button>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button variant="secondary" onClick={manualEntry} disabled={uploading}>
                            <FiEdit3 /> Əl ilə doldur
                          </Button>
                          <Button size="lg" onClick={runRead} disabled={uploading || !donePhotos.length}>
                            {uploading ? (
                              <>
                                <Spinner size={16} /> Yüklənir…
                              </>
                            ) : (
                              <>
                                <FiZap /> AI ilə oxu
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                {phase === "reading" && <ReadingPanel startedAt={readStartedAt} photos={donePhotos} />}

                {phase === "review" && (
                  <div className="space-y-5">
                    {!selected ? (
                      <div className="flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning/[0.07] p-4 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
                            <FiUser />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-text">Bu vərəq hansı şagirdindir?</p>
                            <p className="truncate text-xs text-muted">
                              {sheetName ? (
                                <>
                                  Vərəqdə yazılıb: <b className="text-text">{sheetName}</b>
                                </>
                              ) : (
                                "Siyahıdan seçin."
                              )}
                            </p>
                          </div>
                        </div>
                        <select
                          value=""
                          onChange={(e) => {
                            const s = roster.find((x) => String(x._id) === e.target.value);
                            if (s) selectStudent(s);
                          }}
                          className="h-11 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-text outline-none focus:border-primary sm:w-64"
                        >
                          <option value="" disabled>
                            Şagird seçin…
                          </option>
                          {inClass.map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.name}
                              {resultByStudent.has(String(s._id)) ? " ✓" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : selectedResult && dirty ? (
                      <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface2/50 px-4 py-3 text-sm text-text">
                        <FiAlertTriangle className="shrink-0 text-warning" />
                        {selected.name} artıq yoxlanılıb ({selectedResult.earnPoints} bal). Yadda saxlasanız nəticə
                        yenilənəcək.
                      </div>
                    ) : null}

                    {/* Score + filters */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex shrink-0 items-center gap-4 rounded-2xl bg-primary px-5 py-3.5 text-primary-fg shadow-soft">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Bal</p>
                          <p className="font-display text-4xl font-extrabold leading-none tabular-nums">
                            {preview ? preview.earnPoints : "—"}
                            <span className="text-base font-bold opacity-75"> / {scoreTotal}</span>
                          </p>
                        </div>
                        {previewBusy && <Spinner size={16} className="text-primary-fg" />}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSheetFilter("all")}
                          className={chip(sheetFilter === "all", "border-line bg-surface text-text ring-primary/40")}
                        >
                          Hamısı · {key.length}
                        </button>
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-success/25 bg-success/[0.07] px-3 py-2 text-sm font-semibold text-success">
                          <FiCheck /> {stats.right}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSheetFilter(sheetFilter === "wrong" ? "all" : "wrong")}
                          className={chip(
                            sheetFilter === "wrong",
                            "border-danger/25 bg-danger/[0.07] text-danger ring-danger/40"
                          )}
                        >
                          <FiX /> {stats.wrong}
                        </button>
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface2/60 px-3 py-2 text-sm font-semibold text-muted">
                          <FiMinus /> {stats.blank}
                        </span>
                        {ai && (
                          <button
                            type="button"
                            onClick={() => setSheetFilter(sheetFilter === "flagged" ? "all" : "flagged")}
                            className={chip(
                              sheetFilter === "flagged",
                              "border-warning/40 bg-warning/[0.08] text-warning ring-warning/40"
                            )}
                          >
                            <FiAlertTriangle /> Yoxlanmalı {stats.flagged}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
                      <div className="order-2 space-y-2.5 lg:order-1">
                        {visibleRows.map(({ question, i }) => (
                          <SheetRow
                            key={i}
                            index={i}
                            q={question}
                            value={answers[i]}
                            ai={ai?.[i]}
                            edited={edited.has(i)}
                            onChange={(v) => setAnswer(i, v)}
                          />
                        ))}
                        {!visibleRows.length && (
                          <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">
                            {sheetFilter === "flagged" ? "Yoxlanmalı sual qalmayıb ✓" : "Səhv cavab yoxdur ✓"}
                          </div>
                        )}
                      </div>

                      {photos.length > 0 && (
                        <div className="order-1 lg:sticky lg:top-20 lg:order-2 lg:self-start">
                          <div className="overflow-hidden rounded-2xl border border-line bg-surface2/40">
                            <div className="flex items-center gap-1.5 overflow-x-auto border-b border-line p-2">
                              {photos.map((p, idx) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setActivePage(idx)}
                                  className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                                    idx === activePage ? "bg-primary text-primary-fg" : "text-muted hover:bg-surface2"
                                  }`}
                                >
                                  Səhifə {idx + 1}
                                </button>
                              ))}
                              <span className="ml-auto hidden shrink-0 pr-1 text-[11px] text-muted sm:inline">
                                Böyütmək üçün klikləyin
                              </span>
                            </div>
                            <div className="grid place-items-center p-2">
                              {activePhoto && (
                                <ZoomableImage
                                  src={activePhoto.url || activePhoto.preview}
                                  alt="Cavab vərəqi"
                                  className="max-h-[42vh] w-full rounded-xl object-contain lg:max-h-[68vh]"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-3xl border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div className="flex flex-wrap gap-2">
                        {selectedResult && !dirty && (
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
                          >
                            <FiTrash2 /> Nəticəni sil
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setPhase("capture")}
                          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-surface2 hover:text-text"
                        >
                          <FiCamera /> {photos.length ? "Şəkilləri dəyiş" : "Şəkil əlavə et"}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={resetSheet} className="flex-1 sm:flex-none">
                          Ləğv et
                        </Button>
                        <Button
                          size="lg"
                          onClick={save}
                          disabled={saving || !studentId || uploading}
                          className="flex-1 sm:flex-none"
                        >
                          {saving ? <Spinner size={16} /> : <FiSave />} {selectedResult ? "Yenilə" : "Yadda saxla"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={onGalleryPick} />

      {camOpen && (
        <CameraCapture
          title="Cavab vərəqini çək"
          multi
          count={photos.length}
          onUse={addBlob}
          onClose={() => setCamOpen(false)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={removeResult}
        title="Nəticəni silmək?"
        confirmLabel="Bəli, sil"
        cancelLabel="Geri"
        tone="danger"
        loading={deleting}
      >
        <p>
          <span className="font-semibold text-text">{selected?.name}</span> üçün yoxlanılmış vərəq və bal silinəcək.
          Şagird bu nəticəni artıq görməyəcək.
        </p>
      </ConfirmDialog>
    </AccountLayout>
  );
};

export default PaperGrading;
