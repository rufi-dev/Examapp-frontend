// Filters for exporting an exam's results (PDF / Excel). Pure — no React — so
// the export dialog, the files and the tests all agree on what a filter means.
//
// Adding a filter: give it a default in DEFAULT_FILTERS, apply it in
// applyResultFilters, describe it in describeFilters (that line is printed on
// the PDF / Excel so a report always says what it covers), and add its control
// in components/results/ResultsExportDialog.jsx.

import { questionVerdict, questionCount } from "./helper.js";

export const DEFAULT_FILTERS = Object.freeze({
  // When the result was submitted (the student's finish time).
  date: { preset: "all", from: "", to: "" },
  // One row per student, or every attempt.
  attempts: "all", // all | best | latest | first
  outcome: "all", // all | passed | failed   (against the exam's pass mark)
  minScore: "",
  maxScore: "",
  conduct: "all", // all | clean | terminated   (anti-cheat)
  source: "all", // all | online | paper
  grades: [], // the students' grades ("9", "11", "Məzun"…); empty = every grade
  query: "", // name / e-mail / phone
});

export const DATE_PRESETS = [
  { key: "all", label: "Hamısı" },
  { key: "today", label: "Bu gün" },
  { key: "yesterday", label: "Dünən" },
  { key: "last7", label: "Son 7 gün" },
  { key: "last30", label: "Son 30 gün" },
  { key: "thisMonth", label: "Bu ay" },
  { key: "custom", label: "Tarix aralığı" },
];

export const ATTEMPT_MODES = [
  { key: "all", label: "Hamısı", hint: "Hər cəhd ayrıca sətir" },
  { key: "best", label: "Ən yaxşı", hint: "Hər şagirdin ən yüksək balı" },
  { key: "latest", label: "Sonuncu", hint: "Hər şagirdin son cəhdi" },
  { key: "first", label: "Birinci", hint: "Hər şagirdin ilk cəhdi" },
];

