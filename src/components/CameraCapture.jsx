import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { FiCamera, FiX, FiAlertCircle, FiCheck } from "react-icons/fi";
import Spinner from "./Spinner";

// In-page camera capture (getUserMedia). Runs a live preview INSIDE the current
// tab, so photographing never backgrounds the app — no false anti-cheat violation
// during an exam, and no OS gallery access (camera only). Falls back to a
// direct-camera file input on devices without getUserMedia (that path DOES
// background, so it pings onActivity for the anti-cheat grace).
//
// onUse receives a Blob/File to upload. With `multi`, the camera stays open after
// each "İstifadə et" so several pages can be shot in a row; `count` shows how many
// are already taken and the done button closes.
const CameraCapture = ({
  onUse,
  onClose,
  onActivity,
  title = "Həll şəklini çək",
  multi = false,
  count = 0,
}) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | live | error
  const [shot, setShot] = useState(null); // { url, blob } while previewing

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setStatus("loading");
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        // Explicitly start playback so a REAL frame exists before capture — on
        // iOS/Android the autoplay attributes can otherwise leave the first frames
        // black, which then export as a solid-black JPEG.
        try {
          await v.play();
        } catch {
          /* autoPlay + playsInline cover browsers that reject the play() promise */
        }
      }
      setStatus("live");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return stopStream;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw the CURRENT painted video frame to a canvas and hand up a JPEG blob. A
  // white base first, so even a partial/empty draw can never come out solid black.
  const grabFrame = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setShot({ url: URL.createObjectURL(blob), blob });
        stopStream(); // free the camera while the still is reviewed
      },
      "image/jpeg",
      0.92
    );
  };

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || v.readyState < 2) return; // wait for a painted frame
    // Capture on the NEXT presented video frame so the canvas is never empty
    // (an empty canvas exports as a solid-black JPEG). requestVideoFrameCallback
    // guarantees a real frame; fall back to rAF where it's unsupported (iOS < 16).
    if (typeof v.requestVideoFrameCallback === "function") {
      v.requestVideoFrameCallback(() => grabFrame());
    } else {
      requestAnimationFrame(() => grabFrame());
    }
  };

  const retake = () => {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
    startCamera();
  };

  const close = () => {
    stopStream();
    if (shot) URL.revokeObjectURL(shot.url);
    onClose();
  };

  const use = () => {
    if (!shot) return;
    onUse(shot.blob);
    if (multi) {
      // Keep shooting: drop the still and bring the live preview back.
      URL.revokeObjectURL(shot.url);
      setShot(null);
      startCamera();
    }
  };

  const onFallbackFile = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length) files.forEach((f) => onUse(f));
    if (!files.length || !multi) close();
  };

  // Portal to <body> so a parent <fieldset disabled> (the post-submit lock) can never
  // disable/trap this modal's own controls mid-capture.
  return createPortal(
    <div className="fixed inset-0 z-[2200] flex flex-col bg-black">
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {title}
          {multi && count > 0 && (
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-bold tabular-nums">
              {count} şəkil
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={close}
          aria-label="Bağla"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"
        >
          <FiX className="text-lg" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {status === "error" ? (
          <div className="p-6 text-center text-white">
            <FiAlertCircle className="mx-auto mb-2 text-2xl" />
            <p className="text-sm">Kameraya giriş yoxdur.</p>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
              <FiCamera /> Kamera ilə çək
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple={multi}
                className="hidden"
                onClick={() => onActivity?.()}
                onChange={onFallbackFile}
              />
            </label>
          </div>
        ) : shot ? (
          <img src={shot.url} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>

      <div className="flex items-center justify-center gap-4 px-4 py-6">
        {shot ? (
          <>
            <button
              type="button"
              onClick={retake}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              Yenidən çək
            </button>
            <button
              type="button"
              onClick={use}
              className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              İstifadə et
            </button>
          </>
        ) : status === "live" ? (
          <>
            {multi && count > 0 && <span className="w-24" aria-hidden />}
            <button
              type="button"
              onClick={capture}
              aria-label="Çək"
              className="grid h-16 w-16 place-items-center rounded-full border-4 border-white transition active:scale-95"
            >
              <span className="h-12 w-12 rounded-full bg-white" />
            </button>
            {multi && count > 0 && (
              <button
                type="button"
                onClick={close}
                className="inline-flex w-24 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                <FiCheck /> Hazır
              </button>
            )}
          </>
        ) : status === "loading" ? (
          <Spinner size={28} className="text-white" />
        ) : null}
      </div>
    </div>,
    document.body
  );
};

// Normalize a captured photo into a clean, bounded, NAMED sRGB JPEG File before
// upload. A raw getUserMedia canvas blob can be large and wide-gamut (Display P3)
// and, appended to FormData without a filename, iOS Safari can round-trip it
// through Cloudinary as a BLACK image even though it previews fine locally. Re-
// decoding + re-drawing onto a white-based canvas produces plain sRGB that stores
// correctly. Falls back to a named File wrapper if decoding fails. `max` bounds
// the longest side (answer sheets use a larger value so small marks stay legible).
export const normalizeImageBlob = (blob, { prefix = "solution", max = 1600 } = {}) =>
  new Promise((resolve) => {
    // Reach the global Math explicitly — some importers shadow it with a LaTeX
    // component named `Math`.
    const M = window.Math;
    // UNIQUE name per photo — if the Cloudinary preset uses the filename as the
    // public_id without uniquifying, a fixed name would overwrite every prior
    // upload.
    const name = `${prefix}-${Date.now()}-${M.random().toString(36).slice(2, 8)}.jpg`;
    const asFile = (b) => (b instanceof File ? b : new File([b], name, { type: "image/jpeg" }));
    let done = false;
    const finish = (b) => {
      if (done) return;
      done = true;
      resolve(asFile(b));
    };
    // Bulletproof: if decode/encode stalls (iOS), upload the original valid blob
    // (still named) after a short wait so the button can never spin forever.
    const timer = setTimeout(() => finish(blob), 4000);
    try {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        try {
          const scale = M.min(1, max / M.max(img.naturalWidth || 1, img.naturalHeight || 1));
          const w = M.max(1, M.round((img.naturalWidth || 1) * scale));
          const h = M.max(1, M.round((img.naturalHeight || 1) * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          // Synchronous toDataURL — reliable on iOS Safari, unlike toBlob whose
          // callback can NEVER fire there (which hangs the whole upload). Then
          // decode the base64 to bytes -> a named sRGB JPEG File.
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          const b64 = dataUrl.split(",")[1] || "";
          const bin = atob(b64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          finish(new File([bytes], name, { type: "image/jpeg" }));
        } catch {
          finish(blob);
        }
      };
      img.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        finish(blob);
      };
      img.src = url;
    } catch {
      clearTimeout(timer);
      finish(blob);
    }
  });

export default CameraCapture;
