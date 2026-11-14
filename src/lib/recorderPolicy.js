/*
 * When the session recorder runs, and what it calls things. Ported from Examopia
 * (2026-11-14).
 *
 * A visitor's visit is recorded into memory only, and thrown away if they leave
 * without signing in. Once they sign up or log in as a teacher or a student the
 * visit is kept and sent to the server until they leave. Never sent: admins and
 * bots.
 *
 * Kept free of rrweb so it can be tested on its own.
 */

// Never recorded: taking an exam (timed: the recorder's work must not slow a
// student's answer, and the anti-cheat watches that page).
const EXCLUDED = [/^\/exam\/[^/]+\/start\/?$/];
export const isExcludedPath = (path) => EXCLUDED.some((re) => re.test(String(path || "")));

const age = (user, now) => now - new Date(user?.createdAt || 0).getTime();
/* Signed up within the last ten minutes: this visit is the one they registered in. */
export const justRegistered = (user, now = Date.now()) => !!user?.createdAt && age(user, now) <= 10 * 60000;

/* An account whose visits are recorded: a teacher or a student (never an admin or a parent). */
export const recordsAccount = (user) => user?.role === "teacher" || user?.role === "student";

// Automated browsers, crawlers and speed tests are not visitors.
export const looksLikeBot = (nav) => !!nav && (nav.webdriver === true || /bot\b|bot\/|crawl|spider|headless|lighthouse|pagespeed/i.test(String(nav.userAgent || "")));

/*
 * off    nothing runs
 * buffer recording into memory; nothing leaves the browser
 * live   recording and sending to the server
 * pause  the recorder stops for a page that is never recorded, and resumes after
 */
export const decide = ({ authReady, isLoggedIn, user, path, now = Date.now(), bot = false }) => {
  if (bot) return "off";
  if (isLoggedIn && user && !recordsAccount(user, now)) return "off";
  if (isExcludedPath(path)) return "pause";
  if (!authReady || !isLoggedIn) return "buffer";
  return "live";
};

/* An API address as a path: "https://api.bunkermath.az/api/quiz/addExam?x=1" → "/api/quiz/addExam". */
export const pathOf = (url) => {
  try {
    const u = new URL(String(url || ""), "https://bunkermath.az");
    return u.pathname;
  } catch {
    return String(url || "").split("?")[0];
  }
};

const CLICKABLE = 'button, a, [role="button"], [role="tab"], [role="menuitem"], [role="option"], [role="switch"], [role="radio"], [role="checkbox"], summary, label, select, input[type="checkbox"], input[type="radio"], input[type="submit"]';

/*
 * What a click was on, in words a person would use: the button's text or
 * label. Never what someone typed: for a text field it says only that it was
 * one.
 */
export const clickLabel = (target) => {
  const start = target && target.nodeType === 1 ? target : target?.parentElement;
  if (!start || typeof start.closest !== "function") return null;
  const el = start.closest(CLICKABLE);
  if (!el) {
    const field = start.closest("input, textarea, [contenteditable='true']");
    if (field) return { tag: field.tagName.toLowerCase(), label: field.getAttribute("aria-label") || field.getAttribute("placeholder") || field.getAttribute("name") || "mətn sahəsi" };
    return null;
  }
  const text = (el.getAttribute("aria-label") || el.innerText || el.textContent || el.getAttribute("title") || el.getAttribute("name") || "")
    .replace(/\s+/g, " ")
    .trim();
  return {
    tag: el.tagName.toLowerCase(),
    label: text.length > 80 ? `${text.slice(0, 79)}…` : text || el.tagName.toLowerCase(),
    href: el.tagName === "A" ? pathOf(el.getAttribute("href")) : undefined,
  };
};

/*
 * Requests that mark a step forward, written on the timeline when they
 * succeed, so the moment someone stopped short is plain to see.
 */
const MILESTONES = [
  ["POST", /^\/api\/users\/register\/?$/, "Qeydiyyatdan keçdi"],
  ["POST", /^\/api\/users\/(login|loginWithCode\/[^/]+|google\/callback\/?|device\/login)$/, "Daxil oldu"],
  ["POST", /^\/api\/quiz\/addClass\/?$/, "Sinif yaratdı"],
  ["POST", /^\/api\/quiz\/addExam\/[^/]+$/, "İmtahan yaratdı"],
  ["POST", /^\/api\/quiz\/addQuestion\/[^/]+$/, "Sualları saxladı"],
  ["POST", /^\/api\/quiz\/generateQuestions(Stream)?(\/[^/]+)?$/, "AI ilə sual yaratdı"],
  // A student's steps forward (BunkerMath).
  ["POST", /^\/api\/quiz\/enroll\/?$/, "Sinfə qoşuldu"],
  ["POST", /^\/api\/quiz\/addExamToUser\/[^/]+$/, "İmtahanı götürdü"],
];
export const milestoneFor = (method, path) => {
  const m = MILESTONES.find(([verb, re]) => verb === String(method || "").toUpperCase() && re.test(String(path || "")));
  return m ? m[2] : null;
};
