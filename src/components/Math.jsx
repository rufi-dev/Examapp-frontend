import { useMemo } from "react";
import katex from "katex";

// Render a LaTeX formula with KaTeX. `throwOnError: false` makes a malformed
// formula render in red INSTEAD of crashing the page — critical inside a live
// exam where a bad formula must never break the runner. If KaTeX itself throws
// (it shouldn't with throwOnError off), we fall back to the raw text.
const Math = ({ children, latex, display = false, className = "" }) => {
  const tex = String(latex ?? children ?? "");
  const html = useMemo(() => {
    if (!tex.trim()) return null;
    try {
      return katex.renderToString(tex, {
        throwOnError: false,
        displayMode: display,
        output: "html",
      });
    } catch {
      return null;
    }
  }, [tex, display]);

  if (!tex.trim()) return null;
  if (html == null) {
    // KaTeX failed entirely — show the raw source so nothing is lost.
    return <span className={className}>{tex}</span>;
  }
  return (
    <span
      className={className}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

// Split a string into plain-text and math segments. Math is written INLINE with
// `$...$` (inline) or `$$...$$` (display) delimiters embedded in the text, so a
// formula can sit in the MIDDLE of a sentence (e.g. "3500-ün $\frac{5}{7}$
// hissəsini tapın."), not only appended at the end. A literal dollar sign is
// written as `\$`. Returns [{ math, display, value }] in document order.
export const parseMathSegments = (input) => {
  const str = String(input ?? "");
  const segments = [];
  let buf = "";
  let i = 0;
  const flush = () => {
    if (buf) segments.push({ math: false, value: buf });
    buf = "";
  };
  while (i < str.length) {
    const ch = str[i];
    // Escaped dollar -> literal "$".
    if (ch === "\\" && str[i + 1] === "$") {
      buf += "$";
      i += 2;
      continue;
    }
    if (ch === "$") {
      const display = str[i + 1] === "$";
      const delim = display ? "$$" : "$";
      const start = i + delim.length;
      const end = str.indexOf(delim, start);
      if (end === -1) {
        // No closing delimiter: treat the rest as literal text (lone "$").
        buf += str.slice(i);
        break;
      }
      const tex = str.slice(start, end);
      if (tex.trim()) {
        flush();
        segments.push({ math: true, display, value: tex });
      }
      i = end + delim.length;
      continue;
    }
    buf += ch;
    i += 1;
  }
  flush();
  return segments;
};

// True when a string contains at least one inline `$...$` math segment.
export const textHasMath = (input) =>
  parseMathSegments(input).some((s) => s.math);

// Render a string that may mix plain text and inline `$...$` math. Text with no
// math renders as a plain string; math segments render with KaTeX in place. Use
// this anywhere a question/choice/pair label is shown so formulas appear at
// their original position instead of being forced to the end.
export const MathText = ({ text, className = "" }) => {
  const str = String(text ?? "");
  const segments = useMemo(() => parseMathSegments(str), [str]);
  if (!str) return null;
  // `whitespace-pre-line` honours newlines authored in the text (so a question
  // written across multiple lines / with blank lines renders the same way),
  // while still collapsing ordinary runs of spaces and wrapping normally.
  if (!segments.some((s) => s.math)) {
    return <span className={`whitespace-pre-line ${className}`}>{str}</span>;
  }
  return (
    <span className={`whitespace-pre-line ${className}`}>
      {segments.map((s, k) =>
        s.math ? (
          <Math key={k} latex={s.value} display={s.display} />
        ) : (
          <span key={k}>{s.value}</span>
        )
      )}
    </span>
  );
};

export default Math;
