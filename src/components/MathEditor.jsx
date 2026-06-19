import { useEffect, useRef, useState } from "react";
import { MathfieldElement } from "mathlive";
import Math, { MathText, textHasMath } from "./Math";
import { FiX } from "react-icons/fi";

// MathLive renders the editor glyphs from its own fonts. The builder is an
// online, admin-only page, so pulling the version-pinned fonts from a CDN is
// fine and avoids bundler asset-path issues. Display in the runner/review uses
// KaTeX (Math.jsx), which ships its own fonts — so students never load these.
if (typeof window !== "undefined" && MathfieldElement) {
  try {
    MathfieldElement.fontsDirectory = "https://cdn.jsdelivr.net/npm/mathlive@0.110.0/fonts";
    MathfieldElement.soundsDirectory = null;
  } catch {
    /* ignore */
  }
}

// Palette of one-click inserts. `#?` becomes a tab-able placeholder box, so e.g.
// the integral drops empty upper/lower/body/variable slots the teacher fills in.
const GROUPS = [
  {
    label: "Əsas",
    items: [
      { t: "x²", tex: "^{2}" },
      { t: "xⁿ", tex: "^{#?}" },
      { t: "x□", tex: "_{#?}" },
      { t: "a∕b", tex: "\\frac{#?}{#?}" },
      { t: "√", tex: "\\sqrt{#?}" },
      { t: "ⁿ√", tex: "\\sqrt[#?]{#?}" },
      { t: "( )", tex: "\\left(#?\\right)" },
      { t: "|x|", tex: "\\left|#?\\right|" },
    ],
  },
  {
    label: "Əməllər",
    items: [
      { t: "×", tex: "\\times" },
      { t: "÷", tex: "\\div" },
      { t: "±", tex: "\\pm" },
      { t: "·", tex: "\\cdot" },
      { t: "≤", tex: "\\le" },
      { t: "≥", tex: "\\ge" },
      { t: "≠", tex: "\\ne" },
      { t: "≈", tex: "\\approx" },
      { t: "∞", tex: "\\infty" },
      { t: "→", tex: "\\to" },
      { t: "°", tex: "^{\\circ}" },
      { t: "∠", tex: "\\angle " },
    ],
  },
  {
    label: "Analiz",
    items: [
      { t: "∫", tex: "\\int_{#?}^{#?}#?\\,d#?" },
      { t: "∑", tex: "\\sum_{#?}^{#?}#?" },
      { t: "∏", tex: "\\prod_{#?}^{#?}#?" },
      { t: "lim", tex: "\\lim_{#?\\to #?}#?" },
      { t: "d/dx", tex: "\\frac{d}{d#?}#?" },
      { t: "∂", tex: "\\partial " },
    ],
  },
  {
    label: "Yunan",
    items: [
      { t: "π", tex: "\\pi " },
      { t: "θ", tex: "\\theta " },
      { t: "α", tex: "\\alpha " },
      { t: "β", tex: "\\beta " },
      { t: "γ", tex: "\\gamma " },
      { t: "Δ", tex: "\\Delta " },
      { t: "λ", tex: "\\lambda " },
      { t: "μ", tex: "\\mu " },
      { t: "Ω", tex: "\\Omega " },
    ],
  },
  {
    label: "Funksiya",
    items: [
      { t: "sin", tex: "\\sin" },
      { t: "cos", tex: "\\cos" },
      { t: "tan", tex: "\\tan" },
      { t: "log", tex: "\\log" },
      { t: "ln", tex: "\\ln" },
      { t: "logₐ", tex: "\\log_{#?}" },
    ],
  },
  {
    label: "Həndəsə",
    items: [
      { t: "∠", tex: "\\angle " },
      { t: "△", tex: "\\triangle " },
      { t: "∥", tex: "\\parallel " },
      { t: "⊥", tex: "\\perp " },
      { t: "≅", tex: "\\cong " },
      { t: "∼", tex: "\\sim " },
      { t: "°", tex: "^{\\circ}" },
      { t: "v⃗", tex: "\\vec{#?}" },
    ],
  },
  {
    label: "Çoxluq",
    items: [
      { t: "∈", tex: "\\in " },
      { t: "∉", tex: "\\notin " },
      { t: "⊂", tex: "\\subset " },
      { t: "⊆", tex: "\\subseteq " },
      { t: "∪", tex: "\\cup " },
      { t: "∩", tex: "\\cap " },
      { t: "∅", tex: "\\emptyset " },
      { t: "ℝ", tex: "\\mathbb{R}" },
      { t: "ℤ", tex: "\\mathbb{Z}" },
      { t: "ℕ", tex: "\\mathbb{N}" },
      { t: "ℚ", tex: "\\mathbb{Q}" },
    ],
  },
  {
    label: "Matris",
    items: [
      { t: "( )", tex: "\\begin{pmatrix}#?&#?\\\\#?&#?\\end{pmatrix}" },
      { t: "[ ]", tex: "\\begin{bmatrix}#?&#?\\\\#?&#?\\end{bmatrix}" },
      { t: "⟨ ⟩", tex: "\\langle #?,#?\\rangle" },
      { t: "{ ", tex: "\\begin{cases}#?\\\\#?\\end{cases}" },
    ],
  },
  {
    label: "Say",
    items: [
      { t: "n!", tex: "#?!" },
      { t: "ⁿCᵣ", tex: "\\binom{#?}{#?}" },
      { t: "a<b<c", tex: "#?<#?<#?" },
      { t: "%", tex: "\\%" },
      { t: "≡", tex: "\\equiv " },
      { t: "∝", tex: "\\propto " },
    ],
  },
];

