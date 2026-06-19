import { useRef, useState } from "react";
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
  const wrapRef = useRef(null);
  const drag = useRef(null);

  const renderW = Math.round(PAGE_W * zoom);
  // Changing zoom resizes the page, so the old selection box no longer lines up
  // — clear it. The crop itself stays sharp because it reads the canvas's real
  // device pixels, which grow with zoom (a bigger, higher-resolution crop).
  const changeZoom = (z) => {
    setZoom(clamp(z, MIN_ZOOM, MAX_ZOOM));
    setSel(null);
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
  };

  const goPage = (d) => {
    setPage((p) => clamp(p + d, 1, numPages || 1));
    setSel(null);
    setReady(false);
  };

  const apply = () => {
    if (!sel || sel.w < 8 || sel.h < 8) {
      toast.error("Şəkil sahəsini seçin (kursoru sürüşdürün)");
      return;
    }
    const canvas = wrapRef.current?.querySelector("canvas.react-pdf__Page__canvas");
    if (!canvas) {
      toast.error("Səhifə hələ hazır deyil");
      return;
    }
    // Map CSS-pixel selection to the canvas's device pixels.
    const sX = canvas.width / canvas.clientWidth;
    const sY = canvas.height / canvas.clientHeight;
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(sel.w * sX));
    out.height = Math.max(1, Math.round(sel.h * sY));
    out
      .getContext("2d")
      .drawImage(
        canvas,
        sel.x * sX,
        sel.y * sY,
        sel.w * sX,
        sel.h * sY,
        0,
        0,
        out.width,
        out.height
      );
    setBusy(true);
    out.toBlob(
      (blob) => {
        if (!blob) {
          setBusy(false);
          toast.error("Kəsmə alınmadı");
          return;
        }
        const f = new File([blob], `figure-${page}.png`, { type: "image/png" });
        Promise.resolve(onCrop(f)).finally(() => setBusy(false));
      },
      "image/png"
    );
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
      </div>
    </div>
  );
};

export default PdfCropper;
