import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FiUsers,
  FiAlertTriangle,
  FiClock,
  FiCheckCircle,
  FiExternalLink,
  FiAward,
  FiMaximize,
  FiX,
  FiRepeat,
  FiCheck,
} from "react-icons/fi";
import AccountLayout from "../../components/AccountLayout";
import CenterLoader from "../../components/ui/CenterLoader";
import { getLiveAttempts } from "../../../redux/features/quiz/quizService";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";

const pad = (n) => String(n).padStart(2, "0");
const fmtClock = (ms) => {
  let s = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

const MEDALS = ["🥇", "🥈", "🥉"];
const BIG_PAGE = 12; // students per page on the command-center display

// Smoothly count a number toward its new value (ease-out) so the big-screen hero
// stats "tick" instead of jumping. Starts from whatever is currently shown.
function useCountUp(target, ms = 700) {
  const [val, setVal] = useState(target);
  const raf = useRef(0);
  useEffect(() => {
    const from = val;
    if (from === target) return undefined;
    let start = 0;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return val;
}

const LiveExam = () => {
  useRedirectLoggedOutUser("/login");
  const { examId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [now, setNow] = useState(Date.now());
  const [bigScreen, setBigScreen] = useState(false);
  const [bigPage, setBigPage] = useState(0);
  // Teacher toggle: colour each active student's question grid by right/wrong (live).
  const [showCorrectness, setShowCorrectness] = useState(false);
  const ccRef = useRef(null);

  useEffect(() => {
    let on = true;
    const load = async () => {
      try {
        const d = await getLiveAttempts(examId);
        if (on) {
          setData(d);
          setErr("");
        }
      } catch (e) {
        if (on) setErr(e?.response?.data?.message || "Yüklənmədi");
      } finally {
        if (on) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 2000); // auto-refresh (near real-time)
    return () => {
      on = false;
      clearInterval(id);
    };
  }, [examId]);

  // 1s tick so the countdown + clock move between polls.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Exiting fullscreen (Esc / browser UI) leaves command-center mode too.
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setBigScreen(false);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const enterBigScreen = () => {
    setBigScreen(true);
    setBigPage(0);
    const el = ccRef.current || document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  };
  const exitBigScreen = () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    setBigScreen(false);
  };

  // WRITERS ("YAZIR") hold a STABLE order (alphabetical by name) so their cards never
  // jump around as they answer. FINISHED students ("BİTİRƏNLƏR") are a LEADERBOARD — the
  // 🥇🥈🥉 rank medals mean highest score first — so they sort by score DESCENDING
  // (unscored / pending-review fall to the bottom). Never mix the two orders.
  // Anti-cheat: when ON, every student card shows a live "X/limit" violation counter
  // (times they left the exam) so proctoring is visible even at 0 — not only once it fires.
  const antiCheat = !!data?.antiCheat;
  const violationLimit = data?.violationLimit || 3;
  const rawStudents = data?.students || [];
  const byName = (a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "az", { sensitivity: "base" }) ||
    String(a.attemptId || "").localeCompare(String(b.attemptId || ""));
  const activeStudents = rawStudents.filter((s) => !s.finished).slice().sort(byName);
  const finishedStudents = rawStudents
    .filter((s) => s.finished)
    .slice()
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0) || byName(a, b));
  const students = [...activeStudents, ...finishedStudents];
  const total = data?.total || 0;
  const totalMarks = data?.totalMarks || 0;
  const activeCount = data?.activeCount || 0;
  const finishedCount = data?.finishedCount || 0;

  // Class-wide aggregates for the command-center header.
  const answeredTotal = students.reduce((sum, s) => sum + (s.answeredCount || 0), 0);
  const scored = finishedStudents.filter((s) => typeof s.score === "number");
  const avgScore = scored.length
    ? Math.round(scored.reduce((sum, s) => sum + s.score, 0) / scored.length)
    : 0;

  // Auto-paginate the command-center grid when a class overflows one screen.
  const bigPageCount = Math.max(1, Math.ceil(students.length / BIG_PAGE));
  useEffect(() => {
    if (!bigScreen || bigPageCount <= 1) {
      setBigPage(0);
      return undefined;
    }
    const id = setInterval(() => setBigPage((p) => (p + 1) % bigPageCount), 9000);
    return () => clearInterval(id);
  }, [bigScreen, bigPageCount]);
  const safeBigPage = bigPage % bigPageCount;
  const bigShown = students.slice(safeBigPage * BIG_PAGE, safeBigPage * BIG_PAGE + BIG_PAGE);

  const heroActive = useCountUp(activeCount);
  const heroScore = useCountUp(avgScore);
  const heroAnswered = useCountUp(answeredTotal);
  const heroFinished = useCountUp(finishedCount);

  // ── Normal active writer card ───────────────────────────────────────────────
  const ActiveCard = (s) => {
    const remaining = s.expiresAt ? new Date(s.expiresAt).getTime() - now : 0;
    const qTotal = s.total || total || 0;
    const answeredArr = Array.isArray(s.answered) ? s.answered : null;
    const answeredCount = s.answeredCount || 0;
    const pct = qTotal > 0 ? Math.round((answeredCount / qTotal) * 100) : 0;
    const stale = !s.active;
    const live = !stale && !s.terminated;
    const cur = s.currentQuestion || 0;
    return (
      <div
        key={s.attemptId}
        className={`rounded-2xl border bg-surface p-4 shadow-soft transition-colors ${
          s.terminated ? "border-danger/40" : stale ? "border-line" : "border-success/40"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate font-display text-base font-bold text-text">{s.name}</p>
            {s.attemptNo > 1 && (
              <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-primary">
                {s.attemptNo}. cəhd
              </span>
            )}
          </div>
          {s.terminated ? (
            <span className="shrink-0 rounded-full bg-danger/12 px-2.5 py-0.5 text-xs font-bold text-danger">
              Dayandırıldı
            </span>
          ) : (
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                stale ? "bg-surface2 text-muted" : "bg-success/12 text-success"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${stale ? "bg-muted" : "bg-success"}`} />
              {stale ? "Boşdadır" : "Aktiv"}
            </span>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-text">
            <span className="relative flex h-2 w-2">
              {live && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  live ? "bg-primary" : "bg-muted"
                }`}
              />
            </span>
            {cur ? (
              <>
                Sual <span className="tabular-nums">{cur}</span>
                <span className="font-normal text-muted">/ {qTotal}</span>
              </>
            ) : (
              <span className="text-muted">Gözləyir</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-bold tabular-nums text-text">
            <FiClock className="text-muted" /> {fmtClock(remaining)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {Array.from({ length: qTotal }).map((_, i) => {
            const n = i + 1;
            const isAns = answeredArr ? !!answeredArr[i] : i < answeredCount;
            const isCur = cur === n && !s.terminated;
            // When the teacher turns on "Cavabları yoxla", colour by right/wrong.
            const verdict = showCorrectness && Array.isArray(s.correctness) ? s.correctness[i] : null;
            const cellCls = verdict
              ? verdict === "correct"
                ? "bg-success text-white"
                : verdict === "wrong"
                ? "bg-danger text-white"
                : verdict === "manual"
                ? "bg-warning text-white"
                : "bg-surface2 text-muted" // unanswered / section block
              : isAns
              ? "bg-primary text-white"
              : "bg-surface2 text-muted";
            return (
              <div key={n} className="relative h-7 w-7">
                {isCur && (
                  <span className="absolute inset-0 animate-ping rounded-md bg-primary/40" />
                )}
                <span
                  className={`relative flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-bold tabular-nums transition-colors ${
                    isCur ? "ring-2 ring-primary ring-offset-1 ring-offset-surface " : ""
                  }${cellCls}`}
                >
                  {n}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-text">
            <FiCheckCircle className="text-success" /> {answeredCount}/{qTotal} cavab
            <span className="font-normal text-muted">· {pct}%</span>
          </span>
          {antiCheat && (
            <span
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-semibold ${
                s.violations >= violationLimit
                  ? "bg-danger/12 text-danger"
                  : s.violations > 0
                  ? "bg-warning/12 text-warning"
                  : "bg-surface2 text-muted"
              }`}
              title="İmtahandan çıxma sayı"
            >
              <FiAlertTriangle /> {s.violations || 0}/{violationLimit}
            </span>
          )}
        </div>
      </div>
    );
  };

  // ── Normal finished student card (mini-leaderboard) ─────────────────────────
  const FinishedCard = (s, rank) => {
    const qTotal = s.total || total || 0;
    const answeredCount = s.answeredCount || 0;
    const score = typeof s.score === "number" ? s.score : null;
    const pct = totalMarks > 0 && score != null ? Math.round((score / totalMarks) * 100) : null;
    const flagged = s.terminated;
    // How long they spent (submit − start), when both timestamps are known.
    const durMin =
      s.finishedAt && s.startedAt
        ? Math.max(1, Math.round((new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()) / 60000))
        : null;
    // Percent tints the score block: strong ≥70, ok ≥40, weak below.
    const scoreTone = flagged
      ? "text-danger"
      : pct == null
      ? "text-text"
      : pct >= 70
      ? "text-success"
      : pct >= 40
      ? "text-amber-500"
      : "text-danger";
    return (
      <div
        key={s.attemptId}
        className={`relative flex animate-fade-in flex-col overflow-hidden rounded-3xl border bg-gradient-to-br p-5 shadow-soft transition-shadow hover:shadow-lift ${
          flagged
            ? "border-danger/40 from-danger/[0.06] to-surface"
            : "border-success/45 from-success/[0.09] to-surface"
        }`}
      >
        <span
          className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl ${
            flagged ? "bg-danger/15" : "bg-success/20"
          }`}
        />

        {/* Header: rank + name (+ attempt) and finish status */}
        <div className="relative flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg font-black tabular-nums ${
                !flagged && rank <= 3 ? "bg-transparent" : "bg-surface2 text-muted"
              }`}
              title={`${rank}. yer`}
            >
              {!flagged && rank <= 3 ? MEDALS[rank - 1] : rank}
            </span>
            <div className="min-w-0">
              <p className="min-w-0 truncate font-display text-lg font-bold leading-tight text-text">{s.name}</p>
              <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-muted">
                <FiRepeat className="text-[10px]" /> {s.attemptNo || 1}. cəhd
              </span>
            </div>
          </div>
          {flagged ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-danger/12 px-3 py-1 text-xs font-bold text-danger">
              <FiAlertTriangle /> Dayandırıldı
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">
              <FiCheckCircle /> Bitirdi
            </span>
          )}
        </div>

        {/* Score hero */}
        <div className="relative mt-4 flex items-end gap-3">
          {score != null ? (
            <>
              <span className={`font-display text-5xl font-black leading-none tabular-nums ${scoreTone}`}>
                {score}
              </span>
              {totalMarks > 0 && (
                <span className="mb-1 text-xl font-bold text-muted">/{totalMarks}</span>
              )}
              {pct != null && (
                <span
                  className={`mb-1.5 ml-auto rounded-lg px-2.5 py-1 text-sm font-bold ${
                    flagged
                      ? "bg-danger/12 text-danger"
                      : pct >= 70
                      ? "bg-success/15 text-success"
                      : pct >= 40
                      ? "bg-amber-500/15 text-amber-600"
                      : "bg-danger/12 text-danger"
                  }`}
                >
                  {pct}%
                </span>
              )}
            </>
          ) : (
            <span className="text-lg font-bold text-muted">Nəticə hazır deyil</span>
          )}
        </div>

        {/* Stat chips */}
        <div className="relative mt-4 flex flex-wrap items-center gap-2 border-t border-line/70 pt-3.5 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface2/70 px-2.5 py-1 font-semibold text-text">
            <FiCheck className="text-success" /> {answeredCount}/{qTotal} cavab
          </span>
          {durMin != null && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface2/70 px-2.5 py-1 font-medium text-muted">
              <FiClock /> {durMin} dəq
            </span>
          )}
          {antiCheat && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold ${
                flagged || s.violations >= violationLimit
                  ? "bg-danger/12 text-danger"
                  : s.violations > 0
                  ? "bg-warning/12 text-warning"
                  : "bg-surface2/70 text-muted"
              }`}
              title="İmtahandan çıxma sayı"
            >
              <FiAlertTriangle /> {s.violations || 0}/{violationLimit}
            </span>
          )}
        </div>

        {s.pendingReview && (
          <p className="relative mt-3 inline-flex items-center gap-1 self-start rounded-lg bg-amber-500/12 px-2.5 py-1 text-xs font-semibold text-amber-600">
            Əl ilə yoxlanmalı — bal dəyişə bilər
          </p>
        )}

        {s.resultId && (
          <a
            href={`/result/${s.resultId}/review`}
            target="_blank"
            rel="noopener noreferrer"
            className="relative mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-fg shadow-soft transition-all duration-200 ease-out-quint hover:bg-primary-hover hover:shadow-glow"
          >
            <FiExternalLink /> Nəticəyə bax
          </a>
        )}
      </div>
    );
  };

  // ── Command-center card (dark, scaled for a big display) ────────────────────
  const BigCard = (s, rank) => {
    const qTotal = s.total || total || 0;
    const answeredArr = Array.isArray(s.answered) ? s.answered : null;
    const answeredCount = s.answeredCount || 0;
    const cur = s.currentQuestion || 0;
    const live = s.active && !s.terminated;

    if (s.finished) {
      const score = typeof s.score === "number" ? s.score : null;
      const pct = totalMarks > 0 && score != null ? Math.round((score / totalMarks) * 100) : null;
      const flagged = s.terminated;
      const durMin =
        s.finishedAt && s.startedAt
          ? Math.max(
              1,
              Math.round(
                (new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()) / 60000
              )
            )
          : null;
      return (
        <div
          key={s.attemptId}
          className={`relative flex animate-fade-in flex-col overflow-hidden rounded-3xl border p-5 shadow-sm ${
            flagged ? "border-rose-300 bg-rose-50" : "border-emerald-300 bg-emerald-50"
          }`}
        >
          <span
            className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl ${
              flagged ? "bg-rose-300/40" : "bg-emerald-300/45"
            }`}
          />
          <div className="relative flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="text-2xl leading-none">
                {!flagged && rank <= 3 ? MEDALS[rank - 1] : <span className="text-slate-400">#{rank}</span>}
              </span>
              <div className="min-w-0">
                <p className="min-w-0 truncate text-xl font-extrabold tracking-tight text-slate-900">{s.name}</p>
                <span className="text-xs font-semibold text-slate-500">{s.attemptNo || 1}. cəhd</span>
              </div>
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${
                flagged ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {flagged ? <FiAlertTriangle /> : <FiCheckCircle />}
              {flagged ? "Dayandı" : "Bitirdi"}
            </span>
          </div>

          {/* Score hero + big status medallion */}
          <div className="relative mt-4 flex items-end justify-between gap-3">
            <div>
              {score != null ? (
                <>
                  <div className="flex items-end gap-2">
                    <span
                      className={`font-display text-6xl font-black leading-none ${
                        flagged ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {score}
                    </span>
                    {totalMarks > 0 && (
                      <span className="mb-1 text-2xl font-bold text-slate-400">/{totalMarks}</span>
                    )}
                  </div>
                  {pct != null && (
                    <p className="mt-1 text-lg font-bold text-slate-500">{pct}% nəticə</p>
                  )}
                </>
              ) : (
                <p className="text-xl font-bold text-slate-400">Nəticə hazır deyil</p>
              )}
            </div>
            <span
              className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-4xl ${
                flagged ? "bg-rose-100 text-rose-500" : "bg-emerald-100 text-emerald-500"
              }`}
            >
              <FiCheckCircle />
            </span>
          </div>

          {/* Stat strip */}
          <div className="relative mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-slate-900/[0.06] pt-3 text-sm font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <FiCheckCircle className="text-emerald-500" /> {answeredCount}/{qTotal} cavab
            </span>
            {durMin != null && (
              <span className="inline-flex items-center gap-1.5">
                <FiClock className="text-slate-400" /> {durMin} dəq
              </span>
            )}
            {antiCheat && (
              <span
                className={`inline-flex items-center gap-1.5 ${
                  s.terminated || s.violations >= violationLimit
                    ? "text-rose-600"
                    : s.violations > 0
                    ? "text-amber-600"
                    : "text-slate-400"
                }`}
              >
                <FiAlertTriangle /> {s.violations || 0}/{violationLimit} çıxış
              </span>
            )}
          </div>

          {s.pendingReview && (
            <p className="relative mt-2.5 inline-flex items-center gap-1 self-start rounded-lg bg-amber-100 px-2.5 py-1 text-sm font-semibold text-amber-700">
              Əl ilə yoxlanmalı — bal dəyişə bilər
            </p>
          )}

          {s.resultId && (
            <a
              href={`/result/${s.resultId}/review`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              <FiExternalLink /> Nəticəyə bax
            </a>
          )}
        </div>
      );
    }

    return (
      <div
        key={s.attemptId}
        className={`relative overflow-hidden rounded-3xl border p-5 shadow-sm ${
          s.terminated
            ? "border-rose-300 bg-rose-50"
            : live
            ? "border-indigo-300 bg-white"
            : "border-slate-200 bg-white"
        }`}
      >
        {live && (
          <span className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-indigo-300/30 blur-3xl" />
        )}
        <div className="relative flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xl font-extrabold tracking-tight text-slate-900">{s.name}</p>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${
              s.terminated
                ? "bg-rose-100 text-rose-700"
                : live
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {!s.terminated && (
              <span className="relative flex h-2 w-2">
                {live && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/70" />
                )}
                <span className={`relative h-2 w-2 rounded-full ${live ? "bg-emerald-500" : "bg-slate-400"}`} />
              </span>
            )}
            {s.terminated ? "Dayandı" : live ? "Yazır" : "Boşda"}
          </span>
        </div>

        <div className="relative mt-2.5 flex items-center justify-between text-lg font-bold text-slate-700">
          <span>
            Sual <span className="tabular-nums text-slate-900">{cur || "—"}</span>
            <span className="text-slate-400"> / {qTotal}</span>
          </span>
          <span className="tabular-nums text-slate-500">
            {qTotal > 0 ? Math.round((answeredCount / qTotal) * 100) : 0}%
          </span>
        </div>

        {/* Big question grid — same indigo ring + ping design as the small cards */}
        <div className="relative mt-3 flex flex-wrap gap-2">
          {Array.from({ length: qTotal }).map((_, i) => {
            const n = i + 1;
            const isAns = answeredArr ? !!answeredArr[i] : i < answeredCount;
            const isCur = cur === n && !s.terminated;
            return (
              <div key={n} className="relative h-9 w-9">
                {isCur && (
                  <span className="absolute inset-0 animate-ping rounded-lg bg-indigo-500/40" />
                )}
                <span
                  className={`relative flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold tabular-nums transition-colors ${
                    isCur ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-white " : ""
                  }${isAns ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-500"}`}
                >
                  {n}
                </span>
              </div>
            );
          })}
        </div>

        {antiCheat && (
          <p
            className={`relative mt-3 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-bold ${
              s.violations >= violationLimit
                ? "bg-rose-100 text-rose-700"
                : s.violations > 0
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-500"
            }`}
            title="İmtahandan çıxma sayı"
          >
            <FiAlertTriangle /> {s.violations || 0}/{violationLimit} çıxış
          </p>
        )}
      </div>
    );
  };

  const HeroStat = (value, label, accent) => (
    <div key={label} className="flex flex-col">
      <span className={`font-display text-5xl font-black leading-none tabular-nums sm:text-6xl ${accent}`}>
        {value}
      </span>
      <span className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-sm">
        {label}
      </span>
    </div>
  );

  return (
    <>
      <AccountLayout
        title="Canlı izləmə"
        subtitle={data?.examName || "İmtahanı real vaxtda izlə"}
        actions={
          students.length > 0 ? (
            <button
              type="button"
              onClick={enterBigScreen}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg shadow-soft transition-all duration-200 ease-out-quint hover:bg-primary-hover hover:shadow-glow"
            >
              <FiMaximize /> Böyük ekran
            </button>
          ) : null
        }
      >
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-success/12 px-3 py-1.5 text-sm font-semibold text-success">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
            </span>
            {activeCount} aktiv yazır
          </span>
          {finishedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1.5 text-sm font-semibold text-primary">
              <FiAward /> {finishedCount} bitirdi
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-muted">
            <FiUsers /> {students.length} sessiya
          </span>
          <span className="text-xs text-muted">Canlı yenilənir</span>
          {activeStudents.length > 0 && (
            <button
              type="button"
              onClick={() => setShowCorrectness((v) => !v)}
              title="Şagirdlərin cavablarının düzgünlüyünü canlı göstər"
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                showCorrectness
                  ? "bg-primary text-primary-fg shadow-soft"
                  : "border border-line bg-surface text-text hover:border-primary/40 hover:text-primary"
              }`}
            >
              <FiCheckCircle /> {showCorrectness ? "Düzgünlüyü gizlə" : "Cavabları yoxla"}
            </button>
          )}
          {activeStudents.length > 0 && (
            <span className="ml-auto flex flex-wrap items-center gap-3 text-xs text-muted">
              {showCorrectness ? (
                <>
                  <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-success" /> Düzgün</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-danger" /> Səhv</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-warning" /> Əl ilə</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-surface2 ring-1 ring-line" /> Cavabsız</span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-primary" /> Cavablanıb
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded bg-primary/50" />
                      <span className="relative h-3 w-3 rounded ring-2 ring-primary" />
                    </span>
                    Hazırda yazır
                  </span>
                </>
              )}
            </span>
          )}
        </div>

        {loading ? (
          <CenterLoader className="mt-10" />
        ) : err ? (
          <div className="rounded-2xl border border-danger/30 bg-danger/8 p-8 text-center text-sm font-semibold text-danger">
            {err}
          </div>
        ) : students.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-surface p-16 text-center text-muted">
            Hazırda bu imtahanı yazan yoxdur.
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {activeStudents.length > 0 && (
              <div>
                <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-muted">
                  Yazır <span className="text-muted/60">({activeStudents.length})</span>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {activeStudents.map((s) => ActiveCard(s))}
                </div>
              </div>
            )}

            {finishedStudents.length > 0 && (
              <div>
                <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-muted">
                  <FiAward className="text-primary" /> Bitirənlər{" "}
                  <span className="text-muted/60">({finishedStudents.length})</span>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {finishedStudents.map((s, i) => FinishedCard(s, i + 1))}
                </div>
              </div>
            )}
          </div>
        )}
      </AccountLayout>

      {/* ── Command-center (big screen) overlay ─────────────────────────────── */}
      {bigScreen && (
        <div
          ref={ccRef}
          className="fixed inset-0 z-[120] flex flex-col overflow-hidden bg-[#f4f6fc] text-slate-900"
        >
          {/* ambient glows */}
          <span className="pointer-events-none absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-indigo-300/35 blur-[120px]" />
          <span className="pointer-events-none absolute -bottom-40 right-0 h-[32rem] w-[32rem] rounded-full bg-emerald-300/30 blur-[120px]" />
          <span
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(15,23,42,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.7) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />

          {/* Top bar */}
          <div className="relative flex items-center justify-between gap-4 px-8 pt-6">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/70" />
                <span className="relative h-3 w-3 rounded-full bg-emerald-500" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-600">
                  Canlı izləmə
                </p>
                <h1 className="font-display text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {data?.examName || "İmtahan"}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <span className="hidden font-display text-2xl font-bold tabular-nums text-slate-400 sm:block">
                {new Date(now).toLocaleTimeString("az-AZ", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <button
                type="button"
                onClick={exitBigScreen}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
              >
                <FiX /> Çıxış
              </button>
            </div>
          </div>

          {/* Hero stats */}
          <div className="relative mt-5 grid grid-cols-2 gap-6 px-8 sm:grid-cols-4">
            {HeroStat(heroActive, "Aktiv yazır", "text-emerald-600")}
            {HeroStat(
              totalMarks > 0 ? `${heroScore}/${totalMarks}` : heroScore,
              "Orta bal",
              "text-indigo-600"
            )}
            {HeroStat(heroAnswered, "Cavablanan sual", "text-cyan-600")}
            {HeroStat(heroFinished, "Bitirdi", "text-amber-600")}
          </div>

          {/* Student grid (auto-paginated) */}
          <div className="relative mt-6 flex-1 overflow-hidden px-8 pb-6">
            <div className="grid h-full auto-rows-min grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {bigShown.map((s) =>
                BigCard(
                  s,
                  s.finished ? finishedStudents.findIndex((f) => f.attemptId === s.attemptId) + 1 : 0
                )
              )}
            </div>
          </div>

          {/* Page dots */}
          {bigPageCount > 1 && (
            <div className="relative flex items-center justify-center gap-2 pb-5">
              {Array.from({ length: bigPageCount }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === safeBigPage ? "w-8 bg-emerald-500" : "w-2 bg-slate-300"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default LiveExam;
