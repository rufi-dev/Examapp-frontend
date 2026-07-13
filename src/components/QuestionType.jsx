import { memo, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { FiFlag, FiCamera, FiX, FiAlertCircle } from "react-icons/fi";
import { toast } from "react-toastify";
import Math, { MathText } from "./Math";
import MatchingQuestion from "./MatchingQuestion";
import MatchingGridQuestion from "./MatchingGridQuestion";
import ZoomableImage from "./ZoomableImage";
import Spinner from "./Spinner";
import { uploadImage } from "../helper/cloudinary";

const LABELS = {
  Cm: "Qapalı sual",
  Co: "Açıq sual",
  Cma: "Uyğunluq",
  Cmu: "Uyğunluq",
  Cd: "Həlli tələb olunan açıq sual",
};
const DEFAULT_OPTIONS = ["a", "b", "c", "d", "e"];
const GRID_LETTERS = "abcdefghijklmnopqrstuvwxyz";

const norm = (v) => String(v ?? "").trim();

// In-page camera capture (getUserMedia). Runs a live preview INSIDE the exam tab,
// so photographing a worked solution never backgrounds the app — no false anti-cheat
// violation, and no OS gallery access (camera only). Falls back to a direct-camera
// file input on devices without getUserMedia (that path DOES background, so it pings
// onActivity for the anti-cheat grace). onUse receives a Blob/File to upload.
const CameraCapture = ({ onUse, onClose, onActivity }) => {
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
        stopStream(); // free the camera while the student reviews the still
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

  const onFallbackFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onUse(file);
    else close();
  };

  // Portal to <body> so a parent <fieldset disabled> (the post-submit lock) can never
  // disable/trap this modal's own controls mid-capture.
  return createPortal(
    <div className="fixed inset-0 z-[2200] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-semibold">Həll şəklini çək</span>
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
              onClick={() => onUse(shot.blob)}
              className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              İstifadə et
            </button>
          </>
        ) : status === "live" ? (
          <button
            type="button"
            onClick={capture}
            aria-label="Çək"
            className="grid h-16 w-16 place-items-center rounded-full border-4 border-white transition active:scale-95"
          >
            <span className="h-12 w-12 rounded-full bg-white" />
          </button>
        ) : status === "loading" ? (
          <Spinner size={28} className="text-white" />
        ) : null}
      </div>
    </div>,
    document.body
  );
};

// Per-question "photograph my worked solution" control (live exam only). Camera
// only — opens the in-page camera; no OS gallery selection.
const SolutionPhoto = ({ value, onChange, disabled = false, onActivity }) => {
  const [busy, setBusy] = useState(false);
  const [camOpen, setCamOpen] = useState(false);
  const useShot = async (blob) => {
    setCamOpen(false);
    if (!blob || disabled) return;
    setBusy(true);
    try {
      onChange(await uploadImage(blob));
    } catch (err) {
      toast.error(err?.message || "Şəkil yüklənmədi");
    } finally {
      setBusy(false);
    }
  };
  if (value) {
    return (
      <div className="mt-3">
        <p className="mb-1 text-xs font-semibold text-muted">Həll şəklin:</p>
        <div className="relative inline-block">
          <img
            src={value}
            alt=""
            className="max-h-44 rounded-xl border border-line object-contain"
          />
          <button
            type="button"
            onClick={() => !disabled && onChange("")}
            disabled={disabled}
            aria-label="Şəkli sil"
            className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border-2 border-surface bg-danger text-white shadow-soft disabled:opacity-50"
          >
            <FiX className="text-sm" />
          </button>
        </div>
      </div>
    );
  }
  return (
    <>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => setCamOpen(true)}
        className={`mt-3 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-line px-3 py-2 text-sm font-semibold transition-colors ${
          disabled
            ? "cursor-not-allowed text-muted opacity-50"
            : "cursor-pointer text-muted hover:border-primary hover:text-primary"
        }`}
      >
        {busy ? <Spinner size={16} /> : <FiCamera />} Həll şəklini çək
      </button>
      {camOpen && (
        <CameraCapture
          onUse={useShot}
          onClose={() => setCamOpen(false)}
          onActivity={onActivity}
        />
      )}
    </>
  );
};
// Normalize any choice-answer shape to a numeric-index array / set.
const toIndexArray = (v) =>
  Array.isArray(v) ? v.map(Number) : v === "" || v == null ? [] : [Number(v)];
const toIndexSet = (v) => new Set(toIndexArray(v));
const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);

