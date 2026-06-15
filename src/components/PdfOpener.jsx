import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page } from "react-pdf";
import { FiZoomIn, FiZoomOut, FiMaximize } from "react-icons/fi";

const GAP = 16; // space between pages
const PAD = 8; // padding around the column
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Normal scrollable PDF viewer: scroll to read; pinch (mobile) or buttons /
// Ctrl+wheel (desktop) to zoom. Only the pages near the view are rendered, so
// the page count never blows up memory. Zoom is a CSS scale over a sized
// wrapper so native scrolling still works, and pages render at high density so
// they stay sharp.
const PdfOpener = (props) => {
  const [numPages, setNumPages] = useState(0);
  const [pageRatio, setPageRatio] = useState(1.414); // height / width (A4)
  const [zoom, setZoom] = useState(1);
  const [visible, setVisible] = useState(new Set([1, 2, 3]));
  const visibleRef = useRef(new Set([1, 2, 3]));
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);
  const zoomRef = useRef(1);
  zoomRef.current = zoom;
  const pinch = useRef({ active: false, dist: 0, zoom0: 1 });

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

  const contentW = width || 0;
  const pageWidth = contentW ? contentW - 2 * PAD : 0;
  const slotHeight = pageWidth ? Math.round(pageWidth * pageRatio) : 400;
  const colHeight = numPages ? 2 * PAD + numPages * (slotHeight + GAP) : 0;

  // Which pages are near the viewport (-> render), from the native scroll pos.
  const recompute = useCallback(() => {
    const el = containerRef.current;
    if (!el || !numPages || !slotHeight) return;
    const z = zoomRef.current || 1;
    const ch = el.clientHeight || 1;
    const st = el.scrollTop || 0;
    const buffer = ch; // ~1 screen above/below
    const top = st / z - buffer;
    const bottom = (st + ch) / z + buffer;
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
  }, [numPages, slotHeight]);

  useEffect(() => {
    recompute();
  }, [recompute, width, pageRatio, zoom]);

  // Pinch (mobile) + Ctrl/⌘-wheel (desktop) zoom — non-passive so we can stop
  // the browser from zooming the whole page.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom((z) => clamp(z * (1 - e.deltaY * 0.0025), MIN_ZOOM, MAX_ZOOM));
      }
    };
    const onTS = (e) => {
      if (e.touches.length === 2) {
        pinch.current = { active: true, dist: dist(e.touches) || 1, zoom0: zoomRef.current };
      }
    };
    const onTM = (e) => {
      if (pinch.current.active && e.touches.length === 2) {
        e.preventDefault();
        const ratio = dist(e.touches) / pinch.current.dist;
        setZoom(clamp(pinch.current.zoom0 * ratio, MIN_ZOOM, MAX_ZOOM));
      }
    };
    const onTE = (e) => {
      if (e.touches.length < 2) pinch.current.active = false;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTS, { passive: false });
    el.addEventListener("touchmove", onTM, { passive: false });
    el.addEventListener("touchend", onTE, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTS);
      el.removeEventListener("touchmove", onTM);
      el.removeEventListener("touchend", onTE);
    };
  }, []);

  const btn =
    "grid h-9 w-9 place-items-center rounded-lg text-text transition-colors hover:bg-surface2 active:bg-surface2 disabled:opacity-40";

  const reset = () => {
    setZoom(1);
    if (containerRef.current) containerRef.current.scrollTo({ top: 0, left: 0 });
  };

  return (
    <div className="relative h-full w-full">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-0.5 rounded-xl border border-line bg-surface/90 p-1 shadow-soft backdrop-blur">
        <button
          type="button"
          onClick={() => setZoom((z) => clamp(+(z - 0.25).toFixed(2), MIN_ZOOM, MAX_ZOOM))}
          disabled={zoom <= MIN_ZOOM}
          className={btn}
          aria-label="Kiçilt"
        >
          <FiZoomOut />
        </button>
        <span className="w-11 text-center text-xs font-semibold tabular-nums text-muted">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => clamp(+(z + 0.25).toFixed(2), MIN_ZOOM, MAX_ZOOM))}
          disabled={zoom >= MAX_ZOOM}
          className={btn}
          aria-label="Böyüt"
        >
          <FiZoomIn />
        </button>
        <button type="button" onClick={reset} className={btn} aria-label="Sıfırla">
          <FiMaximize />
        </button>
      </div>

      <div
        ref={containerRef}
        onScroll={recompute}
        style={{ touchAction: "pan-x pan-y" }}
        className="scrollbar-thin h-full w-full overflow-auto"
      >
        <Document
          file={props.pdfFile}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="py-12 text-center text-sm text-muted">PDF yüklənir...</div>}
          error={<div className="py-12 text-center text-sm text-muted">PDF yüklənmədi</div>}
          noData={<div className="py-12 text-center text-sm text-muted">PDF yoxdur</div>}
        >
          {numPages > 0 && contentW > 0 && (
            <div style={{ width: contentW * zoom, height: colHeight * zoom }}>
              <div
                style={{
                  width: contentW,
                  padding: PAD,
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                }}
              >
                {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
                  <div
                    key={page}
                    className="mx-auto overflow-hidden rounded-xl border border-line bg-white"
                    style={{ width: pageWidth, minHeight: slotHeight, marginBottom: GAP }}
                  >
                    {visible.has(page) ? (
                      <Page
                        pageNumber={page}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        width={pageWidth}
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
              </div>
            </div>
          )}
        </Document>
      </div>
    </div>
  );
};

export default PdfOpener;
