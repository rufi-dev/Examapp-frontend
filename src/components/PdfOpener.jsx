import { useState, useRef, useEffect, useLayoutEffect, useCallback, memo } from "react";
import { Document, Page } from "react-pdf";
import { FiZoomIn, FiZoomOut, FiMaximize, FiAlertCircle } from "react-icons/fi";
import Spinner from "./Spinner";

// Centered status (spinner while loading, message on error) for the viewer.
const PdfStatus = ({ children, spinner = false, error = false }) => (
  <div className="flex h-full min-h-[260px] w-full flex-col items-center justify-center gap-3 px-6 text-center">
    {spinner && <Spinner size={34} className="text-primary" />}
    {error && <FiAlertCircle className="text-3xl text-danger" />}
    <div className={`text-sm font-medium ${error ? "text-danger" : "text-muted"}`}>{children}</div>
  </div>
);

const GAP = 16; // space between pages
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
// Browsers cap canvas size (~4096px per side on mobile Safari/Chrome); going
// over renders a BLANK white page. Stay safely under it.
const MAX_CANVAS_DIM = 3800;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// Supersample a bit for crisp text, but cap so high zoom doesn't blow up memory.
const RENDER_DPR = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);

// Scrollable PDF viewer. Pages are rendered at their ACTUAL display size (like a
// real PDF viewer) so text stays sharp at 100% and at every zoom — no CSS
// upscaling of a fixed render. Pinch uses a transient transform for smoothness,
// then commits and re-renders crisp. Virtualized so any page count stays light.
const PdfOpener = (props) => {
  const [numPages, setNumPages] = useState(0);
  const [errInfo, setErrInfo] = useState(null);
  const [pageRatio, setPageRatio] = useState(1.414); // height / width (A4)
  const [zoom, setZoom] = useState(1); // committed -> pages render at this size
  const [live, setLive] = useState(1); // transient pinch scale (CSS only)
  const [visible, setVisible] = useState(new Set([1, 2, 3]));
  const visibleRef = useRef(new Set([1, 2, 3]));
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);
  const zoomRef = useRef(1);
  zoomRef.current = zoom;
  const liveRef = useRef(1);
  liveRef.current = live;
  const pendingScroll = useRef(null);
  const rafRef = useRef(0);
  const pinch = useRef({ active: false });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Ignore 0-width (panel hidden on a tab switch) to keep scroll position.
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setWidth(w);
    };
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
  const pageWidth = contentW ? Math.round(contentW * zoom) : 0; // committed render width
  const slotHeight = pageWidth ? Math.round(pageWidth * pageRatio) : 400;
  const colHeight = numPages ? numPages * (slotHeight + GAP) : 0;

  // Scale the device-pixel-ratio down only when the page would exceed the max
  // canvas size — keeps normal zoom crisp, prevents blank pages at high zoom.
  const renderDpr = Math.max(
    0.8,
    Math.min(
      RENDER_DPR,
      MAX_CANVAS_DIM / Math.max(1, pageWidth),
      MAX_CANVAS_DIM / Math.max(1, pageWidth * pageRatio)
    )
  );

  const recompute = useCallback(() => {
    const el = containerRef.current;
    if (!el || !numPages || !slotHeight) return;
    const L = liveRef.current || 1;
    const ch = el.clientHeight || 1;
    const st = el.scrollTop || 0;
    const buffer = ch * 1.5;
    const top = st / L - buffer;
    const bottom = (st + ch) / L + buffer;
    const next = new Set();
    for (let p = 1; p <= numPages; p++) {
      const pTop = (p - 1) * (slotHeight + GAP);
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

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el && pendingScroll.current) {
      el.scrollLeft = pendingScroll.current.left;
      el.scrollTop = pendingScroll.current.top;
      pendingScroll.current = null;
    }
  }, [zoom, live]);

  const onScroll = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      recompute();
    });
  };

  // Commit zoom toward a screen point (re-renders crisp).
  const zoomTo = useCallback((target, sx, sy) => {
    const el = containerRef.current;
    if (!el) return;
    const z0 = zoomRef.current;
    const z1 = clamp(target, MIN_ZOOM, MAX_ZOOM);
    if (z1 === z0) return;
    const fx = sx != null ? sx : el.clientWidth / 2;
    const fy = sy != null ? sy : el.clientHeight / 2;
    const r = z1 / z0;
    pendingScroll.current = { left: (el.scrollLeft + fx) * r - fx, top: (el.scrollTop + fy) * r - fy };
    setZoom(z1);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        zoomTo(zoomRef.current * (1 - e.deltaY * 0.0025), e.clientX - rect.left, e.clientY - rect.top);
      }
    };
    const onTS = (e) => {
      if (e.touches.length === 2) {
        const rect = el.getBoundingClientRect();
        pinch.current = {
          active: true,
          dist0: dist(e.touches) || 1,
          mx: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
          my: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
          sl: el.scrollLeft,
          st: el.scrollTop,
        };
      }
    };
    const onTM = (e) => {
      const p = pinch.current;
      if (p.active && e.touches.length === 2) {
        e.preventDefault();
        const z0 = zoomRef.current;
        const L = clamp(dist(e.touches) / p.dist0, MIN_ZOOM / z0, MAX_ZOOM / z0);
        pendingScroll.current = { left: (p.sl + p.mx) * L - p.mx, top: (p.st + p.my) * L - p.my };
        setLive(L);
      }
    };
    const onTE = (e) => {
      const p = pinch.current;
      if (p.active && e.touches.length < 2) {
        p.active = false;
        const z0 = zoomRef.current;
        const L = liveRef.current;
        const newZoom = clamp(z0 * L, MIN_ZOOM, MAX_ZOOM);
        pendingScroll.current = { left: (p.sl + p.mx) * L - p.mx, top: (p.st + p.my) * L - p.my };
        setLive(1);
        setZoom(newZoom);
      }
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
  }, [zoomTo]);

  const btn =
    "grid h-9 w-9 place-items-center rounded-lg text-text transition-colors hover:bg-surface2 active:bg-surface2 disabled:opacity-40";

  const reset = () => {
    pendingScroll.current = { left: 0, top: 0 };
    setZoom(1);
  };

  return (
    <div className="relative h-full w-full">
      {numPages > 0 && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-0.5 rounded-xl border border-line bg-surface/90 p-1 shadow-soft backdrop-blur">
          <button type="button" onClick={() => zoomTo(zoom - 0.25)} disabled={zoom <= MIN_ZOOM} className={btn} aria-label="Kiçilt">
            <FiZoomOut />
          </button>
          <span className="w-11 text-center text-xs font-semibold tabular-nums text-muted">
            {Math.round(zoom * 100)}%
          </span>
          <button type="button" onClick={() => zoomTo(zoom + 0.25)} disabled={zoom >= MAX_ZOOM} className={btn} aria-label="Böyüt">
            <FiZoomIn />
          </button>
          <button type="button" onClick={reset} className={btn} aria-label="Sıfırla">
            <FiMaximize />
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        onScroll={onScroll}
        style={{ touchAction: "pan-x pan-y" }}
        className="scrollbar-thin h-full w-full overflow-auto p-1"
      >
        <Document
          file={props.pdfFile}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(e) => {
            // eslint-disable-next-line no-console
            console.error("[PDF] load error:", e, "url:", props.pdfFile);
            setErrInfo(e);
          }}
          onSourceError={(e) => {
            // eslint-disable-next-line no-console
            console.error("[PDF] source error:", e, "url:", props.pdfFile);
            setErrInfo(e);
          }}
          loading={<PdfStatus spinner>PDF yüklənir...</PdfStatus>}
          error={
            <PdfStatus error>
              PDF yüklənmədi
              {errInfo && (
                <span className="mt-2 block max-w-[280px] break-all text-[11px] font-normal text-muted">
                  {errInfo.name ? `${errInfo.name}: ` : ""}
                  {errInfo.message || String(errInfo)}
                </span>
              )}
              <span className="mt-1 block max-w-[280px] break-all text-[10px] font-normal text-muted/70">
                {String(props.pdfFile || "(boş)").slice(0, 160)}
              </span>
            </PdfStatus>
          }
          noData={<PdfStatus spinner>PDF yüklənir...</PdfStatus>}
        >
          {numPages > 0 && contentW > 0 && (
            <div style={{ width: pageWidth * live, height: colHeight * live }}>
              <div
                style={{
                  width: pageWidth,
                  ...(live !== 1 ? { transform: `scale(${live})`, transformOrigin: "top left" } : {}),
                }}
              >
                {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
                  <div
                    key={page}
                    className="relative overflow-hidden rounded-lg border border-line bg-white"
                    style={{ width: pageWidth, height: slotHeight, marginBottom: GAP }}
                  >
                    {visible.has(page) ? (
                      <>
                        {/* Persistent low-res copy, rendered once at base width and
                            CSS-scaled to the current zoom. It never re-renders when
                            zooming, so it stays on screen and the crisp layer above
                            can re-rasterize without a white flash. */}
                        <div
                          className="absolute inset-0"
                          style={{
                            transformOrigin: "top left",
                            transform: `scale(${pageWidth / contentW})`,
                          }}
                        >
                          <Page
                            pageNumber={page}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            width={contentW}
                            devicePixelRatio={1}
                            loading={<div style={{ height: slotHeight }} className="bg-white" />}
                          />
                        </div>
                        {/* Crisp layer at the exact zoom; transparent while it
                            re-renders so the copy below shows through (no flash). */}
                        <div className="absolute inset-0">
                          <Page
                            pageNumber={page}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            width={pageWidth}
                            devicePixelRatio={renderDpr}
                            loading={<div style={{ height: slotHeight }} />}
                          />
                        </div>
                      </>
                    ) : (
                      <div style={{ height: slotHeight }} className="animate-pulse bg-surface2/40" />
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

// Memoized: the heaviest component in the exam (canvas rendering). pdfFile is
// stable, so it must not re-rasterize just because the parent's 1s timer ticked.
export default memo(PdfOpener);
