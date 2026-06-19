import { useState } from "react";
import Math from "./Math";

const norm = (v) => String(v ?? "").trim();
const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);

// Render an item's content: text + optional LaTeX + optional image.
const Content = ({ item }) => (
  <span className="inline-flex min-w-0 items-center gap-1.5">
    {item.text ? <span className="break-words">{item.text}</span> : null}
    {norm(item.latex) ? <Math latex={item.latex} /> : null}
    {item.image && <img src={item.image} alt="" className="max-h-9 rounded object-contain" />}
  </span>
);

// Matching question (student runner): drag a right-column item onto a left item,
// OR tap a right item then tap a left slot (touch-friendly). 1:1 — a right item
// lives in at most one slot; unmatched items stay in the pool. The selection is a
// { leftIndex: rightText } map, matching the server's scoring.
const MatchingQuestion = ({ lefts = [], rights = [], value, onChange, disabled = false }) => {
  const map = isMap(value) ? value : {};
  const [picked, setPicked] = useState(null); // right text "in hand" (tap mode)
  const [dragText, setDragText] = useState(null); // right text being dragged

  const usedTexts = new Set(Object.values(map));
  const pool = rights.filter((r) => !usedTexts.has(r.text));

  const assign = (li, rightText) => {
    if (disabled || !norm(rightText)) return;
    const next = { ...map };
    // A right item can only be in one slot: remove it from any other left first.
    Object.keys(next).forEach((k) => {
      if (next[k] === rightText) delete next[k];
    });
    next[li] = rightText;
    onChange(next);
    setPicked(null);
  };
  const unassign = (li) => {
    if (disabled) return;
    const next = { ...map };
    delete next[li];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {!disabled && (
        <p className="text-xs text-muted">
          Sağdakı variantı sürüşdürüb sol tərəfə at — və ya variantı, sonra boş yeri toxun.
        </p>
      )}

      {/* Left items, each with a drop slot for its match. */}
      <div className="space-y-2">
        {lefts.map((lf, li) => {
          const assigned = map[li];
          const slotActive = !disabled && picked && !assigned;
          return (
            <div
              key={li}
              className="flex flex-col gap-2 rounded-xl border border-line bg-surface2/40 p-2.5 sm:flex-row sm:items-center sm:gap-3"
            >
              <div className="min-w-0 flex-1 text-[15px] text-text">
                <span className="text-muted">{li + 1}.</span> <Content item={lf} />
              </div>
              <div
                onClick={() => {
                  if (disabled) return;
                  if (assigned) unassign(li);
                  else if (picked) assign(li, picked);
                }}
                onDragOver={(e) => {
                  if (!disabled) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragText) assign(li, dragText);
                  setDragText(null);
                }}
                className={`flex min-h-[42px] items-center justify-between gap-2 rounded-lg border-2 border-dashed px-3 py-1.5 text-sm transition-colors sm:w-60 ${
                  disabled ? "cursor-default" : "cursor-pointer"
                } ${
                  assigned
                    ? "border-primary bg-primary/10 text-text"
                    : slotActive
                    ? "border-primary/70 bg-primary/5 text-primary"
                    : "border-line text-muted"
                }`}
              >
                {assigned ? (
                  <Content item={{ text: assigned }} />
                ) : (
                  <span>{slotActive ? "Buraya toxun" : "Buraya at / seç"}</span>
                )}
                {assigned && !disabled && <span className="shrink-0 text-muted">×</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pool of unmatched right items. */}
      {!disabled && (
        <div className="rounded-xl border border-dashed border-line bg-surface2/30 p-2.5">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Variantlar
          </p>
          <div className="flex flex-wrap gap-2">
            {pool.length === 0 ? (
              <span className="text-sm text-muted">Hamısı yerləşdirilib ✓</span>
            ) : (
              pool.map((r, ri) => (
                <button
                  key={ri}
                  type="button"
                  draggable
                  onDragStart={() => setDragText(r.text)}
                  onDragEnd={() => setDragText(null)}
                  onClick={() => setPicked((p) => (p === r.text ? null : r.text))}
                  className={`cursor-grab rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors active:cursor-grabbing ${
                    picked === r.text
                      ? "border-primary bg-primary text-primary-fg"
                      : "border-line bg-surface text-text hover:border-primary/40"
                  }`}
                >
                  <Content item={r} />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchingQuestion;
