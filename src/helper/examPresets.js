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

export const PRESETS = {
  buraxilis: {
    id: "buraxilis",
    label: "Buraxılış",
    totalMarks: 100,
    slots: [
      { type: "Cm", count: 13 },
      { type: "Co", count: 5 },
      { type: "Cd", count: 7 },
    ],
    pointsPlan: null, // null -> builder uses the legacy questionPoints (out of 100)
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
    pointsPlan: (count) => tailEqualPlan(count, 150, 3, 9),
    negativeMarking: { enabled: true, wrongPerPenalty: 4, correctPerPenalty: 1, untilQuestion: 22 },
  },
};

// Per-question points for a preset (null when the preset uses legacy scoring,
// so callers fall back to questionPoints).
// `types` (optional ordered question-type list) lets type-aware presets (e.g.
// Az dili) weight open vs closed regardless of position; others ignore it.
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
