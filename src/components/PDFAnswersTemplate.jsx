import React from "react";
import { Page, Text, Document, StyleSheet, View, Font } from "@react-pdf/renderer";
import DisplayFont from "../fonts/SchibstedGrotesk-Black.ttf";

Font.register({ family: "Display", src: DisplayFont });

const C = {
  primary: "#4F46E5",
  ink: "#1B1830",
  muted: "#6B7280",
  faint: "#9AA1AE",
  line: "#E7E5F2",
  tint: "#F5F4FC",
  white: "#FFFFFF",
  green: "#15803D",
  red: "#C0392B",
};

const fmt = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? (Math.round(v * 10) / 10).toString() : "0";
};

const show = (v) => (v === undefined || v === null || v === "" ? "—" : String(v));

// One result rendered as the on-screen grid: Sual / Doğru cavab / Cavab / Nəticə.
const UserGrid = ({ result }) => {
  const correct = result?.correctAnswers || [];
  const selected = result?.selectedAnswers || [];
  const n = Math.max(correct.length, selected.length);
  const idxs = Array.from({ length: n }, (_, i) => i);
  const isCorrect = (i) => {
    const s = selected[i]?.answer;
    const c = correct[i]?.answer;
    return s != null && s !== "" && c != null && String(s) === String(c);
  };

  return (
    <View style={styles.userBlock} wrap={false}>
      <View style={styles.userHead}>
        <View>
          <Text style={styles.userName}>{result.userId?.name || "—"}</Text>
          {result.terminated && (
            <Text style={styles.terminated}>
              POZUNTUYA GÖRƏ DAYANDIRILDI ({result.violations || 0} pozuntu)
            </Text>
          )}
        </View>
        <Text style={styles.userScore}>{fmt(result.earnPoints)} bal</Text>
      </View>

      <View style={styles.table}>
        <View style={[styles.row, styles.headRow]}>
          <Text style={[styles.labelCell, styles.headText]}>Sual</Text>
          {idxs.map((i) => (
            <Text key={i} style={[styles.cell, styles.headText]}>
              {i + 1}
            </Text>
          ))}
        </View>

        <View style={styles.row}>
          <Text style={styles.labelCell}>Doğru cavab</Text>
          {idxs.map((i) => (
            <Text key={i} style={styles.cell}>
              {show(correct[i]?.answer)}
            </Text>
          ))}
        </View>

        <View style={styles.row}>
          <Text style={styles.labelCell}>Cavab</Text>
          {idxs.map((i) => {
            const has = selected[i]?.answer != null && selected[i]?.answer !== "";
            const ok = isCorrect(i);
            return (
              <Text
                key={i}
                style={[styles.cell, has ? (ok ? styles.ok : styles.bad) : styles.faintCell]}
              >
                {show(selected[i]?.answer)}
              </Text>
            );
          })}
        </View>

        <View style={[styles.row, styles.lastRow]}>
          <Text style={styles.labelCell}>Nəticə</Text>
          {idxs.map((i) => (
            <View key={i} style={styles.cellBox}>
              <View style={[styles.dot, { backgroundColor: isCorrect(i) ? C.green : C.red }]} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const PDFAnswersTemplate = ({ results }) => {
  const list = Array.isArray(results) ? results.filter(Boolean) : [];
  const examName = list[0]?.examId?.name || "İmtahan";
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, "0")}.${String(
    now.getMonth() + 1
  ).padStart(2, "0")}.${now.getFullYear()}`;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={{ maxWidth: "70%" }}>
            <Text style={styles.kicker}>İMTAHAN CAVABLARI</Text>
            <Text style={styles.examName}>{examName}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerDateLabel}>Hesabat tarixi</Text>
            <Text style={styles.headerDate}>{dateStr}</Text>
          </View>
        </View>

        {list.map((r, idx) => (
          <UserGrid key={r._id || idx} result={r} />
        ))}

        {list.length === 0 && <Text style={styles.empty}>Hələ nəticə yoxdur.</Text>}

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
    paddingTop: 22,
    paddingBottom: 44,
    paddingHorizontal: 24,
    backgroundColor: C.white,
    color: C.ink,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 16,
  },
  kicker: { color: "#C7D2FE", fontSize: 8, letterSpacing: 1.5, marginBottom: 3 },
  examName: { color: C.white, fontSize: 17 },
  headerRight: { alignItems: "flex-end" },
  headerDateLabel: { color: "#C7D2FE", fontSize: 7, marginBottom: 2 },
  headerDate: { color: C.white, fontSize: 11 },

  userBlock: { marginBottom: 16 },
  userHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 5,
  },
  userName: { fontSize: 11, color: C.ink },
  userScore: { fontSize: 10, color: C.primary },
  terminated: { fontSize: 7.5, color: C.red, marginTop: 2 },

  table: { borderWidth: 1, borderColor: C.line, borderRadius: 5, overflow: "hidden" },
  row: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: C.line },
  headRow: { backgroundColor: C.tint, borderTopWidth: 0 },
  lastRow: {},
  labelCell: {
    width: 66,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 7,
    color: C.muted,
    borderRightWidth: 0.5,
    borderRightColor: C.line,
  },
  cell: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 1,
    fontSize: 7,
    textAlign: "center",
    color: C.ink,
    borderLeftWidth: 0.5,
    borderLeftColor: C.line,
  },
  cellBox: {
    flex: 1,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 0.5,
    borderLeftColor: C.line,
  },
  headText: { color: C.muted },
  ok: { color: C.green },
  bad: { color: C.red },
  faintCell: { color: C.faint },
  dot: { width: 6, height: 6, borderRadius: 3 },

  empty: { color: C.muted, fontSize: 11, textAlign: "center", marginTop: 30 },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 7,
  },
  footerBrand: { color: C.muted, fontSize: 8 },
  footerPage: { color: C.faint, fontSize: 8 },
});

export default PDFAnswersTemplate;
