// Styled .xlsx export of an exam's results. Built client-side from the results
// already on the page, so it's instant and free. Heavy (exceljs ~) — this whole
// module is dynamically imported only when a teacher clicks "Excel ixrac et",
// and excluded from the PWA precache (see vite.config globIgnores).
import ExcelJS from "exceljs/dist/exceljs.min.js";
import { examStats, itemAnalysis } from "../helper/analytics";
import { hasAnswer, isSelectionCorrect } from "../helper/helper";

// ---- styling tokens ----
const HEADER_FILL = "FF4F46E5"; // indigo
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
const GOOD_FILL = "FFC6EFCE"; // green
const GOOD_FONT = { color: { argb: "FF006100" } };
const BAD_FILL = "FFFFC7CE"; // red
const BAD_FONT = { color: { argb: "FF9C0006" } };
const BLANK_FILL = "FFF2F2F2"; // grey
const KEY_FILL = "FFFFF2CC"; // soft yellow (answer key row)
const thin = { style: "thin", color: { argb: "FFE5E7EB" } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };

const fill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const round1 = (v) => Math.round((Number(v) || 0) * 10) / 10;
const letter = (i) => String.fromCharCode(65 + Number(i));

// Render any answer shape (index / index-array / matching map / text) to a
// readable cell string. Choice indices become letters (0 -> A).
function renderAns(value, type) {
  if (value == null || value === "") return "";
  if (Array.isArray(value)) {
    if (value.every((x) => typeof x === "number" || /^\d+$/.test(String(x))))
      return value.map((x) => letter(x)).join(", ");
    return value.join(", ");
  }
  if (typeof value === "object") return Object.values(value).join(" | ");
  if ((type === "Cm" || type === "Cs") && /^\d+$/.test(String(value))) return letter(value);
  return String(value);
}

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.fill = fill(HEADER_FILL);
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = BORDER;
  });
  row.height = 22;
}

// Per-result correct / wrong / blank counts (authoritative, mirrors the app).
function tally(result) {
  const correct = result.correctAnswers || [];
  const selected = result.selectedAnswers || [];
  let c = 0;
  let w = 0;
  let b = 0;
  for (let i = 0; i < correct.length; i++) {
    const ca = correct[i]?.answer;
    const type = correct[i]?.type;
    const sv = selected[i]?.answer;
    if (!hasAnswer({ answer: sv })) b += 1;
    else if (isSelectionCorrect(ca, sv, type)) c += 1;
    else w += 1;
  }
  return { c, w, b };
}

