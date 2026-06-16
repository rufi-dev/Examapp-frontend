// A titled card that groups related form fields — keeps long forms scannable.
const FormSection = ({ title, description, children, className = "" }) => (
  <section
    className={`rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6 ${className}`}
  >
    {(title || description) && (
      <div className="mb-5">
        {title && <h2 className="font-display text-base font-bold text-text">{title}</h2>}
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
    )}
    {children}
  </section>
);

export default FormSection;
