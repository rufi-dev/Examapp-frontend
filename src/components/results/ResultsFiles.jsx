import { pdf } from "@react-pdf/renderer";
import PDFTemplate from "../PDFTemplate";
import PDFAnswersTemplate from "../PDFAnswersTemplate";

// Builds the results PDFs ON DEMAND (when the teacher presses download), from the
// already-filtered results. Imported lazily by the export dialog, so the heavy
// @react-pdf/renderer library only loads when someone actually exports — and a
// filter change never re-renders a PDF in the background.

export function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// kind: "results" (ranking table) | "answers" (every student's answer sheet)
export async function downloadResultsPdf(kind, results, { filters = [], fileName } = {}) {
  const doc =
    kind === "answers" ? (
      <PDFAnswersTemplate results={results} filters={filters} />
    ) : (
      <PDFTemplate results={results} filters={filters} />
    );
  const blob = await pdf(doc).toBlob();
  saveBlob(blob, fileName || (kind === "answers" ? "imtahan-cavablar.pdf" : "imtahan-neticeleri.pdf"));
}