const RECENTS_KEY = "mathRecents";
const readRecents = () => {
  try {
    const a = JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
    return Array.isArray(a) ? a.slice(0, 12) : [];
  } catch {
    return [];
  }
};

const MathEditor = ({ value, onChange, onClose }) => {
  const ref = useRef(null);
  const [recents, setRecents] = useState(readRecents);

  const remember = (item) => {
    setRecents((prev) => {
      const next = [item, ...prev.filter((x) => x.tex !== item.tex)].slice(0, 12);
      try {
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    const mf = ref.current;
    if (!mf) return;
    const init = () => {
      mf.value = value || "";
    };
    if (typeof mf.getValue === "function") init();
    else if (window.customElements) window.customElements.whenDefined("math-field").then(init);
    const handler = () => onChange(mf.value);
    mf.addEventListener("input", handler);
    const focusT = setTimeout(() => mf.focus?.(), 30);
    return () => {
      clearTimeout(focusT);
      mf.removeEventListener("input", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const insert = (item) => {
    const mf = ref.current;
    if (!mf || typeof mf.insert !== "function") return;
    mf.focus();
    mf.insert(item.tex, { focus: true, selectionMode: "placeholder" });
    onChange(mf.value);
    remember(item);
  };

  const showKeyboard = () => {
    try {
      ref.current?.focus();
      window.mathVirtualKeyboard?.show();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="w-full rounded-xl border border-primary/40 bg-surface p-2.5 shadow-soft">
      <div className="scrollbar-thin mb-2 max-h-44 space-y-1.5 overflow-y-auto pr-1">
        {recents.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="w-[58px] shrink-0 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Son
            </span>
            {recents.map((b, k) => (
              <button
                key={`r${k}`}
                type="button"
                onClick={() => insert(b)}
                className="min-w-[28px] rounded-md border border-primary/30 bg-primary/8 px-2 py-1 text-sm text-text transition-colors hover:border-primary hover:text-primary"
              >
                {b.t}
              </button>
            ))}
          </div>
        )}
        {GROUPS.map((g) => (
          <div key={g.label} className="flex flex-wrap items-center gap-1">
            <span className="w-[58px] shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {g.label}
            </span>
            {g.items.map((b) => (
              <button
                key={b.t}
                type="button"
                onClick={() => insert(b)}
                className="min-w-[28px] rounded-md border border-line bg-surface2/50 px-2 py-1 text-sm text-text transition-colors hover:border-primary hover:text-primary"
              >
                {b.t}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-line bg-surface px-2 py-1.5">
        {/* eslint-disable-next-line react/no-unknown-property */}
        <math-field ref={ref} style={{ width: "100%", fontSize: "20px" }} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onChange("");
              if (ref.current) ref.current.value = "";
            }}
            className="text-xs font-semibold text-muted transition-colors hover:text-danger"
          >
            Təmizlə
          </button>
          <button
            type="button"
            onClick={showKeyboard}
            className="text-xs font-semibold text-muted transition-colors hover:text-primary"
          >
            ⌨ Klaviatura
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
        >
          Bitdi
        </button>
      </div>
    </div>
  );
};

// A text field (input or textarea) that supports INLINE math: an "ƒx" button
// opens the visual editor, and on "Bitdi" the composed formula is inserted as
// `$...$` AT THE CURSOR — so a formula can sit in the middle of a sentence, not
// only at the end. A live preview underneath renders the text with its math in
// place. Used for question stems, choices, matching sides and explanations.
export const MathTextField = ({
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 2,
  inputClassName = "",
  enableMath = true,
}) => {
  const ref = useRef(null);
  const caret = useRef(null); // last known selection in the text field
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(""); // formula being composed

  const remember = () => {
    const el = ref.current;
    if (el && typeof el.selectionStart === "number") {
      caret.current = { s: el.selectionStart, e: el.selectionEnd };
    }
  };

  const insert = (tex) => {
    const clean = String(tex || "").trim();
    if (!clean) return;
    const t = String(value || "");
    const sel = caret.current || { s: t.length, e: t.length };
    const snippet = `$${clean}$`;
    const next = t.slice(0, sel.s) + snippet + t.slice(sel.e);
    onChange(next);
    const pos = sel.s + snippet.length;
    caret.current = { s: pos, e: pos };
    // Restore focus + caret after the controlled value updates.
    requestAnimationFrame(() => {
      const el = ref.current;
      if (el) {
        el.focus();
        try {
          el.setSelectionRange(pos, pos);
        } catch {
          /* ignore */
        }
      }
    });
  };

  const Field = multiline ? "textarea" : "input";
  const showPreview = textHasMath(value);

  return (
    <div>
      <div className="flex items-start gap-1.5">
        <Field
          ref={ref}
          value={value || ""}
          rows={multiline ? rows : undefined}
          onChange={(e) => onChange(e.target.value)}
          onSelect={remember}
          onKeyUp={remember}
          onClick={remember}
          onBlur={remember}
          placeholder={placeholder}
          className={`min-w-0 flex-1 ${inputClassName}`}
        />
        {enableMath && (
          <button
            type="button"
            // mousedown (not click) so the textarea keeps its selection when we
            // capture the caret before focus moves to this button.
            onMouseDown={(e) => {
              e.preventDefault();
              remember();
            }}
            onClick={() => {
              setDraft("");
              setOpen((o) => !o);
            }}
            title="Düstur əlavə et (kursor olduğu yerə)"
            className={`shrink-0 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
              open
                ? "border-primary bg-primary/10 text-primary"
                : "border-dashed border-line text-muted hover:border-primary hover:text-primary"
            }`}
          >
            <span className="font-serif italic">ƒx</span>
          </button>
        )}
      </div>

      {showPreview && (
        <div className="mt-1 rounded-lg border border-line bg-surface2/40 px-2.5 py-1.5 text-sm text-text">
          <MathText text={value} />
        </div>
      )}

      {open && (
        <div className="mt-2">
          <MathEditor
            value={draft}
            onChange={setDraft}
            onClose={() => {
              insert(draft);
              setDraft("");
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

// Per-field formula control: an "fx Düstur" button when empty, the rendered
// formula (click to edit, × to remove) when set, or the visual editor when open.
export const FormulaField = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  if (open) return <MathEditor value={value} onChange={onChange} onClose={() => setOpen(false)} />;
  if (value) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface2/50 px-2.5 py-1.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Düsturu redaktə et"
          className="text-text"
        >
          <Math latex={value} />
        </button>
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Düsturu sil"
          className="grid h-5 w-5 place-items-center rounded-full text-muted transition-colors hover:bg-danger/12 hover:text-danger"
        >
          <FiX className="text-xs" />
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
    >
      <span className="font-serif italic">ƒx</span> Düstur
    </button>
  );
};

export default FormulaField;
