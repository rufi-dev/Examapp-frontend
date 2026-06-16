import React from "react";
import { Page, Text, Document, StyleSheet, View, Font } from "@react-pdf/renderer";
import DisplayFont from "../fonts/SchibstedGrotesk-Black.ttf";

// Single geometric family used throughout. SchibstedGrotesk-Black reliably
// renders Azerbaijani glyphs (ə, ı, ş, ğ, ç, ö, ü), so hierarchy comes from
// size + colour rather than weight.
Font.register({ family: "Display", src: DisplayFont });

const C = {
  primary: "#4F46E5",
  primaryDark: "#3F37C9",
  ink: "#1B1830",
  muted: "#6B7280",
  faint: "#9AA1AE",
  line: "#E7E5F2",
  tint: "#F5F4FC",
  white: "#FFFFFF",
  green: "#15803D",
  greenBg: "#DCFCE7",
  red: "#C0392B",
  redBg: "#FDECEA",
  amber: "#B45309",
  amberBg: "#FEF3C7",
  gold: "#D4A017",
  silver: "#8E99A8",
  bronze: "#B07A3C",
};

const fmt = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return (Math.round(v * 10) / 10).toString();
};

// Right / wrong / blank counts for one student's answer sheet.
const tally = (result) => {
  const correct = result?.correctAnswers || [];
  const selected = result?.selectedAnswers || [];
  const n = Math.max(correct.length, selected.length);
  const hasKey = correct.length > 0;
  let right = 0;
  let wrong = 0;
  let blank = 0;
  // Mirror the server scorer: trim, and treat whitespace-only as blank.
  for (let i = 0; i < n; i++) {
    const sa = String(selected[i]?.answer ?? "").trim();
    const ca = String(correct[i]?.answer ?? "").trim();
    if (sa === "") blank++;
    else if (hasKey && ca !== "" && sa === ca) right++;
    else wrong++;
  }
  return { right, wrong, blank, total: n, hasKey };
};

// Performance band drives the score pill colour.
const band = (score) => {
  const s = Number(score) || 0;
  if (s >= 66) return { fg: C.green, bg: C.greenBg };
  if (s >= 40) return { fg: C.amber, bg: C.amberBg };
  return { fg: C.red, bg: C.redBg };
};

const rankColor = (i) => (i === 0 ? C.gold : i === 1 ? C.silver : i === 2 ? C.bronze : null);

const StatCard = ({ label, value, accent }) => (
  <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, accent ? { color: accent } : null]}>{value}</Text>
  </View>
);

