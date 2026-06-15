import { useState, useRef, useEffect } from "react";
import { Document, Page } from "react-pdf";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { FiZoomIn, FiZoomOut, FiMaximize } from "react-icons/fi";

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

  const onDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);

  // Render the page at fit-width; pinch/zoom scales the whole surface.
  const pageWidth = width ? width - 16 : undefined;

  const btn =
    "grid h-9 w-9 place-items-center rounded-lg text-text transition-colors hover:bg-surface2 active:bg-surface2 disabled:opacity-40";

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <TransformWrapper
        initialScale={1}
        minScale={1}
        maxScale={4}
        limitToBounds
        doubleClick={{ mode: "zoomIn", step: 0.7 }}
        wheel={{ step: 0.2 }}
        pinch={{ step: 6 }}
        panning={{ velocityDisabled: true }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom controls — affect only the PDF, never the page */}
            <div className="absolute right-3 top-3 z-10 flex items-center gap-0.5 rounded-xl border border-line bg-surface/90 p-1 shadow-soft backdrop-blur">
              <button type="button" onClick={() => zoomOut()} className={btn} aria-label="Kiçilt">
                <FiZoomOut />
              </button>
              <button type="button" onClick={() => zoomIn()} className={btn} aria-label="Böyüt">
                <FiZoomIn />
              </button>
              <button type="button" onClick={() => resetTransform()} className={btn} aria-label="Sıfırla">
                <FiMaximize />
              </button>
            </div>

            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{ width: "100%", display: "block" }}
            >
              <div className="w-full p-2">
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
                      className="mx-auto mb-4 overflow-hidden rounded-xl border border-line bg-white"
                      style={{ width: pageWidth }}
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
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};

export default PdfOpener;