// ── dates (the teacher's own time zone) ─────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
// "2026-11-08" → local midnight (NOT UTC, which would shift the day in Baku).
export const parseDay = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fmtDay = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
const resultDate = (r) => {
  const d = r && r.createdAt ? new Date(r.createdAt) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

// The [start, end] window a date filter means, or null bounds for "open".
export function dateWindow(date, now = new Date()) {
  const p = (date && date.preset) || "all";
  switch (p) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const y = addDays(now, -1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    case "last7":
      return { start: startOfDay(addDays(now, -6)), end: endOfDay(now) };
    case "last30":
      return { start: startOfDay(addDays(now, -29)), end: endOfDay(now) };
    case "thisMonth":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
    case "custom": {
      let from = parseDay(date.from);
      let to = parseDay(date.to);
      if (from && to && from > to) [from, to] = [to, from]; // typed backwards
      return { start: from ? startOfDay(from) : null, end: to ? endOfDay(to) : null };
    }
    default:
      return { start: null, end: null };
  }
}

// Every day that has submissions, newest first: [{ key, date, count }].
export function submissionDays(results) {
  const map = new Map();
  for (const r of results || []) {
    const d = resultDate(r);
    if (!d) continue;
    const k = dayKey(d);
    const e = map.get(k) || { key: k, date: startOfDay(d), count: 0 };
    e.count += 1;
    map.set(k, e);
  }
  return [...map.values()].sort((a, b) => b.date - a.date);
}

// ── who / what ─────────────────────────────────────────────────────────────
const studentId = (r) => String((r.userId && (r.userId._id || r.userId)) || r._id || "");
const score = (r) => (Number.isFinite(Number(r.earnPoints)) ? Number(r.earnPoints) : 0);
const isPaper = (r) => r.source === "paper";
const gradeOf = (r) => String((r.userId && r.userId.grade) || "").trim();
export const passMarkOf = (results) => Number((results || [])[0]?.examId?.passingMarks) || 0;

// What the results contain — the dialog only offers filters that mean something.
export function resultFacets(results) {
  const list = results || [];
  const grades = [...new Set(list.map(gradeOf).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "az", { numeric: true })
  );
  return {
    total: list.length,
    students: new Set(list.map(studentId)).size,
    hasRetakes: new Set(list.map(studentId)).size < list.length,
    hasPaper: list.some(isPaper),
    hasOnline: list.some((r) => !isPaper(r)),
    hasTerminated: list.some((r) => r.terminated),
    passMark: passMarkOf(list),
    grades,
    days: submissionDays(list),
  };
}

const matchesQuery = (r, q) => {
  if (!q) return true;
  const u = r.userId || {};
  const needle = q.trim().toLowerCase();
  const digits = needle.replace(/\D/g, "");
  return (
    String(u.name || "").toLowerCase().includes(needle) ||
    String(u.email || "").toLowerCase().includes(needle) ||
    (digits.length >= 2 && String(u.phone || "").replace(/\D/g, "").includes(digits))
  );
};

// Apply every filter. Order matters and is deliberate: WHICH results count
// (date, source, conduct, grade, name) first; then one attempt per student is
// chosen among those; then the score-based filters judge what is left — so
// "best attempt + passed" = students whose best attempt passed.
export function applyResultFilters(results, filters = DEFAULT_FILTERS, now = new Date()) {
  const f = { ...DEFAULT_FILTERS, ...(filters || {}) };
  const { start, end } = dateWindow(f.date, now);
  const grades = new Set((f.grades || []).map(String));
  let list = (results || []).filter(Boolean).filter((r) => {
    if (start || end) {
      const d = resultDate(r);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
    }
    if (f.source === "paper" && !isPaper(r)) return false;
    if (f.source === "online" && isPaper(r)) return false;
    if (f.conduct === "clean" && r.terminated) return false;
    if (f.conduct === "terminated" && !r.terminated) return false;
    if (grades.size && !grades.has(gradeOf(r))) return false;
    return matchesQuery(r, f.query);
  });

  if (f.attempts !== "all") {
    const pick = new Map();
    for (const r of list) {
      const k = studentId(r);
      const cur = pick.get(k);
      if (!cur) {
        pick.set(k, r);
        continue;
      }
      const dr = resultDate(r)?.getTime() || 0;
      const dc = resultDate(cur)?.getTime() || 0;
      const better =
        f.attempts === "best"
          ? score(r) > score(cur) || (score(r) === score(cur) && dr > dc)
          : f.attempts === "latest"
          ? dr > dc
          : dr < dc; // first
      if (better) pick.set(k, r);
    }
    list = list.filter((r) => pick.get(studentId(r)) === r);
  }

  const passMark = passMarkOf(results);
  if (passMark && f.outcome === "passed") list = list.filter((r) => !r.terminated && score(r) >= passMark);
  if (passMark && f.outcome === "failed") list = list.filter((r) => r.terminated || score(r) < passMark);
  const min = f.minScore === "" || f.minScore == null ? null : Number(f.minScore);
  const max = f.maxScore === "" || f.maxScore == null ? null : Number(f.maxScore);
  if (Number.isFinite(min)) list = list.filter((r) => score(r) >= min);
  if (Number.isFinite(max)) list = list.filter((r) => score(r) <= max);
  return list;
}

// Live numbers for the dialog's summary.
export function summarize(list, passMark = 0) {
  const scores = list.map(score);
  const n = list.length;
  const avg = n ? scores.reduce((a, b) => a + b, 0) / n : 0;
  let right = 0;
  let qs = 0;
  for (const r of list) {
    const total = questionCount(r);
    qs += total;
    for (let i = 0; i < total; i++) if (questionVerdict(r, i) === "right") right += 1;
  }
  return {
    count: n,
    students: new Set(list.map(studentId)).size,
    avg,
    top: n ? Math.max(...scores) : 0,
    low: n ? Math.min(...scores) : 0,
    passed: passMark ? list.filter((r) => !r.terminated && score(r) >= passMark).length : null,
    accuracy: qs ? right / qs : null,
  };
}

// Human lines describing the active filters — printed on the exported files.
export function describeFilters(filters = DEFAULT_FILTERS, now = new Date()) {
  const f = { ...DEFAULT_FILTERS, ...(filters || {}) };
  const out = [];
  const preset = f.date?.preset || "all";
  if (preset !== "all") {
    const { start, end } = dateWindow(f.date, now);
    const label = DATE_PRESETS.find((p) => p.key === preset)?.label || "";
    if (start && end && dayKey(start) === dayKey(end)) out.push(`Tarix: ${fmtDay(start)}`);
    else if (start && end) out.push(`Tarix: ${fmtDay(start)} – ${fmtDay(end)}`);
    else if (start) out.push(`Tarix: ${fmtDay(start)}-dən`);
    else if (end) out.push(`Tarix: ${fmtDay(end)}-ə qədər`);
    else if (label) out.push(`Tarix: ${label}`);
  }
  const am = ATTEMPT_MODES.find((m) => m.key === f.attempts);
  if (am && f.attempts !== "all") out.push(`Cəhd: ${am.hint.toLowerCase()}`);
  if (f.outcome === "passed") out.push("Yalnız keçənlər");
  if (f.outcome === "failed") out.push("Yalnız keçməyənlər");
  const hasMin = f.minScore !== "" && f.minScore != null;
  const hasMax = f.maxScore !== "" && f.maxScore != null;
  if (hasMin && hasMax) out.push(`Bal: ${f.minScore}–${f.maxScore}`);
  else if (hasMin) out.push(`Bal: ≥ ${f.minScore}`);
  else if (hasMax) out.push(`Bal: ≤ ${f.maxScore}`);
  if (f.conduct === "clean") out.push("Pozuntusuz nəticələr");
  if (f.conduct === "terminated") out.push("Yalnız pozuntuya görə dayandırılanlar");
  if (f.source === "online") out.push("Yalnız onlayn");
  if (f.source === "paper") out.push("Yalnız kağız");
  if (f.grades && f.grades.length) out.push(`Sinif: ${f.grades.join(", ")}`);
  if (f.query && f.query.trim()) out.push(`Axtarış: “${f.query.trim()}”`);
  return out;
}

// How many filters differ from the defaults (badge on the button).
export function activeFilterCount(filters = DEFAULT_FILTERS) {
  return describeFilters(filters).length;
}

// "BURAXILIŞ SINAQ 5" → "BURAXILIS-SINAQ-5" for file names.
export function fileSlug(s) {
  const map = { ə: "e", Ə: "E", ı: "i", İ: "I", ş: "s", Ş: "S", ç: "c", Ç: "C", ğ: "g", Ğ: "G", ö: "o", Ö: "O", ü: "u", Ü: "U" };
  return (
    String(s || "imtahan")
      .replace(/[əƏıİşŞçÇğĞöÖüÜ]/g, (c) => map[c] || c)
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "imtahan"
  );
}