export async function exportResultsExcel(results) {
  const list = (Array.isArray(results) ? results : []).filter(Boolean);
  const exam = list[0]?.examId || {};
  const passingMarks = Number(exam.passingMarks) || 0;
  const stats = examStats(list, passingMarks);
  const items = itemAnalysis(list);
  const qCount = items.length;

  // Sort students best -> worst.
  const sorted = [...list].sort((a, b) => (Number(b.earnPoints) || 0) - (Number(a.earnPoints) || 0));
  const top = sorted[0];

  const wb = new ExcelJS.Workbook();
  wb.creator = "İmtahan Platforması";
  wb.created = new Date();

  // ---------- Sheet 1: Xülasə ----------
  const s1 = wb.addWorksheet("Xülasə");
  s1.columns = [{ width: 26 }, { width: 40 }];
  const title = s1.addRow([exam.name || "İmtahan", ""]);
  title.font = { bold: true, size: 14 };
  s1.addRow([]);
  const rows1 = [
    ["İxrac tarixi", new Date().toLocaleString()],
    ["Sual sayı", qCount],
    ["İştirakçı sayı", stats.participants],
    ["Orta bal", round1(stats.average)],
    ["Median bal", round1(stats.median)],
    ["Ən yüksək bal", `${round1(stats.max)}${top ? ` — ${top.userId?.name || ""}` : ""}`],
    ["Ən aşağı bal", round1(stats.min)],
  ];
  if (passingMarks) {
    rows1.push(["Keçid balı", passingMarks]);
    rows1.push([
      "Keçənlər",
      `${stats.passCount} / ${stats.scoredCount}${stats.passRate != null ? ` (${stats.passRate}%)` : ""}`,
    ]);
  }
  rows1.push(["Pozuntu qeydə alınan", list.filter((r) => (r.violations || 0) > 0).length]);
  rows1.push(["Dayandırılan (anti-cheat)", list.filter((r) => r.terminated).length]);
  rows1.forEach(([k, v]) => {
    const r = s1.addRow([k, v]);
    r.getCell(1).font = { bold: true };
    r.getCell(1).fill = fill("FFF3F4F6");
  });

  // ---------- Sheet 2: Nəticələr (leaderboard) ----------
  const s2 = wb.addWorksheet("Nəticələr", { views: [{ state: "frozen", ySplit: 1 }] });
  s2.columns = [
    { header: "Sıra", width: 6 },
    { header: "Ad Soyad", width: 28 },
    { header: "Bal (100)", width: 10 },
    { header: "Doğru", width: 8 },
    { header: "Səhv", width: 8 },
    { header: "Boş", width: 8 },
    { header: "Cəhd", width: 7 },
    { header: "Pozuntu", width: 9 },
    { header: "Dayandırılıb", width: 13 },
    { header: "Təqdim vaxtı", width: 20 },
    { header: "Nəticə", width: 11 },
  ];
  styleHeaderRow(s2.getRow(1));
  sorted.forEach((res, i) => {
    const t = tally(res);
    const score = round1(res.earnPoints);
    const passed = passingMarks ? score >= passingMarks : null;
    const row = s2.addRow([
      i + 1,
      res.userId?.name || "—",
      score,
      t.c,
      t.w,
      t.b,
      res.attempts || 1,
      res.violations || 0,
      res.terminated ? "Bəli" : "",
      res.createdAt ? new Date(res.createdAt).toLocaleString() : "",
      passed == null ? "" : passed ? "Keçdi" : "Kəsildi",
    ]);
    row.eachCell((cell) => (cell.border = BORDER));
    // Colour the score cell by band (Bal is column 3 now).
    const sc = row.getCell(3);
    sc.fill = fill(score >= 66 ? GOOD_FILL : score >= 40 ? "FFFFEB9C" : BAD_FILL);
    sc.font = { bold: true };
    if (passed != null) {
      const rc = row.getCell(11);
      rc.fill = fill(passed ? GOOD_FILL : BAD_FILL);
      rc.font = passed ? GOOD_FONT : BAD_FONT;
    }
  });

  // ---------- Sheet 3: Cavablar (answers matrix) ----------
  const s3 = wb.addWorksheet("Cavablar", {
    views: [{ state: "frozen", xSplit: 2, ySplit: 2 }],
  });
  s3.columns = [
    { width: 26 },
    { width: 9 },
    ...Array.from({ length: qCount }, () => ({ width: 9 })),
  ];
  const head = s3.addRow(["Şagird", "Bal", ...items.map((it) => `S${it.number}`)]);
  styleHeaderRow(head);
  // Answer-key row.
  const keyRow = s3.addRow([
    "Düzgün cavab",
    "",
    ...items.map((it) => renderAns(it.answer, it.type)),
  ]);
  keyRow.eachCell((cell) => {
    cell.fill = fill(KEY_FILL);
    cell.font = { bold: true };
    cell.border = BORDER;
    cell.alignment = { horizontal: "center" };
  });
  keyRow.getCell(1).alignment = { horizontal: "left" };
  // One row per student.
  sorted.forEach((res) => {
    const selected = res.selectedAnswers || [];
    const correct = res.correctAnswers || [];
    const cells = [res.userId?.name || "—", round1(res.earnPoints)];
    for (let i = 0; i < qCount; i++) {
      cells.push(renderAns(selected[i]?.answer, correct[i]?.type));
    }
    const row = s3.addRow(cells);
    row.eachCell((cell) => {
      cell.border = BORDER;
      cell.alignment = { horizontal: "center" };
    });
    row.getCell(1).alignment = { horizontal: "left" };
    for (let i = 0; i < qCount; i++) {
      const cell = row.getCell(3 + i);
      const ca = correct[i]?.answer;
      const sv = selected[i]?.answer;
      const type = correct[i]?.type;
      if (!hasAnswer({ answer: sv })) {
        cell.fill = fill(BLANK_FILL);
      } else if (isSelectionCorrect(ca, sv, type)) {
        cell.fill = fill(GOOD_FILL);
        cell.font = GOOD_FONT;
      } else {
        cell.fill = fill(BAD_FILL);
        cell.font = BAD_FONT;
      }
    }
  });

  // ---------- Sheet 4: Sual təhlili ----------
  const s4 = wb.addWorksheet("Sual təhlili", { views: [{ state: "frozen", ySplit: 1 }] });
  s4.columns = [
    { header: "Sual №", width: 8 },
    { header: "Növ", width: 10 },
    { header: "Düzgün cavab", width: 24 },
    { header: "Doğru bilən", width: 12 },
    { header: "Doğru %", width: 10 },
    { header: "Çətinlik", width: 12 },
  ];
  styleHeaderRow(s4.getRow(1));
  const typeName = { Cm: "Tək seçim", Cs: "Çox seçim", Co: "Açıq", Cd: "Ətraflı", Cma: "Uyğunluq" };
  items.forEach((it) => {
    const diff = it.pct >= 70 ? "Asan" : it.pct >= 40 ? "Orta" : "Çətin";
    const row = s4.addRow([
      it.number,
      typeName[it.type] || it.type || "—",
      renderAns(it.answer, it.type),
      `${it.correct} / ${it.total}`,
      `${it.pct}%`,
      diff,
    ]);
    row.eachCell((cell) => (cell.border = BORDER));
    const pc = row.getCell(5);
    pc.fill = fill(it.pct >= 70 ? GOOD_FILL : it.pct >= 40 ? "FFFFEB9C" : BAD_FILL);
  });

  // ---- download ----
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(exam.name || "imtahan").replace(/[^\p{L}\p{N}_-]+/gu, "_")}-neticeler.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
