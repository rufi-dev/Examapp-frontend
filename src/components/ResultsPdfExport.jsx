import { PDFDownloadLink } from "@react-pdf/renderer";
import PDFTemplate from "./PDFTemplate";
import PDFAnswersTemplate from "./PDFAnswersTemplate";
import { FiDownload, FiList } from "react-icons/fi";

// The two results PDF download links. Split into its own module + imported
// lazily by ResultsByExam, so the heavy @react-pdf/renderer library only loads
// when a teacher actually exports — not just for opening the results page.
const pdfBtn =
  "inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-text transition-colors hover:bg-surface2";

const ResultsPdfExport = ({ results }) => (
  <>
    <PDFDownloadLink
      document={<PDFTemplate results={results} />}
      fileName="imtahan-neticeleri.pdf"
    >
      {({ loading }) => (
        <span className={pdfBtn}>
          <FiDownload /> {loading ? "Hazırlanır..." : "Nəticələr (PDF)"}
        </span>
      )}
    </PDFDownloadLink>
    <PDFDownloadLink
      document={<PDFAnswersTemplate results={results} />}
      fileName="imtahan-cavablar.pdf"
    >
      {({ loading }) => (
        <span className={pdfBtn}>
          <FiList /> {loading ? "Hazırlanır..." : "Cavablar (PDF)"}
        </span>
      )}
    </PDFDownloadLink>
  </>
);

export default ResultsPdfExport;
