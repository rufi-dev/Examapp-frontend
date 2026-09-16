import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { FiCamera, FiImage, FiX, FiCheck, FiAlertTriangle, FiCpu, FiCheckCircle, FiSearch } from "react-icons/fi";
import Button from "../ui/Button";
import Spinner from "../Spinner";
import ZoomableImage from "../ZoomableImage";
import { normalizeImageBlob } from "../CameraCapture";
import { uploadImage } from "../../helper/cloudinary";

/*
 * Shared building blocks for paper-exam answer sheets, used by the teacher
 * grading workspace and the student self-upload page: answer shapes, the photo
 * capture grid (+ upload hook), the page viewer, the reading progress panel and
 * the per-type answer editors.
 */

export const MAX_PAGES = 6;
export const LETTERS = "abcdefghijklmnopqrstuvwxyz";
export const TYPE_LABEL = {
  Cm: "Qapalı",
  Co: "Açıq",
  Cd: "Yazılı həll",
  Cmu: "Uyğunluq",
  Cs: "Çoxseçimli",
  Cma: "Uyğunlaşdırma",
};

export const optionsOf = (q) =>
  (Array.isArray(q.options) && q.options.length ? q.options : ["a", "b", "c", "d", "e"]).map((o) =>
    String(o).toLowerCase()
  );
export const isMap = (v) => !!v && typeof v === "object" && !Array.isArray(v);
// Both matching types are filled in as a grid on the card (Cma is converted to the
// scorer's pair shape server-side), so the UI treats them alike.
export const isMatchType = (q) => q?.type === "Cmu" || q?.type === "Cma";
export const blankAnswer = (q) => (isMatchType(q) ? {} : "");
export const fromStored = (q, v) => (isMatchType(q) ? (isMap(v) ? v : {}) : v == null ? "" : String(v));

export const isBlank = (q, a) =>
  isMatchType(q)
    ? !isMap(a) || !Object.values(a).some((row) => Array.isArray(row) && row.length)
    : String(a ?? "").trim() === "";

// Spacing and decimal comma don't matter ("5, 2" = "5.2") — same rule as the server.
const compact = (v) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, "").replace(/,/g, ".");

// Teacher-only mirror of the server's per-question check, for the ✓/✗ marks while
// editing (needs the key). The score itself always comes from the server.
export function isRight(q, a) {
  if (isBlank(q, a)) return false;
  if (q.type === "Cma") {
    // Each left must have exactly one pick, and it must name the pair's right value.
    const pairs = Array.isArray(q.pairs) ? q.pairs : [];
    if (!pairs.length) return false;
    return pairs.every((p, k) => {
      const picks = Array.isArray(a[k]) ? a[k] : [];
      return picks.length === 1 && compact(pairs[picks[0]]?.right) === compact(p.right);
    });
  }
  if (q.type === "Cmu") {
    const rows = Array.isArray(q.key) ? q.key : [];
    if (!rows.length) return false;
    return rows.every((row, k) => {
      const want = (Array.isArray(row) ? row : []).map(Number).sort((x, y) => x - y);
      const got = (Array.isArray(a[k]) ? a[k] : []).map(Number).sort((x, y) => x - y);
      return want.length === got.length && want.every((v, j) => v === got[j]);
    });
  }
  if (q.type === "Cm") return compact(a) === compact(q.answer);
  // Handwriting spacing doesn't matter ("2 + x" = "2+x") — same rule as the server.
  const accepted = (Array.isArray(q.answers) && q.answers.length ? q.answers : [q.answer])
    .map(compact)
    .filter(Boolean);
  return accepted.includes(compact(a));
}
export const rowState = (q, a) => (isBlank(q, a) ? "blank" : isRight(q, a) ? "right" : "wrong");

// Same answer ignoring case/spacing (Cmu: same letters per number).
export function sameAnswer(q, a, b) {
  if (isMatchType(q)) {
    const canon = (m) =>
      JSON.stringify(
        Object.keys(isMap(m) ? m : {})
          .filter((k) => Array.isArray(m[k]) && m[k].length)
          .sort((x, y) => Number(x) - Number(y))
          .map((k) => [Number(k), [...m[k]].map(Number).sort((x, y) => x - y)])
      );
    return canon(a) === canon(b);
  }
  return compact(a) === compact(b);
}

