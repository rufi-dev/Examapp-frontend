/*
 * Which results go into an exported file (PDF / Excel). Owner, 2026-11-12: "before it
 * extracts the PDF I need to filter it: from current dates or specific dates … make sure
 * you can add more filters".
 *
 * Pure (no React), so the export dialog, the files and the tests agree on what a filter
 * means, and the numbers the dialog shows are the numbers the file prints.
 *
 * Days are BAKU days (UTC+4, no daylight saving since 2016) whatever zone the device
 * clock is set to: «Bu gün» is the same day on a laptop set to UTC.
 *
 * ADDING A FILTER: one entry in FILTERS below (its default, whether these results even
 * allow it, when it is on, which results pass, the line printed on the file) and one
 * control in components/results/ResultsExportDialog.jsx. Nothing else changes.
 *
 * 2026-11-13 review (from the Examopia port of this module) fixed here: one pass rule
 * everywhere, filters whose control is hidden are OFF, an empty date range is no filter,
 * «Ən yaxşı» prefers an attempt that was not stopped, Baku days, local phone numbers,
 * "12,5" and reversed score ends.
 */

// ── Baku days ───────────────────────────────────────────────────────────────
const BAKU_MS = 4 * 3600e3;
const DAY_MS = 86400e3;
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/* A moment → its Baku calendar day, "2026-11-08". */
export const dayKey = (t) => {
  const ms = new Date(t).getTime();
  return Number.isFinite(ms) ? new Date(ms + BAKU_MS).toISOString().slice(0, 10) : null;
};
const isDay = (k) => typeof k === "string" && DAY_RE.test(k);
const keyToUtcNoon = (k) => {
  const m = DAY_RE.exec(k);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
};
export const shiftDay = (k, n) => new Date(keyToUtcNoon(k) + n * DAY_MS).toISOString().slice(0, 10);

const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
const MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"];
export const WEEKDAYS_SHORT = ["Bazar", "B.e.", "Ç.a.", "Çər.", "C.a.", "Cümə", "Şənbə"];
const parts = (k) => {
  const m = DAY_RE.exec(k);
  return { y: Number(m[1]), mo: Number(m[2]) - 1, d: Number(m[3]) };
};
export const weekdayOf = (k) => new Date(keyToUtcNoon(k)).getUTCDay();
/* "8 noy" (chips) and "8 noyabr 2026" (files). */
export const dayShort = (k) => {
  const { mo, d } = parts(k);
  return `${d} ${MONTHS_SHORT[mo]}`;
};
export const dayLong = (k) => {
  const { y, mo, d } = parts(k);
  return `${d} ${MONTHS[mo]} ${y}`;
};
/* "14:05" in Baku. */
export const clockOf = (t) => {
  const ms = new Date(t).getTime();
  return Number.isFinite(ms) ? new Date(ms + BAKU_MS).toISOString().slice(11, 16) : "";
};

/* When a result was handed in (a paper sheet: when it was graded). */
export const momentOf = (r) => {
  const ms = r?.createdAt ? new Date(r.createdAt).getTime() : NaN;
  return Number.isFinite(ms) ? ms : null;
};

export const DATE_PRESETS = [
  { key: "all", label: "Hamısı" },
  { key: "today", label: "Bu gün" },
  { key: "yesterday", label: "Dünən" },
  { key: "last7", label: "Son 7 gün" },
  { key: "last30", label: "Son 30 gün" },
  { key: "thisMonth", label: "Bu ay" },
  { key: "custom", label: "Tarix aralığı" },
];

/* The inclusive [from, to] Baku days a date filter means; null = open on that side. */
export function dateWindow(date, now = Date.now()) {
  const today = dayKey(now);
  switch (date?.preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = shiftDay(today, -1);
      return { from: y, to: y };
    }
    case "last7":
      return { from: shiftDay(today, -6), to: today };
    case "last30":
      return { from: shiftDay(today, -29), to: today };
    case "thisMonth":
      return { from: `${today.slice(0, 8)}01`, to: today };
    case "custom": {
      let from = isDay(date.from) ? date.from : null;
      let to = isDay(date.to) ? date.to : null;
      if (from && to && from > to) [from, to] = [to, from]; // typed backwards
      return { from, to };
    }
    default:
      return { from: null, to: null };
  }
}

/* "8 noyabr 2026", "1–8 noyabr 2026", "28 oktyabr – 8 noyabr 2026", "8 noyabr 2026-dən". */
export function windowText({ from, to }) {
  if (from && to) {
    if (from === to) return dayLong(from);
    const a = parts(from);
    const b = parts(to);
    if (a.y === b.y && a.mo === b.mo) return `${a.d}–${dayLong(to)}`;
    if (a.y === b.y) return `${a.d} ${MONTHS[a.mo]} – ${dayLong(to)}`;
    return `${dayLong(from)} – ${dayLong(to)}`;
  }
  if (from) return `${dayLong(from)}-dən`;
  if (to) return `${dayLong(to)}-ə qədər`;
  return "";
}

