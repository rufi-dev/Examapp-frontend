import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page } from "react-pdf";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { FiZoomIn, FiZoomOut, FiMaximize } from "react-icons/fi";

const GAP = 16; // space between pages
const PAD = 8; // padding around the page column

const PdfOpener = (props) => {
  const [numPages, setNumPages] = useState(0);
  const [pageRatio, setPageRatio] = useState(1.414); // height / width (A4 default)
  const [visible, setVisible] = useState(new Set([1, 2, 3]));
  const visibleRef = useRef(new Set([1, 2, 3]));
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

  const onDocumentLoadSuccess = (pdf) => {
    setNumPages(pdf.numPages);
    pdf
      .getPage(1)
      .then((p) => {
        const vp = p.getViewport({ scale: 1 });
        if (vp?.width) setPageRatio(vp.height / vp.width);
      })
      .catch(() => {});
  };

  const pageWidth = width ? width - 2 * PAD : 0;
  const slotHeight = pageWidth ? Math.round(pageWidth * pageRatio) : 400;

  // Only render pages near the visible window so the page count doesn't blow up
  // memory (a 50-page PDF keeps just a handful of pages rendered at a time).
  const recompute = useCallback(
    (state) => {
      const el = containerRef.current;
      if (!el || !numPages || !slotHeight) return;
      const ch = el.clientHeight || 1;
      const scale = state?.scale || 1;
      const py = state?.positionY || 0;
      const buffer = (ch * 1.2) / scale; // pre-render a screen above/below
      const top = -py / scale - buffer;
      const bottom = (ch - py) / scale + buffer;
      const next = new Set();
      for (let p = 1; p <= numPages; p++) {
        const pTop = PAD + (p - 1) * (slotHeight + GAP);
        if (pTop + slotHeight >= top && pTop <= bottom) next.add(p);
      }
      const cur = visibleRef.current;
      let same = cur.size === next.size;
      if (same) for (const v of next) if (!cur.has(v)) { same = false; break; }
      if (!same) {
        visibleRef.current = next;
        setVisible(next);
      }
    },
    [numPages, slotHeight]
  );

  useEffect(() => {
    recompute({ scale: 1, positionX: 0, positionY: 0 });
  }, [recompute, width, pageRatio]);

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
        onTransformed={(ref, state) => recompute(state)}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
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
              <div className="w-full" style={{ padding: PAD }}>
                <Document
                  file={props.pdfFile}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={<div className="py-12 text-center text-sm text-muted">PDF yüklənir...</div>}
                  error={<div className="py-12 text-center text-sm text-muted">PDF yüklənmədi</div>}
                  noData={<div className="py-12 text-center text-sm text-muted">PDF yoxdur</div>}
                >
                  {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
                    <div
                      key={page}
                      className="mx-auto overflow-hidden rounded-xl border border-line bg-white"
                      style={{ width: pageWidth || undefined, minHeight: slotHeight, marginBottom: GAP }}
                    >
                      {visible.has(page) ? (
                        <Page
                          pageNumber={page}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          width={pageWidth || undefined}
                          devicePixelRatio={3}
                          loading={<div style={{ height: slotHeight }} />}
                        />
                      ) : (
                        <div
                          className="flex items-center justify-center text-xs text-muted"
                          style={{ height: slotHeight }}
                        >
                          {page}
                        </div>
                      )}
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
