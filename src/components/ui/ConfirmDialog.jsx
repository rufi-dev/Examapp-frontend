import { useEffect } from "react";
import Button from "./Button";
import Spinner from "../Spinner";

// Lightweight, on-brand confirmation modal.
const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  icon,
  children,
  confirmLabel = "Davam et",
  cancelLabel = "Geri",
  tone = "primary", // "primary" | "danger"
  loading = false,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !loading && onClose?.()}
      />
      <div className="relative w-full max-w-md animate-scale-in rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-7">
        {icon && (
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary">
            {icon}
          </div>
        )}
        <h2 className="font-display text-xl font-bold text-text">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Spinner /> : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
