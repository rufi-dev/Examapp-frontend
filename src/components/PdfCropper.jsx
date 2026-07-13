import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
// `?url` makes Vite hand back a real, served URL for the worker in BOTH the dev
// server and the production build. The bare `new URL(..., import.meta.url)` form
// can fail to resolve in the dev server for lazily-loaded chunks, which surfaces
// as "PDF yüklənmədi" on localhost.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";
import {
  FiX,
  FiCrop,
  FiMove,
  FiChevronLeft,
  FiChevronRight,
  FiUploadCloud,
  FiZoomIn,
  FiZoomOut,
} from "react-icons/fi";
import { toast } from "react-toastify";
import Spinner from "./Spinner";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const PAGE_W = 640; // base CSS render width of the page (zoom multiplies it)
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

// Crop a figure out of a PDF page — entirely in the browser, so it costs NO AI
// tokens. The teacher drags a box over a figure; we copy that region out of the
// rendered page canvas and hand back a PNG File to upload.
const PdfCropper = ({ file, onCrop, onClose }) => {
  const [src, setSrc] = useState(file || null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState(null); // {x,y,w,h} in CSS px relative to the page
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadErr, setLoadErr] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [preview, setPreview] = useState(null); // data URL of the pending crop
  // Pan by default so touch devices can freely scroll/position the PDF; the
  // teacher taps "Kəsməyə başla" to arm crop mode, THEN drags a box. Without
  // this, the first touch immediately started a selection and the page could
  // never be scrolled on a phone.
  const [cropMode, setCropMode] = useState(false);
  // Base render width fits the visible container (so the page never spills off a
  // phone screen), capped at PAGE_W on desktop. Zoom multiplies it.
  const [baseW, setBaseW] = useState(PAGE_W);
  const scrollRef = useRef(null);
  const wrapRef = useRef(null);
  const drag = useRef(null);
  const pdfRef = useRef(null); // the loaded pdf.js document (for fresh crops)
  const cropCanvasRef = useRef(null); // the canvas behind the current preview

  // If the parent hands us a different PDF while this stays mounted, follow it —
  // otherwise we'd keep cropping the PREVIOUS document the user can't see.
  useEffect(() => {
    if (file) {
      setSrc(file);
      pdfRef.current = null;
      cropCanvasRef.current = null;
      setReady(false);
      setSel(null);
      setPreview(null);
      setPage(1);
    }
  }, [file]);

  const renderW = Math.round(baseW * zoom);

  // Keep the base width in sync with the visible container (handles phones and
  // orientation changes). A width change invalidates the current selection.
  useEffect(() => {
    const measure = () => {
      const el = scrollRef.current;
      if (!el) return;
      const next = clamp(el.clientWidth - 32, 240, PAGE_W); // 32 = p-4 padding
      setBaseW((prev) => (prev === next ? prev : next));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [src]);
  useEffect(() => {
    setSel(null);
    setPreview(null);
    cropCanvasRef.current = null;
  }, [baseW]);
  // Changing zoom resizes the page, so the old selection box no longer lines up
  // — clear it. The crop itself stays sharp because it reads the canvas's real
  // device pixels, which grow with zoom (a bigger, higher-resolution crop).
  const changeZoom = (z) => {
    setZoom(clamp(z, MIN_ZOOM, MAX_ZOOM));
    setSel(null);
    setPreview(null);
    cropCanvasRef.current = null;
  };

  const pos = (e) => {
    const r = wrapRef.current.getBoundingClientRect();
    return { x: clamp(e.clientX - r.left, 0, r.width), y: clamp(e.clientY - r.top, 0, r.height) };
  };
  const onDown = (e) => {
    if (!cropMode) return; // pan mode: let the touch scroll the page freely
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    const p = pos(e);
    drag.current = p;
    setSel({ x: p.x, y: p.y, w: 0, h: 0 });
    setPreview(null);
    cropCanvasRef.current = null;
    wrapRef.current.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const p = pos(e);
    const s = drag.current;
    setSel({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    });
  };
  const onUp = () => {
    drag.current = null;
    // Build a live preview of the pending crop so the teacher SEES exactly what
    // will be added (and which page it comes from) before committing.
    makePreview();
  };

  const goPage = (d) => {
    setPage((p) => clamp(p + d, 1, numPages || 1));
    setSel(null);
    setPreview(null);
    cropCanvasRef.current = null;
    setReady(false);
  };

  // Re-render THIS page fresh from pdf.js (never read the displayed canvas,
  // which can be stale/from the wrong page) and crop the exact selected region.
  // The page is rendered at 2x the on-screen width for a crisp figure. Returns
  // the cropped canvas, or null if not ready / selection too small.
  const cropToCanvas = async (s) => {
    const pdf = pdfRef.current;
    if (!pdf || !s || s.w < 8 || s.h < 8) return null;
    const pg = await pdf.getPage(page);
    const base = pg.getViewport({ scale: 1 });
    const scale = (renderW * 2) / base.width;
    const vp = pg.getViewport({ scale });
    const full = document.createElement("canvas");
    full.width = Math.ceil(vp.width);
    full.height = Math.ceil(vp.height);
    await pg.render({ canvasContext: full.getContext("2d"), viewport: vp }).promise;
    // s is CSS px relative to the page (rendered at renderW); map to device px.
    const k = vp.width / renderW;
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(s.w * k));
    out.height = Math.max(1, Math.round(s.h * k));
    out
      .getContext("2d")
      .drawImage(full, s.x * k, s.y * k, s.w * k, s.h * k, 0, 0, out.width, out.height);
    return out;
  };

  const makePreview = async () => {
    try {
      const out = await cropToCanvas(sel);
      cropCanvasRef.current = out; // remember the EXACT canvas the user sees
      setPreview(out ? out.toDataURL("image/png") : null);
    } catch {
      cropCanvasRef.current = null;
      setPreview(null);
    }
  };

  const apply = async () => {
    if (!sel || sel.w < 8 || sel.h < 8) {
      toast.error("Şəkil sahəsini seçin (kursoru sürüşdürün)");
      return;
    }
    if (!pdfRef.current) {
      toast.error("Səhifə hələ hazır deyil");
      return;
    }
    setBusy(true);
    try {
      // Upload the SAME canvas that produced the preview — so what's added is
      // exactly what was shown. Only re-crop if no preview exists yet.
      const out = cropCanvasRef.current || (await cropToCanvas(sel));
      const blob = out && (await new Promise((res) => out.toBlob(res, "image/png")));
      if (!blob) {
        toast.error("Kəsmə alınmadı");
        return;
      }
      // Unique filename per crop: Cloudinary presets that key on the filename
      // would otherwise dedupe two crops from the same page (e.g. both
      // "figure-2.png") and hand back the FIRST upload's URL — so a new crop
      // would silently "add" an earlier, unrelated figure. A unique name forces
      // a fresh upload every time.
      const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      const f = new File([blob], `figure-p${page}-${stamp}.png`, { type: "image/png" });
      await onCrop(f);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[PdfCropper] crop failed:", e);
      toast.error("Kəsmə alınmadı");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1600] flex flex-col bg-bg">
      <header className="shrink-0 border-b border-line bg-surface">
        {/* Row 1: title + close (always fits) */}
        <div className="flex items-center justify-between gap-3 px-4 pt-3 sm:px-6">
          <h2 className="truncate font-display text-base font-bold text-text sm:text-lg">
            Şəkli PDF-dən kəs
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
            aria-label="Bağla"
          >
            <FiX />
          </button>
        </div>
        {/* Row 2: toolbar — wraps onto multiple lines on small screens instead of
            overflowing off the side. */}
        <div className="flex flex-wrap items-center gap-2 px-4 pb-2 pt-2.5 sm:px-6">
          <div className="flex items-center gap-1 rounded-xl border border-line bg-surface px-1 py-0.5">
            <button
              type="button"
              onClick={() => changeZoom(zoom - 0.5)}
              disabled={zoom <= MIN_ZOOM}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text disabled:opacity-30"
              aria-label="Kiçilt"
            >
              <FiZoomOut />
            </button>
            <span className="w-11 text-center text-xs font-semibold tabular-nums text-muted">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => changeZoom(zoom + 0.5)}
              disabled={zoom >= MAX_ZOOM}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text disabled:opacity-30"
              aria-label="Böyüt"
            >
              <FiZoomIn />
            </button>
          </div>
          {numPages > 1 && (
            <div className="flex items-center gap-1 rounded-xl border border-line bg-surface px-1 py-0.5">
              <button
                type="button"
                onClick={() => goPage(-1)}
                disabled={page <= 1}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text disabled:opacity-30"
                aria-label="Əvvəlki səhifə"
              >
                <FiChevronLeft />
              </button>
              <span className="px-1 text-xs font-semibold tabular-nums text-muted">
                {page}/{numPages}
              </span>
              <button
                type="button"
                onClick={() => goPage(1)}
                disabled={page >= numPages}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text disabled:opacity-30"
                aria-label="Növbəti səhifə"
              >
                <FiChevronRight />
              </button>
            </div>
          )}
          {/* pushes the crop actions to the right on wide screens; harmless on wrap */}
          <div className="grow" />
          <button
            type="button"
            onClick={() => {
              setCropMode((m) => !m);
              setSel(null);
              setPreview(null);
              cropCanvasRef.current = null;
            }}
            disabled={!ready}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition-colors disabled:opacity-40 ${
              cropMode
                ? "border-primary bg-primary text-primary-fg shadow-soft"
                : "border-line bg-surface text-text hover:border-primary/60 hover:text-primary"
            }`}
          >
            {cropMode ? <FiMove /> : <FiCrop />}
            {cropMode ? "Sürüşdür" : "Kəsməyə başla"}
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={busy || !ready || !cropMode || !sel || sel.w < 8}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-fg shadow-soft transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {busy ? <Spinner size={16} /> : <FiCrop />} Kəs və əlavə et
          </button>
        </div>
        {/* mode hint — full width, so it never squeezes the toolbar */}
        <p className="px-4 pb-2.5 text-xs text-muted sm:px-6">
          {cropMode
            ? "Şəklin/qrafikin üzərində barmağınızı sürüşdürərək sahəni seçin, sonra «Kəs və əlavə et»."
            : "PDF-i sərbəst sürüşdürün, uyğun yerə çatanda «Kəsməyə başla»-ya toxunun."}
        </p>
      </header>

      <div ref={scrollRef} className="scrollbar-brand min-h-0 flex-1 overflow-auto bg-surface2/40 p-4">
        {!src ? (
          <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
            <FiUploadCloud className="mx-auto text-3xl text-primary" />
            <p className="mt-3 text-sm text-muted">
              Kəsmək üçün PDF faylını seçin (idxal etdiyiniz PDF).
            </p>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover">
              PDF seç
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) setSrc(f);
                }}
              />
            </label>
          </div>
        ) : (
          <div className="mx-auto" style={{ width: renderW }}>
            <Document
              file={src}
              onLoadSuccess={(pdf) => {
                setLoadErr(null);
                pdfRef.current = pdf;
                setNumPages(pdf.numPages);
              }}
              onLoadError={(e) => {
                // eslint-disable-next-line no-console
                console.error("[PdfCropper] load error:", e);
                setLoadErr(e);
              }}
              onSourceError={(e) => {
                // eslint-disable-next-line no-console
                console.error("[PdfCropper] source error:", e);
                setLoadErr(e);
              }}
              loading={
                <div className="flex h-72 items-center justify-center">
                  <Spinner size={32} className="text-primary" />
                </div>
              }
              error={
                <div className="py-10 text-center text-sm text-danger">
                  PDF yüklənmədi
                  {loadErr && (
                    <span className="mt-2 block max-w-[320px] break-all text-[11px] font-normal text-muted">
                      {loadErr.name ? `${loadErr.name}: ` : ""}
                      {loadErr.message || String(loadErr)}
                    </span>
                  )}
                </div>
              }
            >
              <div
                ref={wrapRef}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                className={`relative select-none rounded-lg border shadow-soft ${
                  cropMode ? "cursor-crosshair border-primary" : "cursor-grab border-line"
                } bg-white`}
                // In pan mode allow the browser to scroll on touch; only lock
                // gestures (touchAction:none) once crop mode is armed so the drag
                // draws a box instead of scrolling.
                style={{ width: renderW, touchAction: cropMode ? "none" : "auto" }}
              >
                <Page
                  pageNumber={page}
                  width={renderW}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  onRenderSuccess={() => setReady(true)}
                  loading={
                    <div className="flex h-72 items-center justify-center">
                      <Spinner size={28} className="text-primary" />
                    </div>
                  }
                />
                {sel && (
                  <div
                    className="pointer-events-none absolute border-2 border-primary bg-primary/15"
                    style={{ left: sel.x, top: sel.y, width: sel.w, height: sel.h }}
                  />
                )}
              </div>
            </Document>
          </div>
        )}

        {/* Live preview of the pending crop — exactly what "Kəs və əlavə et" will
            add, taken from THIS page. If you don't see this panel after dragging,
            you're on an old cached build (hard-refresh / reinstall the app). */}
        {preview && (
          <div className="pointer-events-none fixed bottom-4 right-4 z-[1610] w-52 rounded-2xl border border-primary/40 bg-surface p-2.5 shadow-lift">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Önizləmə · səhifə {page}
            </p>
            <img
              src={preview}
              alt="Kəsiləcək sahənin önizləməsi"
              className="max-h-48 w-full rounded-lg border border-line bg-white object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfCropper;