// Renders a question stem: text + LaTeX + image(s). For legacy PDF questions
// (no structured content) it falls back to the plain "<label> N" caption.
const Stem = ({ def, i, label }) => {
  const hasStructured =
    norm(def.text) || norm(def.latex) || def.image || (def.images && def.images.length);
  if (!hasStructured) {
    return <p className="text-[15px] font-semibold text-text">{`${label} ${i + 1}`}</p>;
  }
  return (
    <div className="min-w-0 space-y-2">
      <p className="text-[15px] font-semibold leading-relaxed text-text">
        <span className="text-muted">{i + 1}.</span> <MathText text={def.text} />{" "}
        {norm(def.latex) ? <Math latex={def.latex} /> : null}
      </p>
      {def.image && (
        <ZoomableImage
          src={def.image}
          className="max-h-64 rounded-xl border border-line object-contain"
        />
      )}
      {Array.isArray(def.images) &&
        def.images.map((u, k) => (
          <ZoomableImage
            key={k}
            src={u}
            className="max-h-64 rounded-xl border border-line object-contain"
          />
        ))}
    </div>
  );
};

const QuestionType = ({
  singleClass,
  singleTag,
  answers = [],
  review,
  questions,
  handleAnswerChange,
  marked = [],
  onToggleMark,
  // Optional render window {start, end} for paginated exams. Indices stay
  // GLOBAL (answers[i], q-${i}, handlers) — we just skip questions outside the
  // current page. Omitted => render every question (default, all-on-one-page).
  range = null,
  // Per-question solution photos: in the live exam (allowPhoto) the student can
  // upload one per question; in review the stored photo is shown.
  allowPhoto = false,
  onPhotoChange,
  // Called when the solution-photo picker is opened/returned, so the runner can
  // pause anti-cheat (the camera/file dialog backgrounds the tab).
  onPhotoActivity,
  // Frozen after the student submits: dim the sheet + disable the photo control.
  // (Answer/choice changes are already no-ops via the parent's guarded handlers,
  // and controlled inputs render from state, so nothing can change while locked.)
  locked = false,
}) => {
  const selectedAnswers = review?.selectedAnswers || [];
  const isReview = selectedAnswers.length > 0;

  // True when the student actually answered (any answer shape: text / index /
  // array of indices / matching map). Empty string, [], {} and null = no answer.
  const answeredVal = (v) => {
    if (v == null || v === "") return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return String(v).trim() !== "";
  };
  // In review, an unmistakable "left blank" chip so an empty answer reads as
  // skipped, not as a wrong choice.
  const unansweredBadge = (i) =>
    isReview && !answeredVal(selectedAnswers[i]?.answer) ? (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-warning/40 bg-warning/15 px-2 py-1 text-xs font-semibold text-warning">
        <FiAlertCircle /> Cavabsız buraxılıb
      </span>
    ) : null;

  // The solution-photo control (live upload) / display (review) for question i.
  const photoBlock = (i) => {
    if (isReview) {
      const p = selectedAnswers[i]?.photo;
      if (!p) return null;
      return (
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold text-muted">Şagirdin həll şəkli:</p>
          <ZoomableImage
            src={p}
            className="max-h-56 rounded-xl border border-line object-contain"
          />
        </div>
      );
    }
    if (!allowPhoto) return null;
    return (
      <SolutionPhoto
        value={answers[i]?.photo}
        onChange={(url) => onPhotoChange?.(i, url)}
        onActivity={onPhotoActivity}
        disabled={locked}
      />
    );
  };

  const markBtn = (i) =>
    !isReview && onToggleMark ? (
      <button
        type="button"
        onClick={() => onToggleMark(i)}
        aria-label="Yoxlama üçün işarələ"
        className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition-colors ${
          marked[i]
            ? "border-warning bg-warning/15 text-warning"
            : "border-line text-muted hover:text-text"
        }`}
      >
        <FiFlag className={marked[i] ? "fill-current" : ""} />
        {marked[i] ? "İşarələnib" : "İşarələ"}
      </button>
    ) : null;

  const countBased = () => {
    const defs = [];
    const push = (n, type, options) => {
      for (let i = 0; i < n; i++) defs.push({ type, options });
    };
    if (singleTag?.name === "Buraxılış" && singleClass?.level === 9) {
      push(15, "Cm", DEFAULT_OPTIONS);
      push(6, "Co");
      push(4, "Cd");
    } else if (singleTag?.name === "Buraxılış" && singleClass?.level === 11) {
      push(13, "Cm", DEFAULT_OPTIONS);
      push(5, "Co");
      push(7, "Cd");
    } else if (
      singleTag?.name === "Blok" &&
      (singleClass?.level === 1 || singleClass?.level === 2)
    ) {
      push(22, "Cm", DEFAULT_OPTIONS);
      push(4, "Co");
      push(1, "Cma");
      push(3, "Cd");
    } else {
      push(25, "Cm", DEFAULT_OPTIONS);
    }
    return defs;
  };

  const defs =
    questions && questions.length > 0
      ? questions.map((q) => ({
          type: q.type || "Cm",
          options: q.options?.length ? q.options : DEFAULT_OPTIONS,
          // Structured fields (undefined on PDF exams → legacy rendering).
          text: q.text,
          image: q.image,
          images: q.images,
          latex: q.latex,
          choices: q.choices,
          lefts: q.lefts, // matching: left column (sanitized run payload)
          rights: q.rights, // matching: shuffled right column (run payload)
          pairs: q.pairs, // matching: full pairs (review payload)
          leftCount: q.leftCount, // Cmu: number of left numbers (run payload)
          rightCount: q.rightCount, // Cmu: number of right letters (run payload)
          key: q.key, // Cmu: correct letter indices per number (review only)
        }))
      : countBased();

  const setAnswer = (i, value, type) =>
    handleAnswerChange?.({ target: { value } }, i, type);

  // Choice (Cm/Cs) fill colour, unified for run + review via index sets.
  const choiceClass = (i, ci) => {
    if (isReview) {
      const correctSet = toIndexSet(answers[i]?.answer);
      const userSet = toIndexSet(selectedAnswers[i]?.answer);
      if (correctSet.has(ci)) return "border-success bg-success text-white";
      if (userSet.has(ci)) return "border-danger bg-danger text-white";
      return "border-line bg-surface text-muted";
    }
    return toIndexSet(answers[i]?.answer).has(ci)
      ? "border-primary bg-primary text-primary-fg"
      : "border-line bg-surface text-text hover:border-primary/40";
  };

  // Legacy PDF letter-button colour (compares letters, not indices).
  const optionClass = (i, option) => {
    const isCorrectOpt = norm(answers[i]?.answer) === norm(option);
    const userAns = norm(selectedAnswers[i]?.answer);
    if (isReview) {
      if (isCorrectOpt) return "border-success bg-success text-white";
      if (norm(option) === userAns) return "border-danger bg-danger text-white";
      return "border-line bg-surface text-muted";
    }
    if (isCorrectOpt) return "border-primary bg-primary text-primary-fg";
    return "border-line bg-surface text-muted hover:border-primary/40";
  };

  const onChoice = (i, ci, multi) => {
    if (!multi) return setAnswer(i, ci, "Cm");
    const cur = toIndexArray(answers[i]?.answer);
    const next = cur.includes(ci)
      ? cur.filter((x) => x !== ci)
      : [...cur, ci].sort((a, b) => a - b);
    setAnswer(i, next, "Cs");
  };

  // Teacher explanation, shown only in review (it's part of the revealed key).
  const explanationNote = (def) =>
    isReview && def.explanation ? (
      <div className="mt-2.5 rounded-lg border border-line bg-surface2/40 px-3 py-2 text-sm leading-relaxed text-muted">
        <span className="font-semibold text-text">İzah: </span>
        <MathText text={def.explanation} />
      </div>
    ) : null;

  // Structured single/multi choice list.
  const renderChoices = (def, i, multi) => (
    <div className="flex flex-col gap-2">
      {def.choices.map((choice, ci) => {
        const selected = !isReview && toIndexSet(answers[i]?.answer).has(ci);
        return (
          <button
            key={ci}
            type="button"
            disabled={isReview}
            onClick={() => onChoice(i, ci, multi)}
            className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-[15px] font-medium transition-colors ${choiceClass(
              i,
              ci
            )}`}
          >
            {multi ? (
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded border border-current text-[11px] font-bold">
                {selected ? "✓" : ""}
              </span>
            ) : (
              <span className="w-5 shrink-0 font-bold">{String.fromCharCode(65 + ci)}</span>
            )}
            <span className="min-w-0 flex-1 break-words">
              <MathText text={choice.text} />
              {norm(choice.latex) ? (
                <>
                  {" "}
                  <Math latex={choice.latex} />
                </>
              ) : null}
            </span>
            {choice.image && (
              <ZoomableImage src={choice.image} className="max-h-14 rounded object-contain" />
            )}
          </button>
        );
      })}
    </div>
  );

  // Matching: left column (in order) + a dropdown of the right column. During
  // the exam the rights are shuffled by the server; in review we show each
  // student pick vs the correct one.
  const renderMatching = (def, i) => {
    const lefts =
      def.lefts ||
      (def.pairs
        ? def.pairs.map((p) => ({ text: p.left, latex: p.leftLatex, image: p.leftImage }))
        : []);
    const rights =
      def.rights ||
      (def.pairs
        ? def.pairs.map((p) => ({ text: p.right, latex: p.rightLatex, image: p.rightImage }))
        : []);

    if (isReview) {
      const chosenMap = isMap(selectedAnswers[i]?.answer) ? selectedAnswers[i].answer : {};
      const correctArr = answers[i]?.answer; // renderableCorrect: right texts in left order
      return (
        <div className="space-y-2">
          {lefts.map((lf, li) => {
            const chosen = chosenMap[li];
            const correctR = (Array.isArray(correctArr) ? correctArr[li] : null) ?? def.pairs?.[li]?.right;
            const ok = norm(chosen) && norm(chosen) === norm(correctR);
            return (
              <div
                key={li}
                className={`rounded-xl border px-3 py-2 ${
                  ok ? "border-success bg-success/10" : "border-danger bg-danger/10"
                }`}
              >
                <div className="text-[15px] font-medium text-text">
                  <MathText text={lf.text} />
                  {norm(lf.latex) ? (
                    <>
                      {" "}
                      <Math latex={lf.latex} />
                    </>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 text-sm">
                  <span className={ok ? "text-success" : "text-danger"}>
                    Sənin: {norm(chosen) ? <MathText text={chosen} /> : "—"}
                  </span>
                  {!ok && (
                    <span className="text-success">
                      Doğru: {norm(correctR) ? <MathText text={correctR} /> : "—"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className={locked ? "pointer-events-none" : undefined}>
        <MatchingQuestion
          lefts={lefts}
          rights={rights}
          value={answers[i]?.answer}
          onChange={(m) => setAnswer(i, m, "Cma")}
        />
      </div>
    );
  };

  // Correspondence (Cmu): numbers -> letters, one-to-many. RUN: a grid of toggle
  // buttons. REVIEW: per number, the student's letters vs the correct letters.
  const renderCorrespondence = (def, i) => {
    const leftCount = Number(def.leftCount) || 0;
    const lettersOf = (arr) =>
      (Array.isArray(arr) ? arr : [])
        .map(Number)
        .sort((a, b) => a - b)
        .map((ri) => GRID_LETTERS[ri] || "?");

    if (isReview) {
      const chosenMap = isMap(selectedAnswers[i]?.answer) ? selectedAnswers[i].answer : {};
      const correctArr = Array.isArray(answers[i]?.answer) ? answers[i].answer : [];
      const rows = leftCount || correctArr.length;
      const setEq = (x, y) => {
        const xs = new Set((Array.isArray(x) ? x : []).map(Number));
        const ys = (Array.isArray(y) ? y : []).map(Number);
        return xs.size === ys.length && ys.every((v) => xs.has(v));
      };
      return (
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, li) => {
            const chosen = chosenMap[li];
            const correct = correctArr[li];
            const ok = setEq(chosen, correct);
            const chosenL = lettersOf(chosen);
            const correctL = lettersOf(correct);
            return (
              <div
                key={li}
                className={`rounded-xl border px-3 py-2 ${
                  ok ? "border-success bg-success/10" : "border-danger bg-danger/10"
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="font-semibold text-text">{li + 1}.</span>
                  <span className={ok ? "text-success" : "text-danger"}>
                    Sənin: {chosenL.length ? chosenL.join(", ") : "—"}
                  </span>
                  {!ok && (
                    <span className="text-success">
                      Doğru: {correctL.length ? correctL.join(", ") : "—"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className={locked ? "pointer-events-none" : undefined}>
        <MatchingGridQuestion
          leftCount={leftCount}
          rightCount={Number(def.rightCount) || 0}
          value={answers[i]?.answer}
          onChange={(m) => setAnswer(i, m, "Cmu")}
        />
      </div>
    );
  };

  return (
    // A native <fieldset disabled> disables EVERY control inside (choice buttons,
    // textareas, mark, photo, matching) when the sheet is locked after submit —
    // without affecting scrolling — so the whole sheet clearly reads as frozen.
    <fieldset
      disabled={locked}
      className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0 transition-opacity disabled:opacity-60"
    >
      {defs.map((def, i) => {
        // Pagination: render only questions inside the active page window.
        if (range && (i < range.start || i >= range.end)) return null;
        const structuredChoice =
          (def.type === "Cm" || def.type === "Cs") &&
          Array.isArray(def.choices) &&
          def.choices.length;

        // Structured single / multi choice.
        if (structuredChoice) {
          return (
            <div key={i} id={`q-${i}`} className="scroll-mt-4">
              <div className="mb-2.5 flex items-start justify-between gap-2">
                <Stem def={def} i={i} label={LABELS.Cm} />
                {markBtn(i)}
                {unansweredBadge(i)}
              </div>
              {renderChoices(def, i, def.type === "Cs")}
              {explanationNote(def)}
              {photoBlock(i)}
            </div>
          );
        }

        // Matching (structured run payload has lefts/rights; review has pairs).
        if (def.type === "Cma" && (def.lefts || def.pairs)) {
          return (
            <div key={i} id={`q-${i}`} className="scroll-mt-4">
              <div className="mb-2.5 flex items-start justify-between gap-2">
                <Stem def={def} i={i} label={LABELS.Cma} />
                {markBtn(i)}
                {unansweredBadge(i)}
              </div>
              {renderMatching(def, i)}
              {explanationNote(def)}
              {photoBlock(i)}
            </div>
          );
        }

        // Correspondence (Cmu): numbers -> letters grid (run) / per-number review.
        if (def.type === "Cmu") {
          return (
            <div key={i} id={`q-${i}`} className="scroll-mt-4">
              <div className="mb-2.5 flex items-start justify-between gap-2">
                <Stem def={def} i={i} label={LABELS.Cmu} />
                {markBtn(i)}
                {unansweredBadge(i)}
              </div>
              {renderCorrespondence(def, i)}
              {explanationNote(def)}
              {photoBlock(i)}
            </div>
          );
        }

        // Legacy PDF single-choice: letter buttons.
        if (def.type === "Cm") {
          return (
            <div key={i} id={`q-${i}`} className="scroll-mt-4">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <p className="text-[15px] font-semibold text-text">
                  {LABELS.Cm} {i + 1}
                </p>
                {markBtn(i)}
                {unansweredBadge(i)}
              </div>
              <div className="flex flex-wrap gap-3">
                {(def.options || DEFAULT_OPTIONS).map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={isReview}
                    onClick={() => setAnswer(i, option, "Cm")}
                    className={`grid h-12 w-12 place-items-center rounded-full border text-[15px] font-semibold transition-colors ${optionClass(
                      i,
                      option
                    )}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {photoBlock(i)}
            </div>
          );
        }

        // Open / typed answer (Co / Cd), PDF or structured.
        const correctAnswer = answers[i]?.answer || null;
        const userAnswer = selectedAnswers[i]?.answer || null;
        const isCorrect =
          isReview && correctAnswer && userAnswer
            ? norm(correctAnswer) === norm(userAnswer)
            : null;
        return (
          <div key={i} id={`q-${i}`} className="scroll-mt-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Stem def={def} i={i} label={LABELS[def.type] || "Sual"} />
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  {isCorrect === true && <span className="text-success">✓ Doğru</span>}
                  {isCorrect === false && (
                    <span className="text-danger">
                      ✕ Doğru: <MathText text={correctAnswer} />
                    </span>
                  )}
                  {/* Left blank: still reveal the correct answer (the badge marks it skipped). */}
                  {isReview && !answeredVal(userAnswer) && correctAnswer && (
                    <span className="text-success">
                      Doğru: <MathText text={correctAnswer} />
                    </span>
                  )}
                </p>
              </div>
              {markBtn(i)}
              {unansweredBadge(i)}
            </div>
            <textarea
              rows={def.type === "Cd" ? 6 : 4}
              readOnly={isReview}
              value={isReview ? userAnswer || "" : answers[i]?.answer || ""}
              onChange={(e) => setAnswer(i, e.target.value, def.type)}
              placeholder="Cavabını yaz..."
              className="w-full rounded-xl border border-line bg-surface p-3 text-[15px] text-text outline-none transition placeholder:text-muted/60 read-only:bg-surface2 focus:border-primary focus:ring-4 focus:ring-ring/25"
            />
            {explanationNote(def)}
            {photoBlock(i)}
          </div>
        );
      })}
    </fieldset>
  );
};

// Memoized: the exam runner re-renders every second (timer); the sheet only
// needs to re-render when answers/marked/handlers change.
export default memo(QuestionType);
