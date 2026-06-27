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

// 9th-grade Azerbaijani-language buraxılış scoring (DİM), out of 100 (nisbi bal).
// Weighted BY TYPE, not position — open (Co) questions = 2 units, every closed
// one (Cm/Cs/Cma/Cmu) = 1 unit, normalized to 100. So variants can order/place
// the open & matching questions however they like and the score stays correct.
function azWrittenPlan(count, types) {
  const n = Number(count) || 0;
  if (n <= 0) return [];
  const t = Array.isArray(types) ? types : [];
  const weights = Array.from({ length: n }, (_, i) => (t[i] === "Co" ? 2 : 1));
  const total = weights.reduce((s, w) => s + w, 0) || 1;
  return weights.map((w) => (w / total) * 100);
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
  "az-buraxilis-9": {
    id: "az-buraxilis-9",
    label: "Buraxılış — Azərbaycan dili (9)",
    totalMarks: 100, // DİM nisbi bal: closed=100/34, open=200/34 (open weighted 2x)
    // 30 tapşırıq: 10 dil qaydası (qapalı) + 2 mətn × 10 (hər mətndə 8 qapalı + 2 açıq).
    slots: [
      { type: "Cm", count: 18 }, // Q1-10 qaydalar + Q11-18 mətn-1 (qapalı)
      { type: "Co", count: 2 },  // Q19-20 mətn-1 (açıq, yazılı)
      { type: "Cm", count: 8 },  // Q21-28 mətn-2 (qapalı)
      { type: "Co", count: 2 },  // Q29-30 mətn-2 (açıq, yazılı)
    ],
    pointsPlan: azWrittenPlan,
    negativeMarking: null,
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
