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

export default Math;