// ── what a result is ────────────────────────────────────────────────────────
export const studentKey = (r) => {
  const u = r?.userId;
  const id = u && typeof u === "object" ? u._id : u;
  return id ? String(id) : `result:${r?._id}`;
};
export const scoreOf = (r) => {
  const v = r?.earnPoints;
  return v == null || !Number.isFinite(Number(v)) ? null : Number(v);
};
const gradeOf = (r) => String(r?.userId?.grade ?? "").trim();
const isPaper = (r) => r?.source === "paper";
/* A typed number: "12,5" → 12.5, "" → null. */
export const parseNum = (v) => {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const num = (n) => String(Math.round(n * 10) / 10);

/* THE pass rule — the same one the PDF, the Excel and the analytics use. A result
   stopped for violations scores 0 on BunkerMath, so it never passes. */
export const passes = (r, passMark) => {
  const s = scoreOf(r);
  return passMark > 0 && s != null && s >= passMark;
};

// "9" → "9-cu sinif", "6" → "6-cı sinif", "11" → "11-ci sinif"; "Məzun" stays.
const UNIT_SUFFIX = ["", "ci", "ci", "cü", "cü", "ci", "cı", "ci", "ci", "cu"];
const TENS_SUFFIX = ["", "cu", "ci", "cu", "cı", "ci", "cı", "ci", "ci", "cı"];
export const gradeName = (g) => {
  if (!/^\d+$/.test(g)) return g;
  const n = Number(g);
  const suf = n % 10 ? UNIT_SUFFIX[n % 10] : TENS_SUFFIX[Math.floor(n / 10) % 10] || "cu";
  return `${n}-${suf} sinif`;
};

// Phones are stored "+994 50 123 45 67" and typed "050 123…" or "50 123…": compare the
// national number on both sides (drop 994 and the local leading 0).
const nationalDigits = (s) => String(s || "").replace(/\D/g, "").replace(/^994/, "").replace(/^0+/, "");
const matchesQuery = (r, q) => {
  const needle = String(q || "").trim().toLocaleLowerCase("az");
  if (!needle) return true;
  const u = r?.userId || {};
  const digits = nationalDigits(needle);
  return (
    String(u.name || "").toLocaleLowerCase("az").includes(needle) ||
    String(u.email || "").toLocaleLowerCase("az").includes(needle) ||
    (digits.length >= 2 && nationalDigits(u.phone).includes(digits))
  );
};

/* What the exam's results contain: the dialog only offers filters that can change something. */
export function resultFacets(results) {
  const list = (Array.isArray(results) ? results : []).filter(Boolean);
  const exam = list[0]?.examId && typeof list[0].examId === "object" ? list[0].examId : {};
  const students = new Set(list.map(studentKey));
  const days = new Map();
  for (const r of list) {
    const m = momentOf(r);
    if (m == null) continue;
    const k = dayKey(m);
    days.set(k, (days.get(k) || 0) + 1);
  }
  return {
    total: list.length,
    students: students.size,
    hasRetakes: students.size < list.length,
    hasTerminated: list.some((r) => r.terminated),
    hasClean: list.some((r) => !r.terminated),
    hasPaper: list.some(isPaper),
    hasOnline: list.some((r) => !isPaper(r)),
    passMark: Number(exam.passingMarks) > 0 ? Number(exam.passingMarks) : 0,
    maxScore: Number(exam.totalMarks) > 0 ? Number(exam.totalMarks) : 100,
    grades: [...new Set(list.map(gradeOf).filter(Boolean))].sort((a, b) => a.localeCompare(b, "az", { numeric: true })),
    days: [...days.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => (a.key < b.key ? 1 : -1)),
  };
}

export const ATTEMPT_MODES = [
  { key: "all", label: "Hamısı", hint: "Hər cəhd ayrıca sətir" },
  { key: "best", label: "Ən yaxşı", hint: "Hər şagirdin ən yüksək balı" },
  { key: "latest", label: "Sonuncu", hint: "Hər şagirdin son cəhdi" },
  { key: "first", label: "Birinci", hint: "Hər şagirdin ilk cəhdi" },
];

/*
 * Every filter. `stage` says when it judges a result:
 *   "who"   — which results count at all (date, conduct, source, grade, name);
 *   "pick"  — one attempt per student, chosen among what is left;
 *   "score" — judged on the chosen attempt (passed, a score range).
 * So "best attempt + passed" = the students whose best attempt passed.
 *
 * `available(facets)`: false hides the control AND switches the filter off, so a filter
 * remembered from before (a grade no longer in the list, anti-cheat on an exam whose
 * stopped results were restored) never quietly empties the file.
 */
export const FILTERS = [
  {
    key: "date",
    stage: "who",
    def: { preset: "all", from: "", to: "" },
    available: () => true,
    isOn: (v, ctx) => {
      const w = dateWindow(v, ctx.now);
      return !!(w.from || w.to);
    },
    test: (r, v, ctx) => {
      const { from, to } = ctx.window;
      const m = momentOf(r);
      if (m == null) return false;
      const k = dayKey(m);
      return (!from || k >= from) && (!to || k <= to);
    },
    label: (v, ctx) => `Tarix: ${windowText(dateWindow(v, ctx.now))}`,
  },
  {
    key: "attempts",
    stage: "pick",
    def: "all",
    available: (f) => f.hasRetakes,
    isOn: (v) => v === "best" || v === "latest" || v === "first",
    label: (v) => `Cəhd: ${(ATTEMPT_MODES.find((m) => m.key === v)?.hint || "").toLocaleLowerCase("az")}`,
  },
  {
    key: "outcome",
    stage: "score",
    def: "all",
    available: (f) => f.passMark > 0,
    isOn: (v) => v === "passed" || v === "failed",
    test: (r, v, ctx) => (v === "passed" ? passes(r, ctx.passMark) : !passes(r, ctx.passMark)),
    label: (v, ctx) => (v === "passed" ? `Keçənlər (≥ ${num(ctx.passMark)} bal)` : `Keçməyənlər (< ${num(ctx.passMark)} bal)`),
  },
  {
    key: "score",
    stage: "score",
    def: { min: "", max: "" },
    available: () => true,
    isOn: (v) => parseNum(v?.min) != null || parseNum(v?.max) != null,
    test: (r, v) => {
      let lo = parseNum(v.min);
      let hi = parseNum(v.max);
      if (lo != null && hi != null && lo > hi) [lo, hi] = [hi, lo];
      const s = scoreOf(r);
      if (s == null) return false;
      return (lo == null || s >= lo) && (hi == null || s <= hi);
    },
    label: (v) => {
      let lo = parseNum(v.min);
      let hi = parseNum(v.max);
      if (lo != null && hi != null && lo > hi) [lo, hi] = [hi, lo];
      if (lo != null && hi != null) return `Bal: ${num(lo)}–${num(hi)}`;
      return lo != null ? `Bal: ≥ ${num(lo)}` : `Bal: ≤ ${num(hi)}`;
    },
  },
  {
    key: "conduct",
    stage: "who",
    def: "all",
    available: (f) => f.hasTerminated && f.hasClean,
    isOn: (v) => v === "clean" || v === "terminated",
    test: (r, v) => (v === "clean" ? !r.terminated : !!r.terminated),
    label: (v) => (v === "clean" ? "Pozuntusuz" : "Yalnız pozuntuya görə dayandırılanlar"),
  },
  {
    key: "source",
    stage: "who",
    def: "all",
    available: (f) => f.hasPaper && f.hasOnline,
    isOn: (v) => v === "online" || v === "paper",
    test: (r, v) => (v === "paper" ? isPaper(r) : !isPaper(r)),
    label: (v) => (v === "paper" ? "Yalnız kağız" : "Yalnız onlayn"),
  },
  {
    key: "grades",
    stage: "who",
    def: [],
    available: (f) => f.grades.length > 1,
    normalize: (v, f) => (Array.isArray(v) ? v.map(String).filter((g) => f.grades.includes(g)) : []),
    isOn: (v) => v.length > 0,
    test: (r, v) => v.includes(gradeOf(r)),
    label: (v) => `Sinif: ${v.map(gradeName).join(", ")}`,
  },
  {
    key: "query",
    stage: "who",
    def: "",
    available: () => true,
    normalize: (v) => (typeof v === "string" ? v : ""),
    isOn: (v) => !!v.trim(),
    test: (r, v) => matchesQuery(r, v),
    label: (v) => `Axtarış: «${v.trim()}»`,
  },
];
const BY_KEY = Object.fromEntries(FILTERS.map((x) => [x.key, x]));
/* Whether these results can use a filter (its control is shown only then). */
export const isFilterAvailable = (key, facets) => !!BY_KEY[key]?.available(facets);

const clone = (v) => (Array.isArray(v) ? [...v] : v && typeof v === "object" ? { ...v } : v);
export const defaultFilters = () => Object.fromEntries(FILTERS.map((x) => [x.key, clone(x.def)]));

/*
 * What the filters really mean for these results: defaults filled in (an older saved
 * shape), and every filter the results cannot use switched off.
 */
export function effectiveFilters(filters, facets) {
  const out = {};
  for (const x of FILTERS) {
    let v = filters && filters[x.key] !== undefined ? filters[x.key] : clone(x.def);
    if (x.def && typeof x.def === "object" && !Array.isArray(x.def)) v = { ...x.def, ...(v && typeof v === "object" ? v : {}) };
    if (x.normalize) v = x.normalize(v, facets);
    out[x.key] = x.available(facets) ? v : clone(x.def);
  }
  return out;
}

/* The results that go into the file, in the page's order. */
export function applyResultFilters(results, filters, { now = Date.now(), facets } = {}) {
  const list = (Array.isArray(results) ? results : []).filter(Boolean);
  const fc = facets || resultFacets(list);
  const f = effectiveFilters(filters, fc);
  const ctx = { now, passMark: fc.passMark, window: dateWindow(f.date, now) };
  const on = (stage) => FILTERS.filter((x) => x.stage === stage && x.test && x.isOn(f[x.key], ctx));

  const who = on("who");
  let out = list.filter((r) => who.every((x) => x.test(r, f[x.key], ctx)));
  if (BY_KEY.attempts.isOn(f.attempts)) out = pickAttempts(out, f.attempts);
  const score = on("score");
  if (score.length) out = out.filter((r) => score.every((x) => x.test(r, f[x.key], ctx)));
  return out;
}

/*
 * One attempt per student. "best": the highest score, preferring an attempt that was not
 * stopped for violations, ties to the earlier hand-in; "latest" / "first": by hand-in time.
 */
export function pickAttempts(list, mode) {
  const at = (r) => momentOf(r) ?? 0;
  const better = (a, b) => {
    if (mode === "best") {
      if (!!a.terminated !== !!b.terminated) return !a.terminated;
      const sa = scoreOf(a) ?? -Infinity;
      const sb = scoreOf(b) ?? -Infinity;
      if (sa !== sb) return sa > sb;
      return at(a) < at(b);
    }
    if (mode === "latest") return at(a) > at(b);
    return at(a) < at(b); // first
  };
  const pick = new Map();
  for (const r of list) {
    const k = studentKey(r);
    const cur = pick.get(k);
    if (!cur || better(r, cur)) pick.set(k, r);
  }
  const keep = new Set(pick.values());
  return list.filter((r) => keep.has(r));
}

/* The active filters as {key, text} (dialog chips, and the «FİLTR» line printed on the files). */
export function describeFilters(filters, facets, now = Date.now()) {
  const f = effectiveFilters(filters, facets);
  const ctx = { now, passMark: facets.passMark };
  return FILTERS.filter((x) => x.isOn(f[x.key], ctx)).map((x) => ({ key: x.key, text: x.label(f[x.key], ctx) }));
}

/* The filters with one of them back at its default (a chip's ×). */
export const clearFilter = (filters, key) => ({ ...filters, [key]: clone(BY_KEY[key].def) });

/* The live numbers for the dialog (the same rules as the files). */
export function summarize(list, facets) {
  const scores = list.map(scoreOf).filter((s) => s != null);
  const n = scores.length;
  const total = facets.maxScore || 100;
  const bands = [0, 0, 0, 0, 0];
  for (const s of scores) bands[Math.min(4, Math.max(0, Math.floor((s / total) * 5)))] += 1;
  return {
    count: list.length,
    students: new Set(list.map(studentKey)).size,
    avg: n ? scores.reduce((a, b) => a + b, 0) / n : null,
    top: n ? Math.max(...scores) : null,
    low: n ? Math.min(...scores) : null,
    passed: facets.passMark ? list.filter((r) => passes(r, facets.passMark)).length : null,
    bands,
  };
}

/* The best rows first (ties: the earlier hand-in), for the preview. */
export const rankRows = (list) =>
  [...list].sort((a, b) => (scoreOf(b) ?? -Infinity) - (scoreOf(a) ?? -Infinity) || (momentOf(a) ?? 0) - (momentOf(b) ?? 0));

/* "BURAXILIŞ SINAQ 5" → "BURAXILIS-SINAQ-5" (plain letters travel safely through messengers). */
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

/* The file's name: the exam and the Baku days it covers, "BURAXILIS-SINAQ-5_2026-11-08". */
export function fileStem(examName, filters, facets, now = Date.now()) {
  const base = fileSlug(examName);
  const f = effectiveFilters(filters, facets);
  const { from, to } = dateWindow(f.date, now);
  if (from && to) return from === to ? `${base}_${from}` : `${base}_${from}_${to}`;
  if (from) return `${base}_${from}-den`;
  if (to) return `${base}_${to}-e-qeder`;
  return base;
}
