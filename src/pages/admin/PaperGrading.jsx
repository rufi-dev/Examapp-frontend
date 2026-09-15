import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiCamera,
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
  FiUploadCloud,
  FiDownload,
} from "react-icons/fi";
import AccountLayout from "../../components/AccountLayout";
import Button from "../../components/ui/Button";
import Spinner from "../../components/Spinner";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import CameraCapture from "../../components/CameraCapture";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import {
  fetchPaperSheet,
  readPaperSheet,
  readPaperSheetAi,
  previewPaperScore,
  savePaperResult,
  deletePaperResult,
  apiError,
} from "../../helper/paperApi";
import {
  AnswerEditor,
  Avatar,
  ReadSummary,
  ReadingPanel,
  SourceTag,
  SheetCapture,
  SheetViewer,
  Stepper,
  TYPE_LABEL,
  answerLabel,
  blankAnswer,
  correctLabel,
  fromStored,
  rowState,
  useSheetPhotos,
} from "../../components/paper/PaperKit";

/*
 * Paper exam grading workspace (teacher).
 *
 * Students write the exam in class on answer cards. A sheet reaches the teacher
 * either because they photograph it here, or because the student uploaded it
 * themselves (then it waits in "Yoxlanmalı" with any answers the student changed
 * from the AI read highlighted). The teacher reviews against the key, corrects,
 * assigns (auto-matched from the name on the card) and saves. The score is always
 * computed by the server; the number shown while editing is a live preview.
 */

const STEPS = [
  { id: "capture", label: "Vərəq" },
  { id: "reading", label: "Oxunuş" },
  { id: "review", label: "Yoxla və saxla" },
];

const sheetNameText = (info) => [info?.firstName, info?.lastName, info?.fatherName].filter(Boolean).join(" ");

