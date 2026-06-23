import { useEffect, useRef, useState, useMemo, useCallback } from "react";
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

  const answersKey = `examAnswers_${examId}`;
  const vioKey = `examVio_${examId}`;

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
  const [access, setAccess] = useState("checking"); // "checking" | "allowed" | "denied" | "password"
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState("");
  const [starting, setStarting] = useState(false);
  const cancelledRef = useRef(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null); // seconds remaining
  const warned5 = useRef(false);
  const warned1 = useRef(false);

  // Refs so the (interval-based) auto-submit always reads the latest values.
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const submittingRef = useRef(false);

  // Anti-cheat violation tracking. The SERVER owns the real count; this local
  // value is just a mirror restored from a cache for instant display, then
  // overwritten by the authoritative server count on load and on every report.
  const [violations, setViolations] = useState(() => {
    try {
      return Number(localStorage.getItem(`examVio_${examId}`)) || 0;
    } catch {
      return 0;
    }
  });
  const violationsRef = useRef(violations);
  const lastVioRef = useRef(0);
  const terminatedRef = useRef(false); // auto-submitted due to violations

  // Cache the latest known count so a reload shows it immediately (the server
  // value still overrides it, so editing this can't lower the real tally).
  const persistVio = (n) => {
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
  const toggleMark = useCallback(
    (i) =>
      setMarked((prev) => {
        const next = [...prev];
        next[i] = !next[i];
        return next;
      }),
    []
  );
  const jumpToQuestion = useCallback((i) => {
    setMobileView("answers"); // on mobile, make the answer sheet visible first
    // When paginated, switch to the page that holds this question first.
    const { perPage, pageSize } = pagingRef.current;
    if (perPage > 0) setExamPage(Math.floor(i / pageSize));
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
  const examPageSize = examPerPage > 0 ? examPerPage : Math.max(1, totalCount);
  const examPageCount = Math.max(1, Math.ceil(Math.max(1, totalCount) / examPageSize));
  const safeExamPage = Math.min(Math.max(0, examPage), examPageCount - 1);
  const examRange =
    examPerPage > 0
      ? { start: safeExamPage * examPageSize, end: safeExamPage * examPageSize + examPageSize }
      : null;
  pagingRef.current = { perPage: examPerPage, pageSize: examPageSize };

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
        setTimeout(() => submitAnswerSheet(), 0);
        return;
      }
      // Structured exams have no PDF — skip the fetch (and its 404).
      if (data.mode !== "structured") {
        dispatch(getPdfByExam({ examId }))
          .unwrap()
          .then((pdf) => {
            // eslint-disable-next-line no-console
            console.log("[PDF] getPdfByExam ->", pdf?.path);
            if (!cancelledRef.current) setPdfData(pdf?.path || null);
          })
          .catch((e) => {
            // eslint-disable-next-line no-console
            console.error("[PDF] getPdfByExam failed:", e);
          });
      }
    } catch (err) {
      if (cancelledRef.current) return;
      const reason = err?.reason;
      if (reason === "password_required" || reason === "password_wrong") {
        setAccess("password");
        if (reason === "password_wrong") setPwError("Şifrə yanlışdır");
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
    attemptStart(""); // try without a password first; protected exams prompt
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

  // Persist draft answers on change.
  useEffect(() => {
    try {
      localStorage.setItem(answersKey, JSON.stringify(answers));
    } catch {
      /* ignore */
    }
  }, [answers, answersKey]);

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
    autosaveAnswers(examId, selectedAnswers, attempt.attemptId).catch(() => {});
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
    const id = setInterval(saveDraftToServer, 25000);
    const onVis = () => {
      if (document.visibilityState === "hidden") saveDraftToServer();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [saveDraftToServer, access, attempt?.attemptId]);

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
        .map((a) => ({
          type: a?.type,
          answer: a?.answer,
          ...(a?.photo ? { photo: a.photo } : {}),
        }));
      // The server scores it (the browser never had the answer key).
      await dispatch(
        addResult({
          examId,
          resultData: {
            selectedAnswers,
            violations: violationsRef.current,
            terminated: terminatedRef.current,
            attemptId: attempt?.attemptId,
          },
        })
      ).unwrap();
      localStorage.removeItem(answersKey);
      localStorage.removeItem(vioKey);
      navigate(`/exam/${examId}/result`);
    } catch (error) {
      // If the attempt is already over (finished on another device, claimed, or
      // expired) there's nothing left to submit — just open the result page
      // instead of leaving the student stuck on a dead exam.
      const msg = String((error && error.message) || error || "");
      if (/bağlan|tapılmad|vaxt|bitib|already/i.test(msg)) {
        localStorage.removeItem(answersKey);
        localStorage.removeItem(vioKey);
        navigate(`/exam/${examId}/result`);
        return;
      }
      // otherwise: a real error; the addResult slice already toasted it
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Multi-device sync: the same attempt can be open on another device, which may
  // add violations, terminate, or submit it. Poll the server so this device's
  // eye-icon stays in sync and it finishes/redirects instead of getting stuck on
  // a dead attempt (e.g. "active exam not found" with no way out).
  useEffect(() => {
    if (access !== "allowed") return;
    let stopped = false;

    const goToResult = (msg) => {
      if (submittingRef.current) return;
      submittingRef.current = true; // stop the deadline timer from re-firing
      if (msg) toast.info(msg);
      try {
        localStorage.removeItem(answersKey);
        localStorage.removeItem(vioKey);
      } catch {
        /* ignore */
      }
      navigate(`/exam/${examId}/result`);
    };

    const poll = async () => {
      let s;
      try {
        s = await getAttemptStatus(examId);
      } catch {
        return; // transient; retry next tick
      }
      if (stopped || submittingRef.current || !s) return;
      // Finished/expired on another device — open the result here too.
      if (s.active === false) {
        goToResult("İmtahan başqa cihazda bağlandı.");
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
        submitAnswerSheet(); // submits, or redirects if already claimed
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
        submitAnswerSheet();
      } else {
        toast.warn(`Diqqət! İmtahandan çıxmaq qadağandır (${count}/${ANTICHEAT_LIMIT}).`);
      }
    };

    const registerViolation = (reason) => {
      if (submittingRef.current || terminatedRef.current) return;
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

    const onVisibility = () => {
      if (document.visibilityState === "hidden") registerViolation("hidden");
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
    const value = e.target.value;
    setAnswers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], answer: value, type };
      return updated;
    });
  }, []);

  // Attach (or clear, with "") the worked-solution photo URL for a question.
  const handlePhotoChange = useCallback((index, url) => {
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

  // Password-protected exam: prompt before anything loads.
  if (access === "password") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg p-4">
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
        <Spinner size={44} className="text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-bg">
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
                onJump={jumpToQuestion}
                onFinish={structured ? () => setConfirmFinish(true) : undefined}
                finishing={isSubmitting}
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
                onJump={jumpToQuestion}
                onFinish={() => setConfirmFinish(true)}
                finishing={isSubmitting}
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
                />
              </div>
            </div>
            <div className="shrink-0 border-t border-line p-3 sm:p-4">
              <div className="mx-auto w-full max-w-2xl">
                {examPerPage > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setExamPage((p) => Math.max(0, p - 1))}
                      disabled={safeExamPage <= 0}
                    >
                      ← Əvvəlki
                    </Button>
                    <span className="hidden text-sm font-semibold text-muted sm:block">
                      {safeExamPage + 1} / {examPageCount}
                    </span>
                    {isLastPage ? (
                      <Button
                        type="button"
                        onClick={() => setConfirmFinish(true)}
                        disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
              <PdfOpener pdfFile={pdfData} />
            </div>
          </div>

          {/* Answers column */}
          <div
            className={`relative min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft lg:flex ${
              mobileView === "answers" ? "flex" : "hidden"
            }`}
          >
            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {pdfData ? (
                <QuestionType
                  answers={answers}
                  questions={questions}
                  handleAnswerChange={handleAnswerChange}
                  marked={marked}
                  onToggleMark={toggleMark}
                  allowPhoto={allowPhoto}
                  onPhotoChange={handlePhotoChange}
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
      )}

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
