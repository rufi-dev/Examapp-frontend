// A section card whose body is revealed by a toggle (e.g. password, max tries).
const ToggleSection = ({ icon: Icon, title, description, enabled, onToggle, children }) => (
  <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6">
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      className="flex w-full items-center justify-between gap-4 text-left"
    >
      <span className="flex items-center gap-3">
        {Icon && (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
            <Icon className="text-[18px]" />
          </span>
        )}
        <span>
          <span className="block font-display text-base font-bold text-text">{title}</span>
          {description && <span className="block text-sm text-muted">{description}</span>}
        </span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          enabled ? "bg-primary" : "border border-line bg-surface2"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ease-out-quint ${
            enabled ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
    {enabled && <div className="mt-5">{children}</div>}
  </section>
);

export default ToggleSection;
