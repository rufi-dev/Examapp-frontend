import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { startAttempt, getPdfByExam } from "../../../redux/features/quiz/quizSlice";
import { reportViolation, getAttemptStatus, autosaveAnswers } from "../../../redux/features/quiz/quizService";
import { addResult } from "../../../redux/features/quiz/resultSlice";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiClock,
  FiCheckCircle,
  FiLock,
  FiEye,
  FiMaximize,
  FiMonitor,
  FiZap,
  FiInfo,
} from "react-icons/fi";
import { toast } from "react-toastify";
import PdfOpener from "../../components/PdfOpener";
import QuestionType from "../../components/QuestionType";
import QuestionNav from "../../components/QuestionNav";
import QuestionMap from "../../components/QuestionMap";
import Spinner from "../../components/Spinner";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { hasAnswer } from "../../helper/helper";

// Maps server denial reasons to a message + where to send the user.
const DENY = {
  unverified: { msg: "Hesabınız təsdiqlənməyib", to: (id) => `/exam/details/${id}` },
  not_started: { msg: "İmtahan hələ başlamayıb", to: (id) => `/exam/details/${id}` },
  finished: { msg: "İmtahan artıq bitib", to: (id) => `/exam/details/${id}` },
  no_questions: { msg: "Bu imtahana suallar əlavə edilməyib", to: (id) => `/exam/details/${id}` },
  not_owned: { msg: "Bu imtahanı əldə etməlisiniz", to: (id) => `/exam/details/${id}` },
  max_tries: { msg: "Maksimum cəhd sayına çatmısınız", to: (id) => `/exam/${id}/result` },
};

// Anti-cheat: auto-submit after this many leave-the-page violations.
const ANTICHEAT_LIMIT = 3;

// Max time the solution-photo picker may background the tab without counting as a
// violation. Beyond this the student is treated as "away under cover of the picker".
const PHOTO_GRACE_MS = 120000;

// A pending final submit is kept for a 7-DAY hard cap (NOT expiresAt+1h) so a
// student who loses network, closes the browser, and returns hours later never
// loses their frozen submit. Only past-cap blobs are purged.
const PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// A pending blob is only usable if it is STRUCTURALLY VALID — a real ObjectId
// attemptId, a finite in-TTL createdAt, and a selectedAnswers array. This stops a
// stale/corrupt blob from hijacking exam start (and, without a valid attemptId,
// falling into the backend's legacy "latest attempt" fallback).
const isObjectIdStr = (v) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);
const isValidPendingBlob = (b) => {
  if (!b || typeof b !== "object") return false;
  if (!isObjectIdStr(String(b.attemptId || ""))) return false;
  const created = Number(b.createdAt);
  if (!Number.isFinite(created) || created <= 0) return false;
  if (Date.now() > created + PENDING_TTL_MS) return false;
  if (!Array.isArray(b.selectedAnswers)) return false;
  return true;
};

// Freshest VALID, non-stale pending final-submit blob for this user+exam (purges
// anything invalid/past-cap).
const scanPendingBlob = (examId, userId) => {
  try {
    const prefix = `examPendingSubmit_${examId}_${userId}_`;
    let best = null;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(prefix)) continue;
      let blob;
      try {
        blob = JSON.parse(localStorage.getItem(k));
      } catch {
        localStorage.removeItem(k);
        continue;
      }
      if (!isValidPendingBlob(blob)) {
        localStorage.removeItem(k);
        continue;
      }
      const created = Number(blob.createdAt);
      if (!best || created > (Number(best.createdAt) || 0)) best = blob;
    }
    return best;
  } catch {
    return null;
  }
};

// Circular answered-progress indicator for the exam sidebar.
const ProgressRing = ({ value = 0, total = 0, size = 56, stroke = 5 }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.min(1, value / total) : 0;
  const pct = Math.round(frac * 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-line"
        />
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
        {pct}%
      </span>
    </div>
  );
};

