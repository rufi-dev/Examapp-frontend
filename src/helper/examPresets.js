// Mirror of the backend exam presets (Backend/helper/examPresets.js) — labels,
// question structure, and negative-marking defaults used by the exam-create form
// and the structured builder. Scoring is computed AUTHORITATIVELY on the backend
// from the preset id; the frontend only seeds the structure + form defaults.

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
    negativeMarking: null,
  },
  "blok-1": {
    id: "blok-1",
    label: "Blok 1 və 2-ci qrup",
    totalMarks: 150,
    slots: [
      { type: "Cm", count: 22 },
      { type: "Co", count: 4 },
      { type: "Cma", count: 1 },
      { type: "Cd", count: 3 },
    ],
    negativeMarking: { enabled: true, wrongPerPenalty: 4, correctPerPenalty: 1, untilQuestion: 22 },
  },
};

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

// Dropdown options for the create-exam form ("" = custom / no preset).
export const presetOptions = [
  { value: "", label: "Preset yoxdur (fərdi)" },
  ...Object.values(PRESETS).map((p) => ({ value: p.id, label: p.label })),
];
