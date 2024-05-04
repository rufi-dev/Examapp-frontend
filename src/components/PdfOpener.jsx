import { useState } from "react";
import { Document, Page } from "react-pdf";

const PdfOpener = (props) => {
  const [numPages, setNumPages] = useState();
  const [pageNumber, setPageNumber] = useState(1);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }
  return (
    <div className="pdf-div lg:p-5 lg:bg-[#295e86] border">
      <Document file={props.pdfFile} onLoadSuccess={onDocumentLoadSuccess}>
        {Array.apply(null, Array(numPages))
          .map((x, i) => i + 1)
          .map((page) => {
            return (
              <div key={page} className="page-container mb-4">
                <Page
                  pageNumber={page}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  scale={1.5}
                  className="select-text"
                />
              </div>
            );
          })}
      </Document>
    </div>
  );
};

export default PdfOpener;
