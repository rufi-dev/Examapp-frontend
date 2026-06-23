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
  const wrapRef = useRef(null);
  const drag = useRef(null);
  const pdfRef = useRef(null); // the loaded pdf.js document (for fresh crops)

  // If the parent hands us a different PDF while this stays mounted, follow it —
  // otherwise we'd keep cropping the PREVIOUS document the user can't see.
  useEffect(() => {
    if (file) {
      setSrc(file);
      pdfRef.current = null;
      setReady(false);
      setSel(null);
      setPreview(null);
      setPage(1);
    }
  }, [file]);

  const renderW = Math.round(PAGE_W * zoom);
  // Changing zoom resizes the page, so the old selection box no longer lines up
  // — clear it. The crop itself stays sharp because it reads the canvas's real
  // device pixels, which grow with zoom (a bigger, higher-resolution crop).
  const changeZoom = (z) => {
    setZoom(clamp(z, MIN_ZOOM, MAX_ZOOM));
    setSel(null);
    setPreview(null);
  };

  const pos = (e) => {
    const r = wrapRef.current.getBoundingClientRect();
    return { x: clamp(e.clientX - r.left, 0, r.width), y: clamp(e.clientY - r.top, 0, r.height) };
  };
  const onDown = (e) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    const p = pos(e);
    drag.current = p;
    setSel({ x: p.x, y: p.y, w: 0, h: 0 });
    setPreview(null);
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
      setPreview(out ? out.toDataURL("image/png") : null);
    } catch {
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
      const out = await cropToCanvas(sel);
      const blob = out && (await new Promise((res) => out.toBlob(res, "image/png")));
      if (!blob) {
        toast.error("Kəsmə alınmadı");
        return;
      }
      const f = new File([blob], `figure-${page}.png`, { type: "image/png" });
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
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-bold text-text">Şəkli PDF-dən kəs</h2>
          <p className="text-xs text-muted">
            Şəklin/qrafikin üzərində mausu sürüşdürərək sahəni seçin.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={apply}
            disabled={busy || !ready || !sel || sel.w < 8}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-fg shadow-soft transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {busy ? <Spinner size={16} /> : <FiCrop />} Kəs və əlavə et
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
            aria-label="Bağla"
          >
            <FiX />
          </button>
        </div>
      </header>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-auto bg-surface2/40 p-4">
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
                className="relative cursor-crosshair select-none rounded-lg border border-line bg-white shadow-soft"
                style={{ width: renderW, touchAction: "none" }}
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
