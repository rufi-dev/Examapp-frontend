// Anti-cheat rules for the exam runner (Quiz.jsx). Pure — no React — so the
// decisions can be tested on their own.
//
// WHY THIS EXISTS (2026-11-08): in one evening 44 attempts were auto-stopped with
// 0 points — 36 of 174 in a single exam. Two things read as "left the exam":
//   1. The phone screen turning off while the student worked on paper. The web
//      fires the SAME hidden/blur events for a screen-off as for switching to
//      another app, and the runner struck the moment they fired.
//   2. Typing an open answer. Phone keyboards (Samsung Galaxy AI "Writing assist",
//      Gboard "Proofread", iOS Writing Tools) put AI buttons on a textarea; their
//      panels take focus from the page, and the runner struck 0.7 s after ANY
//      focus loss — while the student was still looking at the exam.
// Now: the screen is held awake, a short absence only PAUSES the exam (questions
// covered), and a strike is counted only for staying away longer than a grace.
// Every absence is still reported, so the teacher sees it and can judge.

// Auto-submit after this many counted violations (the server enforces the same).
export const ANTICHEAT_LIMIT = 3;

// Away longer than this counts as leaving the exam. Long enough for an accidental
// power-button press, a notification or a system dialog; too short to look an
// answer up in another app and come back unnoticed (and every absence is logged).
export const AWAY_GRACE_MS = 30000;

// The phone turned its OWN screen off (inactivity time-out) because we could not
// hold it on: the student was not touching the screen and simply kept working on
// paper. They get much longer to wake it up again.
export const AUTO_OFF_GRACE_MS = 5 * 60000;

// No touch / key for this long before the page hid = the phone's own screen
// time-out could have done it (Android's shortest is 15 s, iOS's 30 s).
export const AUTO_OFF_IDLE_MS = 14000;

// Shorter than this is a blip (a gesture, a system sheet flashing): not reported.
export const BLIP_MS = 1500;

// How long a not-counted absence must be before the student is told about it.
export const NOTICE_MS = 4000;

// iOS before 18.4 hands out a screen wake lock in a home-screen web app (this PWA)
// that does NOT actually keep the screen on, so it can't be trusted there.
export const wakeLockTrusted = (ua = "", standalone = false) => {
  const ios = /iP(hone|od|ad)/.test(ua) || (/Macintosh/.test(ua) && /Mobile\//.test(ua));
  if (!ios || !standalone) return true;
  const m = /OS (\d+)[_.](\d+)/.exec(ua);
  if (!m) return false;
  const major = Number(m[1]);
  const minor = Number(m[2]);
  return major > 18 || (major === 18 && minor >= 4);
};

// How long this absence may last before it counts, decided when it begins.
//  reason     "hidden" (screen off / another app or tab) | "blur" (another window)
//  idleMs     time since the student last touched the screen / typed
//  wakeHeld   a (trusted) screen wake lock was holding the screen on
export const awayGrace = ({ reason, idleMs, wakeHeld }) => {
  const autoOff = reason === "hidden" && !wakeHeld && idleMs >= AUTO_OFF_IDLE_MS;
  return { graceMs: autoOff ? AUTO_OFF_GRACE_MS : AWAY_GRACE_MS, autoOff };
};

// The verdict for an absence that has ended (or is being checked).
export const judgeAway = ({ awayMs, graceMs }) => {
  if (awayMs < BLIP_MS) return "blip"; // nothing to report
  if (awayMs > graceMs) return "strike"; // counts as leaving the exam
  return "forgiven"; // reported to the teacher, not counted
};

// "45 san" / "2 dəq 10 san" — for the student's notices.
export const fmtAway = (ms) => {
  const s = Math.max(1, Math.round((ms || 0) / 1000));
  if (s < 60) return `${s} san`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} dəq ${r} san` : `${m} dəq`;
};

// A primarily-touch device (phone / tablet): leaving fullscreen there is usually
// the browser's doing (keyboard, gesture bar), not the student's.
export const isTouchDevice = () => {
  try {
    return (
      typeof window !== "undefined" &&
      !!window.matchMedia &&
      window.matchMedia("(pointer: coarse)").matches &&
      !window.matchMedia("(any-pointer: fine)").matches
    );
  } catch {
    return false;
  }
};

// Where an in-progress absence is remembered, so one that ends in a RELOAD (the
// phone discarded the backgrounded tab, or the student reopened the exam) is
// still judged by how long it really lasted.
export const awayStoreKey = (examId, userId, attemptId) =>
  `examAway_${examId}_${userId}_${attemptId}`;
