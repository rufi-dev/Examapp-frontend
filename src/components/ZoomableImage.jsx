import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

// An image that opens full-screen on click so students can read a figure/graph
// clearly. The overlay is portalled to <body> so it sits above everything (and
// works even when the thumbnail lives inside a choice button). Click anywhere or
// press Esc to close.
const ZoomableImage = ({ src, alt = "", className = "" }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!src) return null;

  return (
    <>
      <img
        src={src}
        alt={alt}
        title="Böyütmək üçün klikləyin"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`cursor-zoom-in transition-opacity hover:opacity-90 ${className}`}
      />
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          >
            <img
              src={src}
              alt={alt}
              className="max-h-[92vh] max-w-[95vw] cursor-zoom-out rounded-lg object-contain shadow-lift"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              aria-label="Bağla"
              className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
            >
              <FiX className="text-xl" />
            </button>
          </div>,
          document.body
        )}
    </>
  );
};

export default ZoomableImage;
