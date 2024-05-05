import React from "react";
import {
  Page,
  Text,
  Document,
  StyleSheet,
  View,
  Font,
} from "@react-pdf/renderer";
import MyCustomFont from "../fonts/SchibstedGrotesk-Black.ttf";

const PDFTemplate = ({ results }) => {
  Font.register({ family: "Schibsted Grotesk", src: MyCustomFont });
  return (
    <Document>
      <Page size={"A2"}>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.columnHeader}>Ad Soyad</Text>
            <Text style={styles.columnHeader}>Bio</Text>
            <Text style={styles.columnHeader}>Telefon</Text>
            <Text style={styles.columnHeader}>Email</Text>
            <Text style={styles.columnHeader}>Yığılan Bal</Text>
            <Text style={styles.columnHeader}>İmtahan Adı</Text>
          </View>
          {results.map((result, index) => (
            <View style={styles.tableRow} key={index}>
              <Text style={styles.text}>{result.userId.name}</Text>
              <Text style={styles.text}>{result.userId.bio}</Text>
              <Text style={styles.text}>{result.userId.phone}</Text>
              <Text style={styles.text}>{result.userId.email}</Text>
              <Text style={styles.text}>{result.earnPoints}</Text>
              <Text style={styles.text}>{result.examId.name}</Text>
            </View>
          ))}
        </View>
        {/* <Text
          render={({ pageNumber, totalPages }) => `${pageNumber / totalPages}`}
        ></Text> */}
      </Page>
    </Document>
  );
};

const styles = StyleSheet.create({
  table: {
    width: "100%",
    border: "1 solid black",
  },
  tableRow: {
    border: "1 solid black",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  columnHeader: {
    borderRight: "1 solid black",
    padding: "20px",
    width: "235px",
    fontFamily: "Schibsted Grotesk",
  },
  text: {
    padding: "20px",
    borderRight: "1 solid black",
    width: "235px",
    fontFamily: "Schibsted Grotesk",
    fontSize: 12,
  },
});

export default PDFTemplate;