const SheetRow = ({ index, q, value, ai, edited, studentAi, onChange }) => {
  const state = rowState(q, value);
  const flagged = !!ai && ai.confidence !== "high" && !edited;
  const studentChanged = studentAi !== undefined;
  const tone =
    flagged || studentChanged
      ? "border-warning/50 bg-warning/[0.07]"
      : state === "right"
        ? "border-success/25 bg-success/[0.05]"
        : state === "wrong"
          ? "border-danger/25 bg-danger/[0.05]"
          : "border-line bg-surface";
  return (
    <div className={`rounded-2xl border p-3 transition-colors sm:p-3.5 ${tone}`}>
      <div className="flex items-start gap-3">
        <span className="mt-1.5 w-7 shrink-0 text-center font-display text-base font-extrabold tabular-nums text-text">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-surface2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
              {TYPE_LABEL[q.type] || q.type}
            </span>
            <SourceTag source={ai?.source} />
            {flagged && (
              <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning">
                <FiAlertTriangle /> Yoxla{ai.note ? ` · ${ai.note}` : ""}
              </span>
            )}
            {studentChanged && (
              <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning">
                <FiEdit3 /> Şagird dəyişib · oxunmuşdu: {answerLabel(q, studentAi)}
              </span>
            )}
            {edited && (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                <FiEdit3 /> Düzəliş edilib
              </span>
            )}
          </div>
          <AnswerEditor q={q} value={value} onChange={onChange} tone={state === "right" ? "right" : "wrong"} />
          <p className="mt-2 text-xs text-muted">
            Düzgün cavab: <span className="font-semibold text-text">{correctLabel(q)}</span>
          </p>
        </div>
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
            state === "right" ? "bg-success text-white" : state === "wrong" ? "bg-danger text-white" : "bg-surface2 text-muted"
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
  const [rosterFilter, setRosterFilter] = useState("all"); // all | pending | review | graded
  const [studentId, setStudentId] = useState("");
  const [phase, setPhase] = useState("capture"); // capture | reading | review
  const [answers, setAnswers] = useState([]);
  const [ai, setAi] = useState(null); // [{ answer, confidence, note }] from this session's AI read
  const [edited, setEdited] = useState(() => new Set());
  const [dirty, setDirty] = useState(false);
  const [origin, setOrigin] = useState(null); // a student-uploaded result under review
  const [sheetInfo, setSheetInfo] = useState(null); // name/class boxes read off the sheet
  const [suggestions, setSuggestions] = useState([]);
  const [camOpen, setCamOpen] = useState(false);
  const [readStartedAt, setReadStartedAt] = useState(0);
  const [readStage, setReadStage] = useState({ stage: "platform", pending: [], nameOnly: false });
  const [readInfo, setReadInfo] = useState(null); // how the sheet was read (ReadSummary)
  const [retryingAi, setRetryingAi] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sheetFilter, setSheetFilter] = useState("all"); // all | flagged | wrong | changed
  const galleryRef = useRef(null);
  const preselected = useRef(false);

  const markDirty = useCallback(() => setDirty(true), []);
  const sheet = useSheetPhotos({ onDirty: markDirty });
  const { photos, done: donePhotos, uploading, reset: resetPhotos } = sheet;

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

  // Class roster, plus anyone graded who has since left the class.
  const roster = useMemo(() => {
    const list = (data?.students || []).map((s) => ({ ...s, inClass: true }));
    const ids = new Set(list.map((s) => String(s._id)));
    results.forEach((r) => {
      if (r.student && !ids.has(String(r.userId))) list.push({ ...r.student, inClass: false });
    });
    return list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "az"));
  }, [data, results]);

  const needsReview = (r) => !!r && r.submittedBy === "student" && !r.teacherReviewedAt;
  const selected = roster.find((s) => String(s._id) === String(studentId)) || null;
  const selectedResult = studentId ? resultByStudent.get(String(studentId)) || null : null;
  const inClass = roster.filter((s) => s.inClass);
  const gradedInClass = inClass.filter((s) => resultByStudent.has(String(s._id))).length;
  const reviewCount = results.filter(needsReview).length;
  const scoreTotal = data?.exam?.preset && Number(data?.exam?.totalMarks) ? Number(data.exam.totalMarks) : 100;
  const average = results.length
    ? Math.round((results.reduce((s, r) => s + (Number(r.earnPoints) || 0), 0) / results.length) * 10) / 10
    : null;

  const resetSheet = useCallback(() => {
    resetPhotos([]);
    setAnswers([]);
    setAi(null);
    setEdited(new Set());
    setOrigin(null);
    setSheetInfo(null);
    setSuggestions([]);
    setReadInfo(null);
    setPreview(null);
    setSheetFilter("all");
    setDirty(false);
    setPhase("capture");
  }, [resetPhotos]);

  // Open an already-saved sheet (teacher-graded or student-uploaded) for review.
  const openResult = useCallback(
    (r) => {
      resetPhotos(r.sheetPhotos || []);
      setAnswers(key.map((q, i) => fromStored(q, r.selectedAnswers?.[i]?.answer)));
      setAi(null);
      setEdited(new Set());
      setOrigin(r.submittedBy === "student" ? r : null);
      setSheetInfo(r.sheetStudent || null);
      setSuggestions([]);
      setReadInfo(null);
      setSheetFilter(r.submittedBy === "student" && r.studentEdited?.length ? "changed" : "all");
      setDirty(false);
      setPhase("review");
    },
    [key, resetPhotos]
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
      if (existing) toast.info("Bu şagirdin artıq nəticəsi var — yadda saxlasanız yenilənəcək.");
      return;
    }
    setStudentId(id);
    if (existing) openResult(existing);
    else resetSheet();
  };

  // The platform reads the sheet (bubbles + handwriting, no AI). Answers it
  // couldn't read are listed; AI checks them only when the teacher presses the button.
  const runRead = async () => {
    if (!donePhotos.length) return toast.error("Əvvəlcə vərəqin şəklini əlavə edin");
    const images = donePhotos.map((p) => p.url);
    setPhase("reading");
    setReadStage({ stage: "platform", pending: [], nameOnly: false });
    setReadStartedAt(Date.now());
    let res;
    try {
      res = await readPaperSheet(examId, images);
    } catch (e) {
      toast.error(apiError(e, "Vərəq oxunmadı"));
      setPhase("capture");
      return;
    }
    const list = key.map((q, i) => ({
      answer: res.answers?.[i]?.answer ?? blankAnswer(q),
      confidence: res.answers?.[i]?.confidence || "low",
      note: res.answers?.[i]?.note || "",
      source: res.answers?.[i]?.source || null,
    }));
    const student = res.student || null;
    const match = res.match || null;
    const suggestionList = Array.isArray(res.suggestions) ? res.suggestions : [];
    const pending = Array.isArray(res.unresolved) ? res.unresolved : [];
    const info = {
      platform: res.platform || {},
      aiUsed: [],
      pendingAi: pending, // AI never runs on its own — the "AI ilə yoxla" button does it
      aiError: "",
      nameByAi: false,
      needName: !res.nameResolved,
    };
    setAnswers(key.map((q, i) => fromStored(q, list[i].answer)));
    setAi(list);
    setEdited(new Set());
    setOrigin(null);
    setSheetInfo(student);
    setSuggestions(suggestionList);
    setReadInfo(info);
    setSheetFilter("all");
    setDirty(true);
    if (!studentId && match?._id) {
      setStudentId(String(match._id));
      toast.success(`Vərəqdəki ada görə seçildi: ${match.name}`);
    } else if (studentId && match?._id && String(match._id) !== String(studentId)) {
      toast.warn(`Vərəqdə "${sheetNameText(student)}" yazılıb — seçilmiş şagirdlə uyğun gəlmir.`);
    }
    setPhase("review");
  };

  // Retry the AI check for answers left unread (keeps the teacher's edits).
  const retryAi = async () => {
    const pending = readInfo?.pendingAi || [];
    if (!pending.length) return;
    setRetryingAi(true);
    try {
      // The name comes along only when no student is chosen yet.
      const wantName = !!readInfo?.needName && !studentId;
      const extra = await readPaperSheetAi(
        examId,
        donePhotos.map((p) => p.url),
        pending,
        wantName
      );
      if (wantName && extra.student) {
        setSheetInfo(extra.student);
        setSuggestions(Array.isArray(extra.suggestions) ? extra.suggestions : []);
        if (extra.match?._id) {
          setStudentId(String(extra.match._id));
          toast.success(`Vərəqdəki ada görə seçildi: ${extra.match.name}`);
        }
      }
      const byIndex = new Map((extra.answers || []).map((a) => [a.index, a]));
      setAi((prev) =>
        (prev || []).map((row, i) =>
          byIndex.has(i)
            ? { answer: byIndex.get(i).answer, confidence: byIndex.get(i).confidence || "low", note: byIndex.get(i).note || "", source: "ai" }
            : row
        )
      );
      setAnswers((prev) => prev.map((v, i) => (byIndex.has(i) && !edited.has(i) ? fromStored(key[i], byIndex.get(i).answer) : v)));
      setReadInfo((prev) => ({
        ...(prev || {}),
        aiUsed: [...(prev?.aiUsed || []), ...pending],
        pendingAi: [],
        aiError: "",
        nameByAi: wantName && !!extra.student,
      }));
      setDirty(true);
    } catch (e) {
      toast.error(apiError(e, "AI yoxlaması alınmadı"));
    } finally {
      setRetryingAi(false);
    }
  };

  const manualEntry = () => {
    setAnswers(key.map(blankAnswer));
    setReadInfo(null);
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
        aiAnswers: ai ? ai.map((x) => ({ answer: x.answer, confidence: x.confidence, source: x.source })) : undefined,
        sheetStudent: sheetInfo || undefined,
      });
      const saved = res.result;
      const gradedIds = new Set([...results.map((r) => String(r.userId)), String(saved.userId)]);
      setData((prev) =>
        prev
          ? { ...prev, results: [saved, ...prev.results.filter((r) => String(r.userId) !== String(saved.userId))] }
          : prev
      );
      toast.success(`${saved.student?.name || selected?.name || "Şagird"} — ${saved.earnPoints} bal yadda saxlanıldı`);
      // Next: a student upload still waiting for review, else the next ungraded student.
      const waiting = results.find((r) => needsReview(r) && String(r.userId) !== String(saved.userId));
      const next = inClass.find((s) => !gradedIds.has(String(s._id)));
      resetSheet();
      if (waiting) {
        setStudentId(String(waiting.userId));
        openResult(waiting);
      } else {
        setStudentId(next ? String(next._id) : "");
      }
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

  const changedSet = useMemo(() => new Set(origin?.studentEdited || []), [origin]);

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
    const r = resultByStudent.get(String(s._id));
    if (rosterFilter === "pending" && (r || !s.inClass)) return false;
    if (rosterFilter === "review" && !needsReview(r)) return false;
    if (rosterFilter === "graded" && !r) return false;
    if (!q) return true;
    return String(s.name || "").toLowerCase().includes(q) || String(s.email || "").toLowerCase().includes(q);
  });

  const visibleRows = key
    .map((question, i) => ({ question, i }))
    .filter(({ question, i }) => {
      if (sheetFilter === "flagged") return ai?.[i] && ai[i].confidence !== "high" && !edited.has(i);
      if (sheetFilter === "wrong") return rowState(question, answers[i]) === "wrong";
      if (sheetFilter === "changed") return changedSet.has(i);
      return true;
    });

  const tab = (active) =>
    `flex-1 rounded-lg px-1.5 py-1.5 text-[11px] font-semibold transition-colors ${
      active ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
    }`;
  const chip = (active, tone) =>
    `inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${tone} ${
      active ? "ring-2 ring-offset-1 ring-offset-surface" : ""
    }`;

  return (
    <AccountLayout
      title="Kağız imtahanı yoxlama"
      subtitle={`${data.exam.name}${data.exam.className ? ` · ${data.exam.className}` : ""}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <a
            href="/cavab-karti.pdf"
            download="Cavab_Karti_A4.pdf"
            title="Platformanın ən dəqiq oxuduğu cavab kartı (A4)"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-text transition-colors hover:bg-surface2"
          >
            <FiDownload /> Cavab kartı
          </a>
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
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        <button
          type="button"
          onClick={() => setRosterFilter(reviewCount ? "review" : "all")}
          className={`rounded-2xl border p-4 text-left shadow-soft transition-colors ${
            reviewCount ? "border-accent2/40 bg-accent2/[0.06] hover:bg-accent2/10" : "border-line bg-surface"
          }`}
        >
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <FiUploadCloud /> Şagird yükləyib
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-text">
            {reviewCount}
            <span className="text-base font-bold text-muted"> yoxlanmalı</span>
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {data.exam.paperSelfUpload ? "Şagirdlər öz vərəqini yükləyə bilər" : "Şagird yükləməsi bağlıdır"}
          </p>
        </button>
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
                <div className="mt-3 flex w-full gap-0.5 rounded-xl bg-surface2/70 p-1">
                  <button type="button" onClick={() => setRosterFilter("all")} className={tab(rosterFilter === "all")}>
                    Hamısı
                  </button>
                  <button type="button" onClick={() => setRosterFilter("pending")} className={tab(rosterFilter === "pending")}>
                    Gözləyir
                  </button>
                  <button type="button" onClick={() => setRosterFilter("review")} className={tab(rosterFilter === "review")}>
                    Yoxla {reviewCount || ""}
                  </button>
                  <button type="button" onClick={() => setRosterFilter("graded")} className={tab(rosterFilter === "graded")}>
                    Hazır
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
                            {!s.inClass
                              ? "Sinifdə deyil"
                              : needsReview(r)
                                ? `Özü yükləyib${r.studentEdited?.length ? ` · ${r.studentEdited.length} dəyişiklik` : ""}`
                                : s.email || ""}
                          </span>
                        </span>
                        {r ? (
                          <span className="flex shrink-0 items-center gap-1.5">
                            {needsReview(r) && (
                              <span className="h-2 w-2 rounded-full bg-accent2" title="Şagird yükləyib, yoxlanmayıb" />
                            )}
                            <span className="rounded-full bg-success/12 px-2 py-0.5 text-xs font-bold tabular-nums text-success">
                              {r.earnPoints}
                            </span>
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
                <Stepper steps={STEPS} current={phase} />
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
                {phase === "capture" && (
                  <SheetCapture
                    photos={photos}
                    onCamera={() => setCamOpen(true)}
                    onGallery={() => galleryRef.current?.click()}
                    onRemove={sheet.remove}
                    onRetry={sheet.retry}
                    onDropFiles={(files) => files.forEach(sheet.add)}
                    title="Cavab vərəqini çəkin"
                    hint="Vərəqin hamısı kadrda, düz və yaxşı işıqda olsun. Vərəq bir neçə səhifədirsə, hər birini ayrıca çəkin."
                    note={
                      selected
                        ? `Vərəq ${selected.name} üçün yoxlanılacaq.`
                        : "Şagird vərəqdəki ad və soyada görə avtomatik seçiləcək."
                    }
                  >
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
                              <FiZap /> Vərəqi oxu
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </SheetCapture>
                )}

                {phase === "reading" && (
                  <ReadingPanel
                    startedAt={readStartedAt}
                    photos={donePhotos}
                    stage={readStage.stage}
                    pending={readStage.pending}
                    nameOnly={readStage.nameOnly}
                  />
                )}

                {phase === "review" && (
                  <div className="space-y-5">
                    {origin && (
                      <div className="flex flex-col gap-2 rounded-2xl border border-accent2/35 bg-accent2/[0.06] p-4 sm:flex-row sm:items-center">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent2/15 text-accent2">
                          <FiUploadCloud />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-text">
                            Bu vərəqi şagird özü yükləyib
                            {origin.teacherReviewedAt ? " · yoxlanılıb" : " · hələ yoxlanmayıb"}
                          </p>
                          <p className="text-xs text-muted">
                            {origin.studentEdited?.length
                              ? `${origin.studentEdited.length} cavab vərəqdən oxunandan fərqli təqdim edilib — şəkillə müqayisə edin.`
                              : "Şagird vərəqdən oxunan cavabları dəyişməyib."}
                          </p>
                        </div>
                      </div>
                    )}

                    <ReadSummary
                      info={readInfo}
                      total={key.length}
                      onRetryAi={readInfo?.pendingAi?.length ? retryAi : undefined}
                      retrying={retryingAi}
                    />

                    {(sheetInfo?.firstName || sheetInfo?.lastName) && (
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                        <FiUser className="text-primary" /> Vərəqdə:
                        <b className="text-text">{sheetNameText(sheetInfo)}</b>
                        {sheetInfo.className && <span>· {sheetInfo.className} sinif</span>}
                      </p>
                    )}

                    {!selected ? (
                      <div className="rounded-2xl border border-warning/40 bg-warning/[0.07] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
                              <FiUser />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-text">Bu vərəq hansı şagirdindir?</p>
                              <p className="text-xs text-muted">
                                {sheetInfo?.firstName || sheetInfo?.lastName
                                  ? "Vərəqdəki ad sinifdə dəqiq tapılmadı."
                                  : "Vərəqdə ad oxunmadı. Siyahıdan seçin."}
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
                        {suggestions.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-warning/25 pt-3">
                            <span className="text-xs font-semibold text-muted">Ola bilər:</span>
                            {suggestions.map((s) => (
                              <button
                                key={s._id}
                                type="button"
                                onClick={() => {
                                  const r = roster.find((x) => String(x._id) === String(s._id));
                                  if (r) selectStudent(r);
                                }}
                                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-sm font-semibold text-text transition-colors hover:border-primary/50"
                              >
                                <Avatar s={s} size="h-6 w-6" /> {s.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : selectedResult && dirty ? (
                      <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface2/50 px-4 py-3 text-sm text-text">
                        <FiAlertTriangle className="shrink-0 text-warning" />
                        {selected.name} üçün artıq nəticə var ({selectedResult.earnPoints} bal). Yadda saxlasanız
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
                          className={chip(sheetFilter === "wrong", "border-danger/25 bg-danger/[0.07] text-danger ring-danger/40")}
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
                            className={chip(sheetFilter === "flagged", "border-warning/40 bg-warning/[0.08] text-warning ring-warning/40")}
                          >
                            <FiAlertTriangle /> Yoxlanmalı {stats.flagged}
                          </button>
                        )}
                        {origin?.studentEdited?.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSheetFilter(sheetFilter === "changed" ? "all" : "changed")}
                            className={chip(sheetFilter === "changed", "border-warning/40 bg-warning/[0.08] text-warning ring-warning/40")}
                          >
                            <FiEdit3 /> Şagird dəyişib {origin.studentEdited.length}
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
                            studentAi={changedSet.has(i) ? origin?.aiAnswers?.[i]?.answer ?? blankAnswer(question) : undefined}
                            onChange={(v) => setAnswer(i, v)}
                          />
                        ))}
                        {!visibleRows.length && (
                          <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">
                            Bu filtrdə sual qalmayıb ✓
                          </div>
                        )}
                      </div>

                      {photos.length > 0 && (
                        <div className="order-1 lg:sticky lg:top-20 lg:order-2 lg:self-start">
                          <SheetViewer photos={photos} />
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
                        <Button size="lg" onClick={save} disabled={saving || !studentId || uploading} className="flex-1 sm:flex-none">
                          {saving ? <Spinner size={16} /> : <FiSave />}{" "}
                          {origin && !origin.teacherReviewedAt ? "Təsdiqlə və saxla" : selectedResult ? "Yenilə" : "Yadda saxla"}
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

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []).filter((f) => !f.type || f.type.startsWith("image/"));
          e.target.value = "";
          files.forEach(sheet.add);
        }}
      />

      {camOpen && (
        <CameraCapture
          title="Cavab vərəqini çək"
          multi
          count={photos.length}
          onUse={sheet.add}
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
          Şagird bu nəticəni artıq görməyəcək və vərəqini yenidən yükləyə biləcək.
        </p>
      </ConfirmDialog>
    </AccountLayout>
  );
};

export default PaperGrading;
