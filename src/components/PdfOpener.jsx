import { useState, useRef, useEffect } from "react";
import { Document, Page } from "react-pdf";

const PdfOpener = (props) => {
  const [numPages, setNumPages] = useState();
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(update);
      ro.observe(el);
    } else {
      window.addEventListener("resize", update);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", update);
    };
  }, []);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <div ref={containerRef} className="w-full">
      <Document
        file={props.pdfFile}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={<div className="py-12 text-center text-sm text-muted">PDF yüklənir...</div>}
        error={<div className="py-12 text-center text-sm text-muted">PDF yüklənmədi</div>}
        noData={<div className="py-12 text-center text-sm text-muted">PDF yoxdur</div>}
      >
        {Array.from({ length: numPages || 0 }, (_, i) => i + 1).map((page) => (
          <div
            key={page}
            className="mb-4 overflow-hidden rounded-xl border border-line bg-white"
          >
            <Page
              pageNumber={page}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              width={width || undefined}
              className="select-text"
            />
          </div>
        ))}
      </Document>
    </div>
  );
};

export default PdfOpener;