const Quiz = () => {
  const { examId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Current user's id (decoded from the JWT), used to scope local keys so a shared
  // device can't leak or overwrite another user's draft / queued submit.
  const userId = useMemo(() => {
    try {
      const t = localStorage.getItem("token");
      return (t && JSON.parse(atob(t.split(".")[1])).id) || "anon";
    } catch {
      return "anon";
    }
  }, []);

  // Draft answers start EMPTY and are hydrated from the attempt-scoped key AFTER
  // the attempt loads (the key includes attemptId, unknown until /start).
  const [answers, setAnswers] = useState(() =>
    Array.from({ length: 25 }, () => ({ answer: "", type: "" }))
  );

  const [attempt, setAttempt] = useState(null); // { expiresAt, name, duration, questions }
  const [pdfData, setPdfData] = useState(null);
  const [pdfFailed, setPdfFailed] = useState(false); // PDF fetch exhausted its retries
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileView, setMobileView] = useState("pdf"); // mobile: "pdf" | "answers"
  const [access, setAccess] = useState("checking"); // "checking" | "allowed" | "denied" | "password"
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState("");
  const [starting, setStarting] = useState(false);
  const cancelledRef = useRef(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null); // seconds remaining
  const warned5 = useRef(false);
  const warned1 = useRef(false);
  // Server-clock offset (server ms − local ms). The countdown is measured against
  // SERVER time, not the device clock, so a phone/PC whose date/time/timezone is
  // set WRONG (ahead) can no longer read the deadline as already passed and get
  // kicked out with a false "Vaxt bitdi". We never auto-submit until this sync
  // has confirmed real time (clockSyncedRef); the server enforces the deadline
  // regardless, so nothing is lost if the sync is slow.
  const clockOffsetRef = useRef(0);
  const clockSyncedRef = useRef(false);

  // Refs so the (interval-based) auto-submit always reads the latest values.
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const submittingRef = useRef(false);

  // Attempt-scoped local-storage keys (unambiguous per user + attempt). Null until
  // the attempt has loaded (attemptId is unknown before /start).
  const attemptId = attempt?.attemptId || null;
  const answersKey = attemptId ? `examAnswers_${examId}_${userId}_${attemptId}` : null;
  const vioKey = attemptId ? `examVio_${examId}_${userId}_${attemptId}` : null;
  const pendingKey = attemptId ? `examPendingSubmit_${examId}_${userId}_${attemptId}` : null;
  // The just-submitted attempt, so the Result page selects THIS attempt's result
  // (not the stale "latest"). User-scoped; kept until TTL / dismissal.
  const lastSubmittedKey = `examLastSubmittedAttempt_${examId}_${userId}`;

  // Submit state machine: idle -> submitting -> (done | pending -> submitting…) | fatal.
  const [submitPhase, setSubmitPhaseState] = useState("idle");
  const submitPhaseRef = useRef("idle");
  const setSubmitPhase = (p) => {
    submitPhaseRef.current = p;
    setSubmitPhaseState(p);
  };
  const pendingRef = useRef(false);
  const resumingPendingRef = useRef(false);
  const snapshotRef = useRef(null);
  const trySubmitRef = useRef(null);
  const enterPendingRef = useRef(null);
  const retryTimerRef = useRef(null);
  const retryAfterUntilRef = useRef(0);
  const onlineListenerRef = useRef(null);
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);
  lockedRef.current = locked;
  const [persistFailed, setPersistFailed] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  // Anti-cheat violation tracking. The SERVER owns the real count; this local
  // value is just a mirror. It starts at 0 and is overwritten by the authoritative
  // server count on load (and on every report / poll), so a reload can't lower it.
  const [violations, setViolations] = useState(0);
  const violationsRef = useRef(violations);
  const lastVioRef = useRef(0);
  const terminatedRef = useRef(false); // auto-submitted due to violations
  // Suppress anti-cheat violations WHILE the solution-photo picker is open (the
  // camera/file dialog backgrounds the tab, which must NOT count as leaving). The
  // flag is CLEARED the moment the student returns to the page, so it can't be
  // abused as a 2-minute free pass — only the picker round-trip is graced. A hard
  // cap covers the never-returns case.
  const photoPickerOpenRef = useRef(false);
  const photoCapTimerRef = useRef(null);
  const registerViolationRef = useRef(null); // set by the anti-cheat effect
  const onPhotoActivity = useCallback(() => {
    photoPickerOpenRef.current = true;
    if (photoCapTimerRef.current) clearTimeout(photoCapTimerRef.current);
    // ACTIVE cap: if the student is STILL away (tab backgrounded / window unfocused)
    // when the grace elapses, they're away under cover of the picker — count a
    // violation and stop suppressing. A quick return cancels this timer (clearPhotoGrace).
    photoCapTimerRef.current = setTimeout(() => {
      photoCapTimerRef.current = null;
      const away = document.hidden || !document.hasFocus();
      photoPickerOpenRef.current = false;
      if (away && registerViolationRef.current) registerViolationRef.current("photo_timeout");
    }, PHOTO_GRACE_MS);
  }, []);

  // Cache the latest known count so a reload shows it immediately (the server
  // value still overrides it, so editing this can't lower the real tally).
  const persistVio = (n) => {
    if (!vioKey) return;
    try {
      localStorage.setItem(vioKey, String(n));
    } catch {
      /* ignore */
    }
  };

  // Structured-exam pagination: which page is shown (0 = first). pagingRef keeps
  // the live {perPage, pageSize} so the memoized jumpToQuestion can switch pages
  // without taking them as deps (which would break its stable identity).
  const [examPage, setExamPage] = useState(0);
  const pagingRef = useRef({ perPage: 0, pageSize: 1 });
  const sheetScrollRef = useRef(null); // the scrollable question column

  // "Mark for review" flags + jump-to-question (navigator grid).
  const [marked, setMarked] = useState([]);
  // useCallback so these stay reference-stable across the 1s timer ticks, which
  // lets the memoized QuestionType / QuestionNav skip re-rendering each second.
  const toggleMark = useCallback((i) => {
    if (lockedRef.current) return; // frozen after submit
    setMarked((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }, []);
  const jumpToQuestion = useCallback((i) => {
    // When paginated, switch to the page that holds this question first.
    const { perPage, pageSize, forwardOnly, page } = pagingRef.current;
    const target = perPage > 0 ? Math.floor(i / pageSize) : 0;
    // Linear mode: ignore any jump to an earlier page (no going back).
    if (perPage > 0 && forwardOnly && target < page) return;
    setMobileView("answers"); // on mobile, make the answer sheet visible first
    if (perPage > 0) setExamPage(target);
    // Small delay so the target page renders before we scroll to it.
    setTimeout(() => {
      const el = document.getElementById(`q-${i}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }, []);

  // Fullscreen lock (anti-cheat): the questions are gated until the student is
  // in fullscreen; leaving it (or minimizing) hides everything until they
  // return. Browsers can't physically block minimizing, so this is the strictest
  // enforceable equivalent.
  const [isFs, setIsFs] = useState(false);
  // Safety net: if fullscreen can't actually engage (iOS Safari, or a browser
  // that claims support but no-ops), never trap the student behind the gate.
  const [fsBypass, setFsBypass] = useState(false);
  // A second/extended display gates the exam (questions hidden) rather than
  // instantly counting a violation — the student can disconnect to continue.
  const [secondScreen, setSecondScreen] = useState(false);
  // Violations only count once the exam is truly ACTIVE (past every gate). A
  // fresh settle window after (re)entering absorbs the fullscreen / monitor-
  // disconnect transition events so they aren't mistaken for cheating.
  const examActiveRef = useRef(false);
  const activeSinceRef = useRef(0);
  const fsSupported = typeof document !== "undefined" && !!document.fullscreenEnabled;
  const enterFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => setFsBypass(true));
      // Some browsers report support but silently no-op; if it didn't actually
      // go fullscreen within a moment, let the student through anyway.
      setTimeout(() => {
        if (!document.fullscreenElement) setFsBypass(true);
      }, 1200);
    } else {
      setFsBypass(true);
    }
  };

  const deadline = attempt?.expiresAt ? new Date(attempt.expiresAt).getTime() : null;
  // Structured (native) exam: questions are rendered in-app, there is no PDF
  // panel and no PDF-readiness gate.
  const structured = attempt?.mode === "structured";
  // When the exam enables it, the student may attach one worked-solution photo
  // per question (works for both PDF and structured exams).
  const allowPhoto = !!attempt?.studentSolutionPhotos;
  // Stable reference so the memoized question sheet doesn't reconcile every
  // time the 1s timer ticks (only when the attempt actually changes).
  const questions = useMemo(() => attempt?.questions || [], [attempt]);
  const totalCount = questions.length || answers.length;

  // Structured pagination: split the question sheet into pages of N (0 = all on
  // one page, the default). Indices stay global; we just window the render.
  const examPerPage = structured ? Number(attempt?.questionsPerPage || 0) : 0;
  // Linear mode: no going back to earlier pages/questions (only matters when paged).
  const forwardOnly = !!attempt?.forwardOnly && examPerPage > 0;
  const examPageSize = examPerPage > 0 ? examPerPage : Math.max(1, totalCount);
  const examPageCount = Math.max(1, Math.ceil(Math.max(1, totalCount) / examPageSize));
  const safeExamPage = Math.min(Math.max(0, examPage), examPageCount - 1);
  const examRange =
    examPerPage > 0
      ? { start: safeExamPage * examPageSize, end: safeExamPage * examPageSize + examPageSize }
      : null;
  pagingRef.current = {
    perPage: examPerPage,
    pageSize: examPageSize,
    forwardOnly,
    page: safeExamPage,
  };

  // Fetch the questions PDF with a few retries (a flaky network shouldn't leave a
  // PDF exam stuck on a spinner while the timer burns). Callable by a retry button.
  const loadPdf = useCallback(
    (tries = 0) => {
      setPdfFailed(false);
      dispatch(getPdfByExam({ examId }))
        .unwrap()
        .then((pdf) => {
          if (!cancelledRef.current) setPdfData(pdf?.path || null);
        })
        .catch(() => {
          if (cancelledRef.current) return;
          if (tries < 4) setTimeout(() => loadPdf(tries + 1), 1500);
          else setPdfFailed(true); // give up quietly — the answer sheet stays usable
        });
    },
    [dispatch, examId]
  );

  // Start (or resume) the attempt. The server gates access (verification,
  // window, max tries, AND the exam password) and returns the questions without
  // the answer key. A password-protected exam rejects until the right password
  // is sent, so the questions/PDF can't be reached by tampering with the URL.
  const attemptStart = async (password) => {
    setStarting(true);
    setPwError("");
    try {
      const data = await dispatch(startAttempt({ examId, password })).unwrap();
      if (cancelledRef.current) return;
      // The attempt is already finished server-side (a Result exists) — go straight
      // to the result, carrying THIS attempt's id so the Result page selects it.
      if (data && data.finished) {
        if (data.attemptId) {
          try {
            localStorage.setItem(
              lastSubmittedKey,
              JSON.stringify({ attemptId: data.attemptId, at: Date.now() })
            );
          } catch {
            /* ignore */
          }
        }
        navigate(`/exam/${examId}/result`);
        return;
      }
      setAttempt(data);
      setAccess("allowed");
      // Restore the server-truth anti-cheat tally so a reload / iOS app-kill /
      // battery death can't reset it. The server value always wins.
      if (typeof data.violations === "number") {
        violationsRef.current = data.violations;
        setViolations(data.violations);
        persistVio(data.violations);
      }
      if (data.terminated) {
        // Already over the limit in a prior session — finalize now so reloading
        // can't be used to keep writing after a termination.
        terminatedRef.current = true;
        toast.error("İmtahan pozuntulara görə dayandırılıb.");
        setTimeout(() => submitAnswerSheet("terminated_on_start"), 0);
        return;
      }
      // Structured exams have no PDF — skip the fetch (and its 404).
      if (data.mode !== "structured") loadPdf();
    } catch (err) {
      if (cancelledRef.current) return;
      const reason = err?.reason;
      if (reason === "password_required" || reason === "password_wrong") {
        setAccess("password");
        if (reason === "password_wrong") setPwError("Şifrə yanlışdır");
      } else if (resumingPendingRef.current) {
        // A pending submit is resuming off its own snapshot (e.g. reload after the
        // deadline) — don't redirect away; the retry will finalize + navigate.
      } else {
        const rule = DENY[reason];
        toast.error(rule ? rule.msg : err?.message || "İmtahana giriş alınmadı");
        setAccess("denied");
        navigate(rule ? rule.to(examId) : `/exam/details/${examId}`, { replace: true });
      }
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    cancelledRef.current = false;
    // Resume a pending FINAL submit BEFORE /start: if /start runs first it may
    // finalize an already-expired attempt (from autosave), after which the retry can
    // only reconcile (never create). Resuming first lets the retry submit — within the
    // deadline grace the server scores the submitted answers; PAST grace it scores the
    // deadline-cut autosave (anti-cheat). Either way the attempt finalizes + navigates.
    const blob = scanPendingBlob(examId, userId);
    if (blob) {
      resumingPendingRef.current = true;
      snapshotRef.current = blob;
      setLocked(true);
      if (enterPendingRef.current) enterPendingRef.current();
      if (trySubmitRef.current) trySubmitRef.current();
    } else {
      attemptStart(""); // try without a password first; protected exams prompt
    }
    return () => {
      cancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, examId]);

  const submitPassword = (e) => {
    e.preventDefault();
    if (!pwInput) {
      setPwError("Şifrəni daxil edin");
      return;
    }
    attemptStart(pwInput);
  };

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

  // Keep the active page within range if the question count changes.
  useEffect(() => {
    setExamPage((p) => Math.min(Math.max(0, p), examPageCount - 1));
  }, [examPageCount]);

  // On page change, jump the question column back to the top (a jump-to-question
  // from the navigator then re-scrolls to its target a moment later).
  useEffect(() => {
    if (examPerPage > 0 && sheetScrollRef.current) {
      sheetScrollRef.current.scrollTo({ top: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeExamPage]);

  // Persist draft answers on change (only once the attempt-scoped key is known).
  useEffect(() => {
    if (!answersKey) return;
    try {
      localStorage.setItem(answersKey, JSON.stringify(answers));
    } catch {
      /* ignore */
    }
  }, [answers, answersKey]);

  // Once the attempt loads: hydrate this attempt's saved draft (same-device
  // reload) and purge THIS exam's draft/vio keys that belong to a different user
  // or attempt (so a shared device can't hydrate someone else's answers).
  useEffect(() => {
    if (!attemptId) return;
    try {
      const suffix = `_${userId}_${attemptId}`;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (
          (k.startsWith(`examAnswers_${examId}_`) || k.startsWith(`examVio_${examId}_`)) &&
          !k.endsWith(suffix)
        ) {
          localStorage.removeItem(k);
        }
      }
    } catch {
      /* ignore */
    }
    try {
      const saved = answersKey && localStorage.getItem(answersKey);
      if (saved) setAnswers(JSON.parse(saved));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  // Live-watch telemetry (kept in a ref so the autosave callback stays stable):
  // which question the student is on (1-based, first question of the current
  // page) and how many they've answered. Pushed with each autosave heartbeat.
  const liveRef = useRef({ currentQuestion: 0, answeredCount: 0 });
  useEffect(() => {
    const latest = answersRef.current || [];
    const hasAns = (a) => {
      const v = a?.answer;
      if (v == null) return false;
      if (typeof v === "string") return v.trim() !== "";
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === "object") return Object.keys(v).length > 0;
      return true;
    };
    liveRef.current = {
      currentQuestion: Math.min(totalCount || 0, safeExamPage * examPageSize + 1),
      answeredCount: latest.filter(hasAns).length,
    };
  }, [safeExamPage, answers, examPageSize, totalCount]);

  // Autosave the in-progress selections to the SERVER, so the attempt can be
  // auto-submitted when the timer runs out even if the student never finishes
  // (closed the tab / lost connection). Stable across renders (reads refs).
  const saveDraftToServer = useCallback(() => {
    if (access !== "allowed" || !attempt?.attemptId) return;
    const latest = answersRef.current || [];
    const len = questions.length || latest.length;
    const selectedAnswers = latest.slice(0, len).map((a) => ({
      type: a?.type,
      answer: a?.answer,
      ...(a?.photo ? { photo: a.photo } : {}),
    }));
    autosaveAnswers(examId, selectedAnswers, attempt.attemptId, liveRef.current).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, attempt?.attemptId, examId, questions.length]);

  // Save shortly after EVERY answer change (debounced 2s — works the same for
  // every question type: closed, multi, open, matching, PDF, AI/structured,
  // since it just persists the generic {type, answer, photo} array).
  useEffect(() => {
    if (access !== "allowed" || !attempt?.attemptId) return;
    const t = setTimeout(saveDraftToServer, 2000);
    return () => clearTimeout(t);
  }, [answers, saveDraftToServer, access, attempt?.attemptId]);

  // Periodic floor (retries after a failed save) + immediate save when the tab
  // is hidden / backgrounded (best chance to capture before the student leaves).
  useEffect(() => {
    if (access !== "allowed" || !attempt?.attemptId) return;
    const id = setInterval(saveDraftToServer, 10000); // also the live-watch heartbeat
    const onVis = () => {
      if (document.visibilityState === "hidden") saveDraftToServer();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [saveDraftToServer, access, attempt?.attemptId]);

  // Sync the server clock ONCE (offset from the local clock). Retried a few
  // times so a slow first request still lands. Public endpoint (same one
  // useServerNow uses). Until this succeeds the timer shows but won't auto-submit.
  useEffect(() => {
    if (access !== "allowed") return;
    let mounted = true;
    let tries = 0;
    const sync = () => {
      axios
        .get(`${import.meta.env.VITE_BACKEND_URL}/api/quiz/server-time`)
        .then((res) => {
          if (!mounted || !res?.data?.now) return;
          clockOffsetRef.current = res.data.now - Date.now();
          clockSyncedRef.current = true;
        })
        .catch(() => {
          if (mounted && tries++ < 6) setTimeout(sync, 1500);
        });
    };
    sync();
    return () => {
      mounted = false;
    };
  }, [access]);

  // Wall-clock countdown from the SERVER deadline: leaving / sleeping / closing
  // the tab can't pause it, and it can't be extended from localStorage. Measured
  // against SERVER time (Date.now() + offset), so a wrong device clock is harmless.
  useEffect(() => {
    if (access !== "allowed" || deadline == null) return;
    let id;
    const tick = () => {
      const serverNow = Date.now() + clockOffsetRef.current;
      const rem = Math.max(0, Math.round((deadline - serverNow) / 1000));
      setTimeLeft(rem);
      if (rem <= 300 && rem > 60 && !warned5.current) {
        warned5.current = true;
        toast.warn("5 dəqiqə qaldı!");
      }
      if (rem <= 60 && rem > 0 && !warned1.current) {
        warned1.current = true;
        toast.warn("1 dəqiqə qaldı!");
      }
      // Only end the exam once we've CONFIRMED real time with the server — a
      // wrong local clock must never trigger a false time-up. If the sync never
      // lands, the server-side finalizer still enforces the deadline.
      if (rem <= 0 && clockSyncedRef.current) {
        clearInterval(id);
        toast.info("Vaxt bitdi! Cavablar avtomatik təqdim olunur...");
        submitAnswerSheet("timer");
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

  // ── Submit + network-drop resilience ────────────────────────────────────────
  // Freeze the current answers into the submit payload (pressing submit is terminal).
  const buildResultData = () => {
    const latest = answersRef.current || [];
    const len = questions.length || latest.length;
    return {
      selectedAnswers: latest.slice(0, len).map((a) => ({
        type: a?.type,
        answer: a?.answer,
        ...(a?.photo ? { photo: a.photo } : {}),
      })),
      violations: violationsRef.current,
      terminated: terminatedRef.current,
      attemptId,
    };
  };

  // Remove ONLY the keys for the attempt that just finished — the current
  // attempt's draft/vio/pending, and the resumed snapshot's own pending key (its
  // attemptId may differ). Does NOT wipe other same-exam pending blobs (they could
  // be another nonterminal queued submit). Keeps lastSubmittedKey (Result needs it).
  const clearAttemptKeys = () => {
    try {
      if (answersKey) localStorage.removeItem(answersKey);
      if (vioKey) localStorage.removeItem(vioKey);
      if (pendingKey) localStorage.removeItem(pendingKey);
      const said = snapshotRef.current && snapshotRef.current.attemptId;
      if (said) localStorage.removeItem(`examPendingSubmit_${examId}_${userId}_${said}`);
    } catch {
      /* ignore */
    }
  };

  // Persist the frozen pending submit (try/catch + readback). On quota/private-mode
  // failure, evict only STALE (past-cap) or corrupt pending blobs — NEVER another
  // nonterminal queued submit; if still failing, keep it in-memory only.
  const persistPendingSnapshot = (snap) => {
    if (!pendingKey) return false;
    const write = () => {
      localStorage.setItem(pendingKey, JSON.stringify(snap));
      return localStorage.getItem(pendingKey) != null;
    };
    try {
      if (write()) return true;
    } catch {
      /* fall through to eviction */
    }
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith("examPendingSubmit_") || k === pendingKey) continue;
        let stale = false;
        try {
          const b = JSON.parse(localStorage.getItem(k));
          const c = Number(b && b.createdAt) || 0;
          stale = !b || (c && Date.now() > c + PENDING_TTL_MS);
        } catch {
          stale = true; // corrupt -> safe to drop
        }
        if (stale) localStorage.removeItem(k);
      }
      if (write()) return true;
    } catch {
      /* ignore */
    }
    return false;
  };

  const rememberSubmittedAttempt = (aid) => {
    try {
      localStorage.setItem(
        lastSubmittedKey,
        JSON.stringify({ attemptId: aid || attemptId, at: Date.now() })
      );
    } catch {
      /* ignore */
    }
  };

  const stopRetry = () => {
    pendingRef.current = false;
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (onlineListenerRef.current) {
      window.removeEventListener("online", onlineListenerRef.current);
      onlineListenerRef.current = null;
    }
  };

  const finishToResult = (aid) => {
    rememberSubmittedAttempt(aid);
    clearAttemptKeys();
    stopRetry();
    setSubmitPhase("done");
    navigate(`/exam/${examId}/result`);
  };

  const startRetryLoop = () => {
    if (!retryTimerRef.current) {
      // Jitter so a fleet of students doesn't retry in lockstep on API recovery.
      const period = 7000 + Math.floor(Math.random() * 3000);
      retryTimerRef.current = setInterval(() => {
        if (submitPhaseRef.current !== "pending") return;
        if (Date.now() < retryAfterUntilRef.current) return;
        if (trySubmitRef.current) trySubmitRef.current();
      }, period);
    }
    if (!onlineListenerRef.current) {
      const onOnline = () => {
        if (submitPhaseRef.current === "pending" && trySubmitRef.current) trySubmitRef.current();
      };
      window.addEventListener("online", onOnline);
      onlineListenerRef.current = onOnline;
    }
  };

  const enterPending = (err) => {
    pendingRef.current = true;
    setSubmitPhase("pending");
    if (snapshotRef.current) {
      const expMs = attempt?.expiresAt ? new Date(attempt.expiresAt).getTime() : 0;
      const snap = {
        ...snapshotRef.current,
        examId,
        userId,
        attemptId: snapshotRef.current.attemptId || attemptId,
        expiresAt: Number(snapshotRef.current.expiresAt) || Number(expMs) || 0,
        createdAt: snapshotRef.current.createdAt || Date.now(),
      };
      snapshotRef.current = snap;
      // A resumed blob is already on disk — don't re-persist (and pendingKey may
      // not match its original key); only persist a freshly-frozen snapshot.
      if (!resumingPendingRef.current) setPersistFailed(!persistPendingSnapshot(snap));
    }
    const ra = err && Number(err.retryAfter);
    if (ra) retryAfterUntilRef.current = Date.now() + ra * 1000;
    startRetryLoop();
  };

  const isDoneReason = (reason, msg) =>
    reason === "already_submitted" ||
    reason === "expired" ||
    /bağlan|tapılmad|vaxt|bitib|already/i.test(String(msg || ""));

  const trySubmit = async () => {
    if (submittingRef.current) return;
    if (submitPhaseRef.current === "done" || submitPhaseRef.current === "fatal") return;
    submittingRef.current = true;
    if (submitPhaseRef.current !== "pending") setSubmitPhase("submitting");
    setIsSubmitting(true);
    const aid = (snapshotRef.current && snapshotRef.current.attemptId) || attemptId;
    try {
      await dispatch(
        addResult({ examId, resultData: snapshotRef.current || buildResultData() })
      ).unwrap();
      finishToResult(aid);
    } catch (error) {
      const p = error || {};
      if (p.reason === "unscorable") {
        finishToResult(p.attemptId || aid);
      } else if (p.reason === "invalid_attempt") {
        // Not our attempt / doesn't exist — fatal, but still open the result page.
        clearAttemptKeys();
        stopRetry();
        setSubmitPhase("fatal");
        navigate(`/exam/${examId}/result`);
      } else if (p.reason === "max_tries") {
        // The submit-time maxTry backstop is gone; confirm terminality before
        // discarding the queued submit.
        let terminal = false;
        try {
          const st = await getAttemptStatus(examId, { attemptId: aid });
          terminal = !!(st && (st.finished || st.hasResult || st.unscorable));
        } catch {
          terminal = false;
        }
        if (terminal) finishToResult(aid);
        else enterPending(p);
      } else if (isDoneReason(p.reason, p.message)) {
        finishToResult(aid);
      } else if (p.status === 401) {
        // Keep the snapshot + banner, route through re-login, resume after auth.
        enterPending(p);
        try {
          localStorage.setItem("postLoginRedirect", `/exam/${examId}/start`);
          localStorage.removeItem("token"); // hard-clear so RedirectIfAuth won't bounce
        } catch {
          /* ignore */
        }
        navigate("/login");
      } else if (
        p.isNetwork ||
        !navigator.onLine ||
        [408, 429, 502, 503, 504].includes(p.status)
      ) {
        enterPending(p);
      } else {
        // Genuine 400/403 — the slice already toasted. Stop the loop; offer nav.
        stopRetry();
        setSubmitPhase("fatal");
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };
  trySubmitRef.current = trySubmit;
  enterPendingRef.current = enterPending;

  // Public entry (manual button, timer expiry, anti-cheat, terminated-on-start).
  // Freezes the payload ONCE and locks the sheet — submit is terminal.
  const submitAnswerSheet = (reason = "manual") => {
    if (submitPhaseRef.current === "done") return;
    if (!snapshotRef.current) {
      snapshotRef.current = { ...buildResultData(), reason, createdAt: Date.now() };
    }
    setLocked(true);
    setConfirmFinish(false);
    trySubmit();
  };

  // Clean up the retry loop + the photo-cap timer on unmount.
  useEffect(
    () => () => {
      stopRetry();
      if (photoCapTimerRef.current) clearTimeout(photoCapTimerRef.current);
    },
    []
  );

  // Live online/offline indicator for the pending banner.
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // (Pending-submit recovery now runs in the mount effect above, BEFORE /start, so
  // a reload after a failed final submit lets the retry submit first — scoring the
  // submitted answers within the deadline grace, or the deadline-cut autosave past
  // grace — rather than /start finalizing from autosave before the retry runs.)

  // Multi-device sync: the same attempt can be open on another device, which may
  // add violations, terminate, or submit it. Poll the server so this device's
  // eye-icon stays in sync and it finishes/redirects instead of getting stuck on
  // a dead attempt (e.g. "active exam not found" with no way out).
  useEffect(() => {
    if (access !== "allowed") return;
    let stopped = false;

    const poll = async () => {
      // While a submit is queued (offline retry), the retry owns navigation —
      // don't let the poll redirect underneath it.
      if (pendingRef.current) return;
      let s;
      try {
        s = await getAttemptStatus(examId);
      } catch {
        return; // transient; retry next tick
      }
      if (stopped || submittingRef.current || pendingRef.current || !s) return;
      // Finished/expired elsewhere, OR our own attempt just expired. SUBMIT our
      // LOCAL answers rather than blindly navigating: if a Result already exists it
      // reconciles idempotently (no overwrite); if the attempt expired but isn't
      // finalized yet, this creates the Result from the REAL in-browser answers,
      // which beats the finalizer's older autosave.
      if (s.active === false) {
        toast.info("İmtahan bağlanır…");
        submitAnswerSheet("multidevice");
        return;
      }
      // Mirror the server-truth violation count (never moves backward).
      if (typeof s.violations === "number" && s.violations > violationsRef.current) {
        violationsRef.current = s.violations;
        setViolations(s.violations);
        persistVio(s.violations);
      }
      // Terminated elsewhere — finalize here too.
      if (s.terminated && !terminatedRef.current) {
        terminatedRef.current = true;
        toast.error("İmtahan pozuntulara görə dayandırıldı.");
        submitAnswerSheet("anticheat"); // submits, or redirects if already claimed
      }
    };

    const id = setInterval(poll, 8000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, examId]);

  // Screenshot / copy DETERRENTS — active for EVERY exam, even when anti-cheat is
  // OFF. ⚠️ Browsers cannot truly block OS / phone screenshots (no web API can);
  // this disables right-click, copy/cut, text selection and dragging, blocks the
  // common copy/save/print/view-source shortcuts, and clears the clipboard + warns
  // on PrintScreen (which on Windows copies the screen to the clipboard). It is a
  // strong deterrent, not a hard guarantee.
  useEffect(() => {
    if (access !== "allowed") return;
    const block = (e) => e.preventDefault();
    const clearClip = () => {
      try {
        navigator.clipboard?.writeText(" ");
      } catch {
        /* ignore */
      }
    };
    const onKey = (e) => {
      const k = (e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["c", "x", "s", "u", "p", "a"].includes(k)) {
        e.preventDefault();
      }
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        clearClip();
        toast.warn("Ekran şəkli çəkmək imtahan zamanı qadağandır.");
      }
    };
    const onKeyUp = (e) => {
      if (e.key === "PrintScreen" || e.keyCode === 44) clearClip();
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKeyUp);
    const prevSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onKeyUp);
      document.body.style.userSelect = prevSelect;
    };
  }, [access]);

  // Anti-cheat: when the exam enables it, lock the page down and log leaving.
  // A violation is counted when the page is hidden (minimize / tab switch) OR
  // the window loses focus to another window/app. To dodge the false positives
  // that browser dialogs (password manager, autofill) cause, a focus loss is
  // only counted if focus hasn't returned after a short delay, and a startup
  // grace ignores dialogs that pop right after login. copy/paste/right-click/
  // selection/shortcuts are blocked; the fullscreen gate hides the content
  // whenever not in fullscreen.
  useEffect(() => {
    if (access !== "allowed" || !attempt?.antiCheat) return;
    let blurTimer = null;

    // Reconcile the UI to an authoritative count and act on termination.
    const applyCount = (count, terminated) => {
      violationsRef.current = count;
      setViolations(count);
      persistVio(count);
      if (terminated || count >= ANTICHEAT_LIMIT) {
        if (terminatedRef.current) return;
        terminatedRef.current = true;
        toast.error("Çoxlu pozuntu aşkarlandı — imtahan dayandırılır.");
        submitAnswerSheet("anticheat");
      } else {
        toast.warn(`Diqqət! İmtahandan çıxmaq qadağandır (${count}/${ANTICHEAT_LIMIT}).`);
      }
    };

    const registerViolation = (reason) => {
      if (submittingRef.current || terminatedRef.current) return;
      // The solution-photo picker is open — the camera/file dialog backgrounds the
      // tab, which is NOT leaving the exam. Suppress only while it's genuinely open;
      // the ACTIVE cap timer (onPhotoActivity) counts a violation if the student is
      // still away when the grace elapses, and a return clears the flag.
      if (photoPickerOpenRef.current) return;
      // Don't count while a gate is showing (exam not truly started yet)...
      if (!examActiveRef.current) return;
      // ...nor during the settle window right after (re)entering the exam, which
      // absorbs the fullscreen / monitor-disconnect transition events.
      if (Date.now() - activeSinceRef.current < 2000) return;
      const now = Date.now();
      if (now - lastVioRef.current < 1200) return; // de-dupe rapid events
      lastVioRef.current = now;
      // Optimistic badge bump for instant feedback; the server count then wins.
      const optimistic = violationsRef.current + 1;
      violationsRef.current = optimistic;
      setViolations(optimistic);
      persistVio(optimistic);
      // The SERVER increments + enforces the limit, so editing JS/storage or
      // reloading can never lower the real tally.
      reportViolation(examId, reason, attempt?.attemptId)
        .then((res) =>
          applyCount(
            typeof res?.violations === "number" ? res.violations : optimistic,
            !!res?.terminated
          )
        )
        .catch(() => applyCount(optimistic, false)); // offline: enforce locally, reconciles later
    };

    // Publish registerViolation so the photo-cap timer (defined outside this effect)
    // can count a violation when the picker grace elapses while still away.
    registerViolationRef.current = registerViolation;

    // Returning to the page ends the photo-picker grace (a short settle absorbs the
    // return transition itself) and cancels the active cap timer, so the grace lasts
    // only the picker round-trip.
    const clearPhotoGrace = () =>
      setTimeout(() => {
        photoPickerOpenRef.current = false;
        if (photoCapTimerRef.current) {
          clearTimeout(photoCapTimerRef.current);
          photoCapTimerRef.current = null;
        }
      }, 900);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") registerViolation("hidden");
      else clearPhotoGrace();
    };
    // Window lost focus (another window/app came forward). Confirm after a beat
    // so a transient dialog that returns focus quickly isn't penalised.
    const onBlur = () => {
      if (blurTimer) return;
      blurTimer = setTimeout(() => {
        blurTimer = null;
        if (!document.hasFocus()) registerViolation("blur");
      }, 700);
    };
    const onFocus = () => {
      if (blurTimer) {
        clearTimeout(blurTimer);
        blurTimer = null;
      }
      clearPhotoGrace();
    };
    const onFs = () => setIsFs(!!document.fullscreenElement);
    setIsFs(!!document.fullscreenElement);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("fullscreenchange", onFs);

    return () => {
      if (blurTimer) clearTimeout(blurTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("fullscreenchange", onFs);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, attempt?.antiCheat]);

  // Second-monitor GATE (not a violation): a second/extended display is the main
  // way to run an AI tool beside the exam, so while one is connected we hide the
  // questions and ask the student to disconnect — instead of instantly counting
  // a violation they had no chance to avoid. Polled so it clears the moment the
  // monitor is unplugged. Chromium-only (screen.isExtended); elsewhere it stays
  // false and the gate never shows.
  useEffect(() => {
    if (access !== "allowed" || !attempt?.antiCheat) return;
    const check = () => setSecondScreen(!!(window.screen && window.screen.isExtended));
    check();
    const id = setInterval(check, 1500);
    return () => clearInterval(id);
  }, [access, attempt?.antiCheat]);

  // The exam is "active" (leaving counts as a violation) only once the student is
  // past EVERY gate: in fullscreen (or fullscreen unsupported/bypassed) and with
  // no second screen. While any gate is showing, transient focus/visibility
  // churn (entering fullscreen, disconnecting a monitor) must not be penalised.
  useEffect(() => {
    const active = attempt?.antiCheat
      ? (isFs || fsBypass || !fsSupported) && !secondScreen
      : true;
    if (active && !examActiveRef.current) {
      activeSinceRef.current = Date.now(); // just (re)entered -> fresh settle window
    }
    examActiveRef.current = active;
  }, [attempt?.antiCheat, isFs, fsBypass, fsSupported, secondScreen]);

  const handleAnswerChange = useCallback((e, index, type) => {
    if (lockedRef.current) return; // frozen after submit — no post-submit edits
    const value = e.target.value;
    setAnswers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], answer: value, type };
      return updated;
    });
  }, []);

  // Attach (or clear, with "") the worked-solution photo URL for a question.
  const handlePhotoChange = useCallback((index, url) => {
    if (lockedRef.current) return; // frozen after submit
    setAnswers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], photo: url };
      return updated;
    });
  }, []);

  const remaining = () => {
    if (timeLeft === null) return "--:--";
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const aboutToEnd = timeLeft !== null && timeLeft <= 30;
  const answeredCount = answers.slice(0, totalCount).filter(hasAnswer).length;
  const unansweredNums = answers
    .slice(0, totalCount)
    .map((a, i) => (hasAnswer(a) ? null : i + 1))
    .filter((n) => n != null);
  const flaggedCount = marked.slice(0, totalCount).filter(Boolean).length;
  const isLastPage = safeExamPage >= examPageCount - 1;
  // Jump to the first still-unanswered question (switches page when paginated).
  const goNextUnanswered = () => {
    const i = answers.slice(0, totalCount).findIndex((a) => !hasAnswer(a));
    if (i >= 0) jumpToQuestion(i);
  };

  // Network-drop banner (rendered OUTSIDE the access gate, above every overlay).
  // "pending" = a submit is queued and auto-retrying; "fatal" = a real rejection
  // the student can't retry away — offer a way to the result page.
  const pendingBanner =
    submitPhase === "pending" || submitPhase === "fatal" ? (
      <div className="fixed inset-x-0 bottom-0 z-[2100] flex justify-center p-3 sm:p-4">
        <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lift">
          {submitPhase === "pending" ? (
            <>
              <Spinner size={20} className="shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text">
                  Cavablarınız saxlanılır, internet gözlənilir…
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      isOnline ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  {isOnline ? "İnternet var — təqdim edilir" : "İnternet gözlənilir"}
                  {persistFailed ? " · Bu səhifəni bağlamayın" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => trySubmitRef.current && trySubmitRef.current()}
                className="shrink-0 rounded-lg border border-line bg-surface2 px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-surface"
              >
                Yenidən cəhd et
              </button>
            </>
          ) : (
            <>
              <FiInfo className="shrink-0 text-[20px] text-danger" />
              <p className="min-w-0 flex-1 text-sm font-semibold text-text">
                Təqdim zamanı xəta baş verdi.
              </p>
              <button
                type="button"
                onClick={() => navigate(`/exam/${examId}/result`)}
                className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
              >
                Nəticəyə keç
              </button>
            </>
          )}
        </div>
      </div>
    ) : null;

  // Password-protected exam: prompt before anything loads.
  if (access === "password") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg p-4">
        {pendingBanner}
        <form
          onSubmit={submitPassword}
          className="w-full max-w-sm rounded-3xl border border-line bg-surface p-7 shadow-lift"
        >
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary">
            <FiLock className="text-[22px]" />
          </div>
          <h1 className="font-display text-xl font-bold text-text">İmtahan şifrəsi</h1>
          <p className="mt-1.5 text-sm text-muted">
            Bu imtahan şifrə ilə qorunur. Davam etmək üçün müəllimin verdiyi şifrəni daxil edin.
          </p>
          <input
            type="password"
            autoFocus
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            placeholder="Şifrə"
            className="mt-5 h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/25"
          />
          {pwError && <p className="mt-2 text-sm font-medium text-danger">{pwError}</p>}
          <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/exam/details/${examId}`, { replace: true })}
              className="w-full"
            >
              Geri
            </Button>
            <Button type="submit" disabled={starting} className="w-full">
              {starting ? <Spinner /> : "Daxil ol"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // Don't render exam content until access is confirmed.
  if (access !== "allowed") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg">
        {pendingBanner}
        <Spinner size={44} className="text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-bg">
      {pendingBanner}
      {/* Second-monitor gate: hide the questions while an extended display is
          connected; clears automatically when it's disconnected. */}
      {attempt?.antiCheat && secondScreen && (
        <div className="fixed inset-0 z-[1310] flex items-center justify-center bg-bg/95 p-6 backdrop-blur">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-danger/12 text-danger">
              <FiMonitor className="text-3xl" />
            </div>
            <h2 className="font-display text-xl font-bold text-text">Tək ekran tələb olunur</h2>
            <p className="mt-2 leading-relaxed text-muted">
              İkinci monitor aşkarlandı. İmtahan yalnız bir ekranda keçirilir. Davam etmək
              üçün əlavə monitoru ayırın — ayırdıqdan sonra suallar avtomatik görünəcək.
            </p>
          </div>
        </div>
      )}

      {/* Fullscreen lock: covers everything when anti-cheat is on but the exam
          isn't in fullscreen — so leaving fullscreen / minimizing hides it. */}
      {attempt?.antiCheat && fsSupported && !fsBypass && !isFs && !secondScreen && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-bg/95 p-6 backdrop-blur">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-danger/12 text-danger">
              <FiMaximize className="text-3xl" />
            </div>
            <h2 className="font-display text-xl font-bold text-text">Tam ekran tələb olunur</h2>
            <p className="mt-2 leading-relaxed text-muted">
              Bu imtahan yalnız tam ekranda keçirilir. Davam etmək üçün düyməni basın.
              Tam ekrandan çıxsanız və ya pəncərəni kiçiltsəniz, suallar gizlədilir və pozuntu
              qeydə alınır.
            </p>
            <Button onClick={enterFullscreen} size="lg" className="mt-6">
              <FiMaximize /> Tam ekrana keç
            </Button>
          </div>
        </div>
      )}

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
          <div className="flex shrink-0 items-center gap-3">
            {attempt?.antiCheat && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-1 text-sm font-extrabold uppercase tracking-wide ${
                  violations > 0
                    ? "animate-pulse border-danger bg-danger text-white shadow-lift"
                    : "border-danger/60 bg-danger/15 text-danger"
                }`}
                title="Anti-cheat aktivdir — başqa tab/pəncərəyə keçmək qadağandır. Pozuntu müəllimə bildirilir."
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                      violations > 0 ? "bg-white" : "bg-danger"
                    }`}
                  />
                  <span
                    className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                      violations > 0 ? "bg-white" : "bg-danger"
                    }`}
                  />
                </span>
                <FiEye className="text-2xl" />
                <span className="hidden md:inline">İzlənilir</span>
                {violations}/{ANTICHEAT_LIMIT}
              </span>
            )}
            <span className={structured ? "lg:hidden" : ""}>
              <QuestionNav
                total={totalCount}
                answers={answers}
                marked={marked}
                activeRange={examRange}
                lockBefore={forwardOnly ? safeExamPage * examPageSize : 0}
                onJump={jumpToQuestion}
                onFinish={structured ? () => setConfirmFinish(true) : undefined}
                finishing={isSubmitting || locked}
                locked={locked}
              />
            </span>
          </div>
        </div>

        {!structured && (
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
        )}
      </header>

      {structured ? (
        <div className="flex min-h-0 flex-1 gap-3 p-3 sm:gap-4 sm:p-4 lg:p-5">
          {/* LEFT: answered progress + persistent question map + finish. */}
          <aside className="hidden w-72 shrink-0 flex-col gap-3 lg:flex">
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <ProgressRing value={answeredCount} total={totalCount} />
                <div className="min-w-0">
                  <p className="text-2xl font-bold tabular-nums leading-none text-text">
                    {answeredCount}
                    <span className="text-base font-semibold text-muted">/{totalCount}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">cavablandırılıb</p>
                </div>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-line bg-surface p-4 shadow-soft">
              <QuestionMap
                total={totalCount}
                answers={answers}
                marked={marked}
                activeRange={examRange}
                lockBefore={forwardOnly ? safeExamPage * examPageSize : 0}
                onJump={jumpToQuestion}
                onFinish={() => setConfirmFinish(true)}
                finishing={isSubmitting || locked}
                locked={locked}
              />
            </div>
          </aside>

          {/* CENTER: the current page's questions + pager (last page finishes). */}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
            {examPerPage > 0 && (
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-surface2/40 px-4 py-2.5 sm:px-6">
                <span className="text-sm font-bold text-text">
                  {examRange.end - examRange.start > 1
                    ? `Suallar ${examRange.start + 1}–${Math.min(examRange.end, totalCount)}`
                    : `Sual ${examRange.start + 1}`}
                </span>
                <span className="rounded-lg bg-surface px-2 py-0.5 text-xs font-semibold text-muted">
                  Səhifə {safeExamPage + 1} / {examPageCount}
                </span>
              </div>
            )}
            <div
              ref={sheetScrollRef}
              className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"
            >
              <div className="mx-auto w-full max-w-2xl">
                <QuestionType
                  answers={answers}
                  questions={questions}
                  handleAnswerChange={handleAnswerChange}
                  marked={marked}
                  onToggleMark={toggleMark}
                  range={examRange}
                  allowPhoto={allowPhoto}
                  onPhotoChange={handlePhotoChange}
                  onPhotoActivity={onPhotoActivity}
                  locked={locked}
                />
              </div>
            </div>
            <div className="shrink-0 border-t border-line p-3 sm:p-4">
              <div className="mx-auto w-full max-w-2xl">
                {examPerPage > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    {forwardOnly ? (
                      <span aria-hidden />
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setExamPage((p) => Math.max(0, p - 1))}
                        disabled={safeExamPage <= 0}
                      >
                        ← Əvvəlki
                      </Button>
                    )}
                    <span className="hidden text-sm font-semibold text-muted sm:block">
                      {safeExamPage + 1} / {examPageCount}
                    </span>
                    {isLastPage ? (
                      <Button
                        type="button"
                        onClick={() => setConfirmFinish(true)}
                        disabled={isSubmitting || locked}
                        className="bg-success text-white hover:brightness-105"
                      >
                        {isSubmitting ? (
                          <Spinner />
                        ) : (
                          <>
                            İmtahanı bitir <FiCheckCircle />
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => setExamPage((p) => Math.min(examPageCount - 1, p + 1))}
                      >
                        Növbəti →
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    onClick={() => setConfirmFinish(true)}
                    disabled={isSubmitting || locked}
                    size="lg"
                    className="w-full bg-success text-white hover:brightness-105"
                  >
                    {isSubmitting ? (
                      <Spinner />
                    ) : (
                      <>
                        İmtahanı bitir <FiCheckCircle />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: useful at-a-glance exam info (wide screens). */}
          <aside className="hidden w-60 shrink-0 flex-col gap-3 xl:flex">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-line bg-surface p-2.5 text-center shadow-soft">
                <p className="text-lg font-bold tabular-nums text-success">{answeredCount}</p>
                <p className="text-[10px] text-muted">Cavablı</p>
              </div>
              <div className="rounded-xl border border-line bg-surface p-2.5 text-center shadow-soft">
                <p className="text-lg font-bold tabular-nums text-text">
                  {Math.max(0, totalCount - answeredCount)}
                </p>
                <p className="text-[10px] text-muted">Qalıb</p>
              </div>
              <div className="rounded-xl border border-line bg-surface p-2.5 text-center shadow-soft">
                <p className="text-lg font-bold tabular-nums text-warning">{flaggedCount}</p>
                <p className="text-[10px] text-muted">İşarəli</p>
              </div>
            </div>
            <button
              type="button"
              onClick={goNextUnanswered}
              disabled={unansweredNums.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
            >
              <FiZap /> Növbəti cavabsız
            </button>
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                <FiInfo /> Məsləhət
              </p>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted">
                <li>
                  • <span className="font-semibold text-text">İşarələ</span> ilə sualı yenidən baxış
                  üçün qeyd et.
                </li>
                <li>• Xəritədən istənilən suala bir kliklə keç.</li>
                <li>• Cavablar avtomatik saxlanılır.</li>
                {attempt?.antiCheat && (
                  <li className="font-medium text-danger">
                    • Tab/pəncərə dəyişmək qadağandır — izlənilir.
                  </li>
                )}
              </ul>
            </div>
          </aside>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-4 p-3 sm:p-4 lg:p-6">
          {/* PDF panel */}
          <div
            className={`min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft lg:flex ${
              mobileView === "pdf" ? "flex" : "hidden"
            }`}
          >
            <div className="hidden border-b border-line px-5 py-3 text-sm font-semibold text-muted lg:block">
              İmtahan sualları (PDF)
            </div>
            <div className="min-h-0 flex-1">
              {pdfData ? (
                <PdfOpener pdfFile={pdfData} />
              ) : pdfFailed ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <FiInfo className="text-2xl text-danger" />
                  <p className="text-sm font-semibold text-text">PDF yüklənmədi</p>
                  <p className="text-xs text-muted">
                    İnternet bağlantısı zəif ola bilər. Cavab verməyə davam edə bilərsiniz.
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => loadPdf()}>
                    PDF-i yenidən yüklə
                  </Button>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Spinner size={36} className="text-primary" />
                </div>
              )}
            </div>
          </div>

          {/* Answers column */}
          <div
            className={`relative min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft lg:flex ${
              mobileView === "answers" ? "flex" : "hidden"
            }`}
          >
            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {/* Answer inputs render even if the PDF is still loading/failed, so a
                  stuck PDF fetch never blocks answering while the timer runs. */}
              <QuestionType
                answers={answers}
                questions={questions}
                handleAnswerChange={handleAnswerChange}
                marked={marked}
                onToggleMark={toggleMark}
                allowPhoto={allowPhoto}
                onPhotoChange={handlePhotoChange}
                onPhotoActivity={onPhotoActivity}
                locked={locked}
              />
            </div>

            <div className="shrink-0 border-t border-line p-3 sm:p-4">
              <Button
                onClick={() => setConfirmFinish(true)}
                disabled={isSubmitting || locked}
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
      )}

      <ConfirmDialog
        open={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        onConfirm={() => submitAnswerSheet("manual")}
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
