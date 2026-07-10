// Mirror of the backend exam presets (Backend/helper/examPresets.js) — labels,
// question structure, and negative-marking defaults used by the exam-create form
// and the structured builder. Scoring is computed AUTHORITATIVELY on the backend
// from the preset id; the frontend only seeds the structure + form defaults.

// Last `tail` questions worth `tailEach`, the rest split the remainder equally.
// Mirrors Backend/helper/examPresets.js so the builder PREVIEW matches the
// authoritative server scoring.
function tailEqualPlan(count, totalMarks, tail, tailEach) {
  const n = Number(count) || 0;
  if (n <= 0) return [];
  const t = Math.min(tail, n);
  const restCount = n - t;
  const restEach = restCount > 0 ? (totalMarks - t * tailEach) / restCount : 0;
  const pts = new Array(n);
  for (let i = 0; i < n; i++) pts[i] = i < restCount ? restEach : tailEach;
  return pts;
}

// Blok (DİM), out of 150: each solution-required question (type Cd — the last 3,
// #28-30) = 9 pts; every other question shares the rest of 150 equally. Scored
// BY TYPE so the per-type panel totals 150. No Cd marked → last-3-by-position.
// Mirrors Backend/helper/examPresets.js.
const BLOK_SOLVE_PTS = 9;
function blokPlan(count, types) {
  const n = Number(count) || 0;
  if (n <= 0) return [];
  const t = Array.isArray(types) ? types : [];
  const solveCount = t.filter((x) => x === "Cd").length;
  if (solveCount > 0) {
    const rest = n - solveCount;
    const restEach = rest > 0 ? (150 - BLOK_SOLVE_PTS * solveCount) / rest : 0;
    return Array.from({ length: n }, (_, i) => (t[i] === "Cd" ? BLOK_SOLVE_PTS : restEach));
  }
  return tailEqualPlan(n, 150, 3, BLOK_SOLVE_PTS);
}

// Buraxılış 9-cu sinif (DİM), out of 100: solution-required questions (type Cd,
// the last 4: #22-25) are weighted 2×; everything normalized to 100. 21 normal +
// 4 Cd → 29 units → normal ≈ 3.45, Cd ≈ 6.90. No negative marking. Scored BY TYPE.
function bur9Plan(count, types) {
  const n = Number(count) || 0;
  if (n <= 0) return [];
  const t = Array.isArray(types) ? types : [];
  const weights = Array.from({ length: n }, (_, i) => (t[i] === "Cd" ? 2 : 1));
  const total = weights.reduce((s, w) => s + w, 0) || 1;
  return weights.map((w) => (w / total) * 100);
}

export const PRESETS = {
  buraxilis: {
    id: "buraxilis",
    label: "Buraxılış 11-ci sinif",
    totalMarks: 100,
    slots: [
      { type: "Cm", count: 13 },
      { type: "Co", count: 5 },
      { type: "Cd", count: 7 },
    ],
    pointsPlan: null, // null -> builder uses the legacy questionPoints (out of 100)
    negativeMarking: null,
  },
  "buraxilis-9": {
    id: "buraxilis-9",
    label: "Buraxılış 9-cu sinif",
    totalMarks: 100,
    // 25 tapşırıq: 15 qapalı (#1-15) + 6 açıq (#16-21) + 4 həlli tələb olunan (#22-25).
    slots: [
      { type: "Cm", count: 15 },
      { type: "Co", count: 6 },
      { type: "Cd", count: 4 },
    ],
    pointsPlan: bur9Plan,
    negativeMarking: null,
  },
  "blok-1": {
    id: "blok-1",
    label: "Blok 1 və 2-ci qrup",
    totalMarks: 150,
    slots: [
      { type: "Cm", count: 22 },
      { type: "Co", count: 4 },
      { type: "Cmu", count: 1 },
      { type: "Cd", count: 3 },
    ],
    pointsPlan: blokPlan,
    negativeMarking: { enabled: true, wrongPerPenalty: 4, correctPerPenalty: 1, untilQuestion: 22 },
  },
};

// Per-question points for a preset (null when the preset uses legacy scoring,
// so callers fall back to questionPoints).
// `types` (optional ordered question-type list) lets type-aware presets weight
// by question type regardless of position; the current presets ignore it.
export const presetPointsPlan = (presetId, count, types) => {
  const p = PRESETS[presetId];
  return p && typeof p.pointsPlan === "function" ? p.pointsPlan(count, types) : null;
};

export const presetTotalMarks = (presetId) => PRESETS[presetId]?.totalMarks || 100;

// Ordered question types for a preset (length = total question count).
export const presetTypes = (preset) => {
  const types = [];
  (preset?.slots || []).forEach((s) => {
    for (let i = 0; i < (Number(s.count) || 0); i++) types.push(s.type);
  });
  return types;
};

export const presetCount = (preset) =>
  (preset?.slots || []).reduce((sum, s) => sum + (Number(s.count) || 0), 0);

// Selectable presets for the create-exam form (Buraxılış is the default).
export const presetOptions = Object.values(PRESETS).map((p) => ({
  value: p.id,
  label: p.label,
}));
