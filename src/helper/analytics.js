// Pure analytics helpers — computed on the client from results already fetched.

const num = (v) => (v == null ? null : Number(v));

// Class-level stats for an exam from its results.
export function examStats(results, passingMarks) {
  const list = Array.isArray(results) ? results.filter(Boolean) : [];
  const scored = list
    .map((r) => num(r.earnPoints))
    .filter((v) => v != null && Number.isFinite(v));
  const n = scored.length;
  const sum = scored.reduce((a, b) => a + b, 0);
  const average = n ? sum / n : 0;
  const sorted = [...scored].sort((a, b) => a - b);
  const median = n
    ? n % 2
      ? sorted[(n - 1) / 2]
      : (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : 0;
  const min = n ? sorted[0] : 0;
  const max = n ? sorted[n - 1] : 0;
  const pm = Number(passingMarks) || 0;
  const passCount = pm ? scored.filter((s) => s >= pm).length : 0;
  const passRate = pm && n ? Math.round((passCount / n) * 100) : null;

  // Five buckets: 0-20, 20-40, 40-60, 60-80, 80-100.
  const buckets = [0, 0, 0, 0, 0];
  scored.forEach((s) => {
    const b = Math.min(4, Math.max(0, Math.floor(s / 20)));
    buckets[b] += 1;
  });

  return {
    participants: list.length,
    scoredCount: n,
    average,
    median,
    min,
    max,
    passCount,
    passRate,
    passingMarks: pm,
    buckets,
  };
}

// Per-question item analysis: how many got each question correct / wrong / blank.
export function itemAnalysis(results) {
  const list = Array.isArray(results) ? results.filter(Boolean) : [];
  const withKey = list.filter((r) => r.correctAnswers && r.correctAnswers.length);
  const n = withKey.reduce((m, r) => Math.max(m, r.correctAnswers.length), 0);
  if (!n) return [];

  const items = Array.from({ length: n }, (_, i) => ({
    index: i,
    number: i + 1,
    correct: 0,
    wrong: 0,
    blank: 0,
    total: 0,
    answer: null,
    type: null,
  }));

  withKey.forEach((r) => {
    const correct = r.correctAnswers || [];
    const selected = r.selectedAnswers || [];
    for (let i = 0; i < n; i++) {
      const it = items[i];
      const caRaw = correct[i]?.answer;
      // Mirror the server scorer: trim, and treat whitespace-only as blank.
      const ca = String(caRaw ?? "").trim();
      const sa = String(selected[i]?.answer ?? "").trim();
      if (ca !== "") {
        it.answer = caRaw;
        it.type = correct[i]?.type;
      }
      it.total += 1;
      if (sa === "") it.blank += 1;
      else if (ca !== "" && sa === ca) it.correct += 1;
      else it.wrong += 1;
    }
  });

  items.forEach((it) => {
    it.pct = it.total ? Math.round((it.correct / it.total) * 100) : 0;
  });
  return items;
}

// A student's score series over time (oldest -> newest) for a progress chart.
export function progressSeries(results) {
  const list = Array.isArray(results) ? results.filter(Boolean) : [];
  return list
    .filter((r) => num(r.earnPoints) != null)
    .map((r) => ({
      score: Number(r.earnPoints),
      name: r.examId?.name || "İmtahan",
      at: r.createdAt ? new Date(r.createdAt).getTime() : 0,
      id: r._id,
    }))
    .sort((a, b) => a.at - b.at);
}

// 1 decimal, trailing zero trimmed (3.0 -> "3", 34.85 -> "34.9").
export const fmt = (v) => {
  const x = Number(v);
  if (!Number.isFinite(x)) return "0";
  return String(Math.round(x * 10) / 10);
};

// Tone for a 0-100 score (green / amber / red).
export const scoreTone = (s) => {
  const v = Number(s) || 0;
  if (v >= 66) return "success";
  if (v >= 40) return "warning";
  return "danger";
};
