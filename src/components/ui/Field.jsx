export const inputClass =
  "w-full h-11 rounded-xl border border-line bg-surface px-3.5 text-[15px] text-text placeholder:text-muted/60 outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/25 disabled:opacity-60 disabled:bg-surface2";

export const textareaClass =
  "w-full min-h-[120px] rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-muted/60 outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/25 resize-y";

export function Field({ label, htmlFor, error, hint, className = "", children }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-text">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export default Field;