const PDFTemplate = ({ results }) => {
  const list = Array.isArray(results) ? results.filter(Boolean) : [];
  const exam = list[0]?.examId || {};
  const examName = exam.name || "İmtahan";
  const passing = Number(exam.passingMarks) || 0;

  const ranked = [...list].sort(
    (a, b) => (Number(b.earnPoints) || 0) - (Number(a.earnPoints) || 0)
  );

  const scores = ranked.map((r) => Number(r.earnPoints) || 0);
  const count = ranked.length;
  const avg = count ? scores.reduce((a, b) => a + b, 0) / count : 0;
  const top = count ? Math.max(...scores) : 0;
  const passed = passing ? scores.filter((s) => s >= passing).length : null;

  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, "0")}.${String(
    now.getMonth() + 1
  ).padStart(2, "0")}.${now.getFullYear()}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header band */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Text style={styles.kicker}>İMTAHAN NƏTİCƏLƏRİ</Text>
            <Text style={styles.examName}>{examName}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerDateLabel}>Hesabat tarixi</Text>
            <Text style={styles.headerDate}>{dateStr}</Text>
          </View>
        </View>

        {/* Summary cards */}
        <View style={styles.statsRow}>
          <StatCard label="İştirakçı" value={String(count)} accent={C.primary} />
          <StatCard label="Orta bal" value={fmt(avg)} accent={C.ink} />
          <StatCard label="Ən yüksək" value={fmt(top)} accent={C.green} />
          <StatCard
            label={passing ? `Keçid (≥${passing})` : "Keçid"}
            value={passing ? `${passed}/${count}` : "—"}
            accent={C.amber}
          />
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.theadRow} fixed>
            <Text style={[styles.th, styles.cRank]}>Sıra</Text>
            <Text style={[styles.th, styles.cName]}>Ad Soyad</Text>
            <Text style={[styles.th, styles.cNum]}>Doğru</Text>
            <Text style={[styles.th, styles.cNum]}>Səhv</Text>
            <Text style={[styles.th, styles.cNum]}>Boş</Text>
            <Text style={[styles.th, styles.cScore]}>Bal</Text>
          </View>

          {ranked.map((r, i) => {
            const t = tally(r);
            const b = band(r.earnPoints);
            const rc = rankColor(i);
            return (
              <View
                key={r._id || i}
                style={[styles.row, i % 2 === 1 ? styles.rowAlt : null]}
                wrap={false}
              >
                <View style={styles.cRank}>
                  {rc ? (
                    <View style={[styles.medal, { backgroundColor: rc }]}>
                      <Text style={styles.medalText}>{i + 1}</Text>
                    </View>
                  ) : (
                    <Text style={styles.rankNum}>{i + 1}</Text>
                  )}
                </View>
                <Text style={[styles.td, styles.cName, styles.nameText]}>
                  {r.userId?.name || "—"}
                  {r.terminated ? <Text style={{ color: C.red }}>  • pozuntu</Text> : null}
                </Text>
                <Text style={[styles.td, styles.cNum, { color: C.green }]}>
                  {t.hasKey ? t.right : "—"}
                </Text>
                <Text style={[styles.td, styles.cNum, { color: C.red }]}>
                  {t.hasKey ? t.wrong : "—"}
                </Text>
                <Text style={[styles.td, styles.cNum, { color: C.faint }]}>{t.blank}</Text>
                <View style={styles.cScore}>
                  <View style={[styles.scorePill, { backgroundColor: b.bg }]}>
                    <Text style={[styles.scoreText, { color: b.fg }]}>{fmt(r.earnPoints)}</Text>
                  </View>
                </View>
              </View>
            );
          })}

          {count === 0 && (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>Hələ nəticə yoxdur.</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>Sınaq Riyaziyyat</Text>
          <Text
            style={styles.footerPage}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Display",
    paddingTop: 24,
    paddingBottom: 48,
    paddingHorizontal: 28,
    backgroundColor: C.white,
    color: C.ink,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 22,
    marginBottom: 16,
  },
  headerLeft: { flexDirection: "column", maxWidth: "70%" },
  kicker: { color: "#C7D2FE", fontSize: 9, letterSpacing: 1.5, marginBottom: 4 },
  examName: { color: C.white, fontSize: 20 },
  headerRight: { alignItems: "flex-end" },
  headerDateLabel: { color: "#C7D2FE", fontSize: 8, marginBottom: 3 },
  headerDate: { color: C.white, fontSize: 12 },

  // Summary cards
  statsRow: { flexDirection: "row", marginHorizontal: -5, marginBottom: 18 },
  statCard: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: C.tint,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  statLabel: { color: C.muted, fontSize: 8, letterSpacing: 0.5, marginBottom: 6 },
  statValue: { fontSize: 17 },

  // Table
  table: { borderRadius: 12, borderWidth: 1, borderColor: C.line, overflow: "hidden" },
  theadRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.ink,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  th: { color: C.white, fontSize: 8.5, letterSpacing: 0.4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: C.white,
  },
  rowAlt: { backgroundColor: C.tint },
  td: { fontSize: 10, color: C.ink },

  cRank: { width: 38, alignItems: "flex-start", justifyContent: "center" },
  cName: { flex: 1, paddingRight: 6 },
  cNum: { width: 48, textAlign: "center" },
  cScore: { width: 56, alignItems: "flex-end", justifyContent: "center" },

  nameText: { fontSize: 10.5 },
  rankNum: { fontSize: 10, color: C.faint, paddingLeft: 4 },
  medal: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  medalText: { color: C.white, fontSize: 9 },

  scorePill: {
    borderRadius: 9,
    paddingVertical: 3,
    paddingHorizontal: 9,
    minWidth: 34,
    alignItems: "center",
  },
  scoreText: { fontSize: 10.5 },

  emptyRow: { paddingVertical: 28, alignItems: "center" },
  emptyText: { color: C.muted, fontSize: 11 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 22,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 8,
  },
  footerBrand: { color: C.muted, fontSize: 9, letterSpacing: 0.5 },
  footerPage: { color: C.faint, fontSize: 9 },
});

export default PDFTemplate;