export function answerLabel(q, a) {
  if (isBlank(q, a)) return "boş";
  if (isMatchType(q)) {
    return Object.keys(a)
      .filter((k) => Array.isArray(a[k]) && a[k].length)
      .sort((x, y) => Number(x) - Number(y))
      .map((k) => `${Number(k) + 1}: ${a[k].map((i) => LETTERS[i]).join(",")}`)
      .join(" · ");
  }
  return q.type === "Cm" ? String(a).toUpperCase() : String(a);
}

export function correctLabel(q) {
  if (q.type === "Cm") return String(q.answer || "—").toUpperCase();
  if (q.type === "Cma") {
    return (Array.isArray(q.pairs) ? q.pairs : []).map((p, k) => `${k + 1}: ${p.right ?? "—"}`).join(" · ");
  }
  if (q.type === "Cmu") {
    return (Array.isArray(q.key) ? q.key : [])
      .map((row, k) => `${k + 1}: ${(Array.isArray(row) ? row : []).map((i) => LETTERS[i]).join(",") || "—"}`)
      .join(" · ");
  }
  const acc = (Array.isArray(q.answers) && q.answers.length ? q.answers : [q.answer]).filter(Boolean);
  return acc.length ? acc.join(" / ") : "—";
}

export const initials = (name = "") =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0] || "")
    .join("")
    .toUpperCase() || "?";

export const Avatar = ({ s, size = "h-9 w-9" }) =>
  s?.photo ? (
    <img src={s.photo} alt="" className={`${size} shrink-0 rounded-full border border-line object-cover`} />
  ) : (
    <span className={`${size} grid shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-bold text-primary`}>
      {initials(s?.name)}
    </span>
  );

