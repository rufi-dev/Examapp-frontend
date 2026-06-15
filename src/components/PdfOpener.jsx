import { useState, useRef, useEffect } from "react";
import { Document, Page } from "react-pdf";
import { FiZoomIn, FiZoomOut, FiMaximize } from "react-icons/fi";

const PdfOpener = (props) => {
  const [numPages, setNumPages] = useState();
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [scale, setScale] = useState(1);

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

  // Subtract the container padding so the page fits at 100%.
  const basis = width ? width - 16 : 0;
  const pageWidth = basis ? Math.round(basis * scale) : undefined;

  const zoomOut = () => setScale((s) => Math.max(0.6, +(s - 0.25).toFixed(2)));
  const zoomIn = () => setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)));
  const reset = () => setScale(1);

  const btn =
    "grid h-9 w-9 place-items-center rounded-lg text-text transition-colors hover:bg-surface2 disabled:opacity-40";

  return (
    <div className="relative h-full w-full">
      {/* Zoom controls — scale the PDF within this panel only */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-0.5 rounded-xl border border-line bg-surface/90 p-1 shadow-soft backdrop-blur">
        <button type="button" onClick={zoomOut} disabled={scale <= 0.6} className={btn} aria-label="Kiçilt">
          <FiZoomOut />
        </button>
        <span className="w-11 text-center text-xs font-semibold tabular-nums text-muted">
          {Math.round(scale * 100)}%
        </span>
        <button type="button" onClick={zoomIn} disabled={scale >= 3} className={btn} aria-label="Böyüt">
          <FiZoomIn />
        </button>
        <button type="button" onClick={reset} className={btn} aria-label="Sıfırla">
          <FiMaximize />
        </button>
      </div>

      <div ref={containerRef} className="scrollbar-thin h-full w-full overflow-auto p-2">
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
              className="mb-4 w-max overflow-hidden rounded-xl border border-line bg-white"
            >
              <Page
                pageNumber={page}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                width={pageWidth}
                className="select-text"
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
};

export default PdfOpener;