// Searchable student picker (name or e-mail), keyboard friendly. Shows at most
// 50 matches; `gradedIds` marks students who already have a result.
const PICKER_LIMIT = 50;
export const StudentPicker = ({ students, onPick, gradedIds, placeholder = "Şagird axtar…" }) => {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const boxRef = useRef(null);
  useEffect(() => {
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const list = useMemo(() => {
    const norm = (s) => String(s || "").toLocaleLowerCase("az");
    const t = norm(q.trim());
    const hits = t ? students.filter((s) => norm(s.name).includes(t) || norm(s.email).includes(t)) : students;
    return hits.slice(0, PICKER_LIMIT);
  }, [q, students]);
  const pick = (s) => {
    onPick(s);
    setQ("");
    setOpen(false);
  };
  return (
    <div ref={boxRef} className="relative w-full sm:w-80">
      <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setHi(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHi((h) => Math.min(h + 1, list.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && open && list[hi]) {
            e.preventDefault();
            pick(list[hi]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        type="search"
        role="combobox"
        aria-expanded={open}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-text outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-ring/25"
      />
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-30 mt-1.5 max-h-72 w-full overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-lift"
        >
          {list.map((s, i) => (
            <li key={s._id}>
              <button
                type="button"
                role="option"
                aria-selected={i === hi}
                onMouseEnter={() => setHi(i)}
                onClick={() => pick(s)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                  i === hi ? "bg-primary/10" : "hover:bg-surface2"
                }`}
              >
                <Avatar s={s} size="h-7 w-7" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text">{s.name || "—"}</span>
                  {s.email && <span className="block truncate text-[11px] text-muted">{s.email}</span>}
                </span>
                {gradedIds?.has(String(s._id)) && <FiCheck className="shrink-0 text-success" title="Yoxlanılıb" />}
              </button>
            </li>
          ))}
          {!list.length && <li className="px-3 py-6 text-center text-sm text-muted">Şagird tapılmadı</li>}
          {!q.trim() && students.length > PICKER_LIMIT && (
            <li className="px-3 py-2 text-center text-[11px] text-muted">
              {students.length} şagird — tapmaq üçün adı yazın
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export const Stepper = ({ steps, current }) => {
  const idx = steps.findIndex((s) => s.id === current);
  return (
    <ol className="flex items-center gap-1.5 sm:gap-2">
      {steps.map((s, i) => {
        const done = i < idx;
        const now = i === idx;
        return (
          <li key={s.id} className="flex items-center gap-1.5 sm:gap-2">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors ${
                done ? "bg-success/15 text-success" : now ? "bg-primary text-primary-fg" : "bg-surface2 text-muted"
              }`}
            >
              {done ? <FiCheck /> : i + 1}
            </span>
            <span className={`hidden text-sm sm:inline ${now ? "font-bold text-text" : "text-muted"}`}>{s.label}</span>
            {i < steps.length - 1 && <span className="h-px w-4 bg-line sm:w-8" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
};

const qList = (idx) => idx.map((i) => i + 1).join(", ");

// Tag on an answer the AI fallback read (everything else was read by the platform).
export const SourceTag = ({ source }) =>
  source === "ai" ? (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-accent2/12 px-1.5 py-0.5 text-[10px] font-bold text-accent2"
      title="Platforma dəqiq oxuya bilmədi — AI ilə yoxlanılıb"
    >
      <FiCpu /> AI
    </span>
  ) : null;

// What is happening while a sheet is read: the platform first (seconds), then —
// only for the answers it couldn't read — the AI check, announced before it runs.
// Step timing is a paced estimate; the elapsed counter is real.
const PLATFORM_STEPS = ["Şəkil hazırlanır", "Qapalı suallar: işarələr ölçülür", "Açıq suallar və ad oxunur"];
const AI_STEPS = ["Platforma oxudu", "AI çətin cavabları yoxlayır", "Cavablar birləşdirilir"];
export const ReadingPanel = ({ startedAt, photos, stage = "platform", pending = [], nameOnly = false }) => {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    setSecs(0);
    const t = setInterval(() => setSecs(Math.round((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  const ai = stage === "ai";
  const steps = ai ? AI_STEPS : PLATFORM_STEPS;
  const step = ai ? (secs < 25 ? 1 : 2) : secs < 2 ? 0 : secs < 5 ? 1 : 2;
  return (
    <div className="mx-auto max-w-md py-8">
      <div className="mb-6 flex justify-center -space-x-6">
        {photos.slice(0, 3).map((p, i) => (
          <img
            key={p.id}
            src={p.url || p.preview}
            alt=""
            className="h-24 w-[4.5rem] rounded-xl border-2 border-surface object-cover shadow-soft"
            style={{ transform: `rotate(${(i - 1) * 6}deg)` }}
          />
        ))}
      </div>
      {ai && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/[0.08] p-3.5 text-sm">
          <FiCpu className="mt-0.5 shrink-0 text-warning" />
          <p className="leading-relaxed text-text">
            {nameOnly ? (
              "Platforma vərəqdəki adı dəqiq oxuya bilmədi."
            ) : (
              <>
                Platforma <b>{pending.length}</b> cavabı dəqiq oxuya bilmədi (sual {qList(pending)}).
              </>
            )}{" "}
            {nameOnly ? "Ad" : "Onlar"} indi <b>AI ilə yoxlanılır</b>.
          </p>
        </div>
      )}
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-surface2">
        <div className={`h-full w-full animate-pulse rounded-full ${ai ? "bg-accent2/70" : "bg-primary/70"}`} />
      </div>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <p className="font-display text-lg font-bold text-text">{ai ? "AI yoxlayır…" : "Platforma vərəqi oxuyur…"}</p>
        <span className="rounded-lg bg-surface2 px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-muted">
          {String(Math.floor(secs / 60)).padStart(2, "0")}:{String(secs % 60).padStart(2, "0")}
        </span>
      </div>
      <ol className="space-y-2.5">
        {steps.map((label, i) => (
          <li key={label} className="flex items-center gap-2.5 text-sm">
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                i < step ? "bg-success/15 text-success" : i === step ? "bg-primary text-primary-fg" : "bg-surface2 text-muted"
              }`}
            >
              {i < step ? <FiCheck /> : i + 1}
            </span>
            <span className={i === step ? "font-semibold text-text" : "text-muted"}>{label}</span>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-center text-xs text-muted">
        {ai ? "Adətən 20–60 saniyə çəkir. Səhifəni bağlamayın." : "Bir neçə saniyə çəkir."}
      </p>
    </div>
  );
};

// After a read: how the sheet was read — by the platform alone, with AI for some
// answers, or with answers still unread (AI failed / limit reached).
// info: { platform: { bubbles, text }, aiUsed: [i], pendingAi: [i], aiError, nameByAi }
export const ReadSummary = ({ info, total, onRetryAi, retrying }) => {
  if (!info) return null;
  const { platform = {}, aiUsed = [], pendingAi = [], aiError = "", nameByAi = false } = info;
  const fromPlatform = Math.max(0, total - aiUsed.length - pendingAi.length);
  const hint =
    platform.bubbles === "failed"
      ? "Qapalı suallarda işarələr tapılmadı — vərəqin hamısı kadrda və düz olsun."
      : platform.text === "off" || platform.text === "failed"
        ? "Açıq suallar üçün mətn tanıma hazırda əlçatan deyil."
        : "";
  let look;
  if (pendingAi.length) {
    look = {
      box: "border-warning/40 bg-warning/[0.08]",
      badge: "bg-warning/15 text-warning",
      Icon: FiAlertTriangle,
      title: `Platforma ${pendingAi.length} cavabı dəqiq oxuya bilmədi (sual ${qList(pendingAi)})`,
      body: `${aiError ? `${aiError} ` : ""}Bu cavabları vərəqlə müqayisə edib əl ilə doldurun${
        onRetryAi ? " və ya istəsəniz AI ilə yoxlatın" : ""
      }.`,
    };
  } else if (aiUsed.length || nameByAi) {
    look = {
      box: "border-accent2/35 bg-accent2/[0.06]",
      badge: "bg-accent2/15 text-accent2",
      Icon: FiCpu,
      title: `Platforma ${fromPlatform}/${total} cavabı oxudu${aiUsed.length ? ` · ${aiUsed.length} cavab AI ilə yoxlandı` : ""}`,
      body: [aiUsed.length ? `AI ilə yoxlanan suallar: ${qList(aiUsed)}.` : "", nameByAi ? "Vərəqdəki ad AI ilə oxundu." : ""]
        .filter(Boolean)
        .join(" "),
    };
  } else {
    look = {
      box: "border-success/30 bg-success/[0.06]",
      badge: "bg-success/15 text-success",
      Icon: FiCheckCircle,
      title: "Platforma tərəfindən oxundu · AI istifadə olunmayıb",
      body: "Bütün cavablar platformanın öz tanıma sistemi ilə oxundu.",
    };
  }
  const { Icon } = look;
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${look.box}`}>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${look.badge}`}>
        <Icon />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-text">{look.title}</p>
        {(look.body || hint) && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{[look.body, hint].filter(Boolean).join(" ")}</p>
        )}
      </div>
      {pendingAi.length > 0 && onRetryAi && (
        <Button variant="secondary" size="sm" onClick={onRetryAi} disabled={retrying}>
          {retrying ? <Spinner size={14} /> : <FiCpu />} {retrying ? "AI yoxlayır…" : `AI ilə yoxla (${pendingAi.length})`}
        </Button>
      )}
    </div>
  );
};

// Closed question: letter bubbles. `tone` colours the selected bubble
// ("right" / "wrong" for the teacher; neutral for students).
export const ChoiceEditor = ({ q, value, onChange, tone, disabled }) => (
  <div className="flex flex-wrap gap-1.5">
    {optionsOf(q).map((o) => {
      const on = String(value ?? "").trim().toLowerCase() === o;
      const selectedCls =
        tone === "right"
          ? "bg-success text-white shadow-soft"
          : tone === "wrong"
            ? "bg-danger text-white shadow-soft"
            : "bg-primary text-primary-fg shadow-soft";
      return (
        <button
          key={o}
          type="button"
          aria-pressed={on}
          disabled={disabled}
          onClick={() => onChange(on ? "" : o)}
          className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold uppercase transition-colors disabled:cursor-not-allowed ${
            on ? selectedCls : "border border-line bg-surface text-muted hover:border-primary/50 hover:text-text"
          }`}
        >
          {o}
        </button>
      );
    })}
  </div>
);

export const MatchEditor = ({ q, value, onChange, disabled }) => {
  const n = Number(q.leftCount) || 0;
  const m = Number(q.rightCount) || 0;
  const map = isMap(value) ? value : {};
  const toggle = (k, j) => {
    const row = new Set(Array.isArray(map[k]) ? map[k] : []);
    if (row.has(j)) row.delete(j);
    else row.add(j);
    const next = { ...map };
    const arr = [...row].sort((a, b) => a - b);
    if (arr.length) next[k] = arr;
    else delete next[k];
    onChange(next);
  };
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1">
        <thead>
          <tr>
            <th aria-hidden />
            {Array.from({ length: m }, (_, j) => (
              <th key={j} className="w-8 text-center text-xs font-bold uppercase text-muted">
                {LETTERS[j]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: n }, (_, k) => (
            <tr key={k}>
              <td className="pr-1 text-right text-xs font-bold tabular-nums text-muted">{k + 1}</td>
              {Array.from({ length: m }, (_, j) => {
                const on = Array.isArray(map[k]) && map[k].includes(j);
                return (
                  <td key={j}>
                    <button
                      type="button"
                      aria-pressed={on}
                      aria-label={`${k + 1}${LETTERS[j]}`}
                      disabled={disabled}
                      onClick={() => toggle(k, j)}
                      className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-bold transition-colors ${
                        on ? "bg-primary text-primary-fg" : "border border-line bg-surface text-muted hover:border-primary/50"
                      }`}
                    >
                      {on ? <FiCheck /> : null}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const AnswerEditor = ({ q, value, onChange, tone, disabled }) =>
  q.type === "Cm" ? (
    <ChoiceEditor q={q} value={value} onChange={onChange} tone={tone} disabled={disabled} />
  ) : isMatchType(q) ? (
    <MatchEditor q={q} value={value} onChange={onChange} disabled={disabled} />
  ) : (
    <input
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="Cavab"
      className="h-10 w-full max-w-sm rounded-xl border border-line bg-surface px-3 text-sm text-text outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-ring/25"
    />
  );

// Sheet photos: local previews while uploading to Cloudinary, retry on failure,
// bounded page count. `onDirty` fires when the teacher/student adds or removes a page.
export function useSheetPhotos({ onDirty } = {}) {
  const [photos, setPhotos] = useState([]);
  const pagesRef = useRef(0);
  const blobUrls = useRef(new Set());
  const dirtyRef = useRef(onDirty);
  dirtyRef.current = onDirty;

  useEffect(() => {
    pagesRef.current = photos.length;
  }, [photos.length]);

  useEffect(() => {
    const urls = blobUrls.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const release = useCallback((p) => {
    if (p?.preview?.startsWith("blob:")) {
      URL.revokeObjectURL(p.preview);
      blobUrls.current.delete(p.preview);
    }
  }, []);

  const upload = useCallback(async (id, blob) => {
    try {
      const file = await normalizeImageBlob(blob, { prefix: "sheet", max: 2400 });
      const url = await uploadImage(file);
      setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, url, status: "done", blob: undefined } : p)));
    } catch (e) {
      setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, status: "error" } : p)));
      toast.error(e?.message || "Şəkil yüklənmədi");
    }
  }, []);

  const add = useCallback(
    (blob) => {
      if (!blob) return;
      if (pagesRef.current >= MAX_PAGES) {
        toast.info(`Bir vərəq üçün ən çox ${MAX_PAGES} şəkil əlavə etmək olar`);
        return;
      }
      pagesRef.current += 1;
      const id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const preview = URL.createObjectURL(blob);
      blobUrls.current.add(preview);
      setPhotos((prev) => [...prev, { id, preview, url: "", status: "uploading", blob }]);
      dirtyRef.current?.();
      upload(id, blob);
    },
    [upload]
  );

  const retry = useCallback(
    (p) => {
      if (!p.blob) return;
      setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: "uploading" } : x)));
      upload(p.id, p.blob);
    },
    [upload]
  );

  const remove = useCallback(
    (id) => {
      setPhotos((prev) => {
        release(prev.find((x) => x.id === id));
        return prev.filter((x) => x.id !== id);
      });
      dirtyRef.current?.();
    },
    [release]
  );

  // Replace every page (e.g. with an already-saved sheet's URLs, or [] to clear).
  const reset = useCallback(
    (urls = []) => {
      setPhotos((prev) => {
        prev.forEach(release);
        return urls.map((url, i) => ({ id: `saved-${i}-${url}`, url, preview: url, status: "done" }));
      });
      pagesRef.current = urls.length;
    },
    [release]
  );

  const done = photos.filter((p) => p.status === "done" && p.url);
  return { photos, done, uploading: photos.some((p) => p.status === "uploading"), add, retry, remove, reset };
}

// Capture step: an inviting empty state, then the page grid with an "add page" tile.
// `children` renders under the grid (the step's action buttons).
export const SheetCapture = ({ photos, onCamera, onGallery, onRemove, onRetry, onDropFiles, title, hint, note, children }) =>
  photos.length === 0 ? (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDropFiles?.(Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith("image/")));
      }}
      className="rounded-3xl border-2 border-dashed border-line bg-surface2/40 px-6 py-12 text-center"
    >
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-fg shadow-soft">
        <FiCamera className="text-2xl" />
      </span>
      <h3 className="mt-5 font-display text-xl font-extrabold text-text">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{hint}</p>
      <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
        <Button size="lg" onClick={onCamera}>
          <FiCamera /> Kamera ilə çək
        </Button>
        <Button size="lg" variant="secondary" onClick={onGallery}>
          <FiImage /> Qalereyadan seç
        </Button>
      </div>
      {note && <p className="mt-5 text-xs text-muted">{note}</p>}
    </div>
  ) : (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, idx) => (
          <div key={p.id} className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-surface2">
            <img src={p.preview || p.url} alt={`Səhifə ${idx + 1}`} className="h-full w-full object-cover" />
            <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">
              {idx + 1}
            </span>
            {p.status === "uploading" && (
              <div className="absolute inset-0 grid place-items-center bg-black/35">
                <Spinner size={26} className="text-white" />
              </div>
            )}
            {p.status === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 p-2 text-center text-xs font-semibold text-white">
                <FiAlertTriangle className="text-lg" /> Yüklənmədi
                {p.blob && (
                  <button type="button" onClick={() => onRetry(p)} className="rounded-lg bg-white/15 px-2.5 py-1 hover:bg-white/25">
                    Yenidən
                  </button>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => onRemove(p.id)}
              aria-label="Şəkli sil"
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-danger"
            >
              <FiX />
            </button>
          </div>
        ))}
        {photos.length < MAX_PAGES && (
          <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line p-3">
            <button
              type="button"
              onClick={onCamera}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
            >
              <FiCamera /> Çək
            </button>
            <button
              type="button"
              onClick={onGallery}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-surface2 hover:text-text"
            >
              <FiImage /> Qalereya
            </button>
            <span className="text-[11px] text-muted">Səhifə əlavə et</span>
          </div>
        )}
      </div>
      {children}
    </div>
  );

// Page tabs + a zoomable view of the selected sheet photo.
export const SheetViewer = ({ photos }) => {
  const [page, setPage] = useState(0);
  if (!photos.length) return null;
  const current = photos[Math.min(page, photos.length - 1)];
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface2/40">
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-line p-2">
        {photos.map((p, idx) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPage(idx)}
            className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              idx === Math.min(page, photos.length - 1) ? "bg-primary text-primary-fg" : "text-muted hover:bg-surface2"
            }`}
          >
            Səhifə {idx + 1}
          </button>
        ))}
        <span className="ml-auto hidden shrink-0 pr-1 text-[11px] text-muted sm:inline">Böyütmək üçün klikləyin</span>
      </div>
      <div className="grid place-items-center p-2">
        <ZoomableImage
          src={current.url || current.preview}
          alt="Cavab vərəqi"
          className="max-h-[42vh] w-full rounded-xl object-contain lg:max-h-[68vh]"
        />
      </div>
    </div>
  );
};
