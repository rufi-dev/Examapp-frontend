import { FiLock } from "react-icons/fi";
import { Field, inputClass } from "./Field";

// Optional exam access password: a toggle that reveals a password input.
const PasswordField = ({ enabled, value, onToggle, onChange }) => (
  <div className="space-y-3 rounded-2xl border border-line bg-surface2/40 p-5 md:col-span-2">
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      className="flex w-full items-center justify-between gap-4 text-left"
    >
      <span className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
          <FiLock />
        </span>
        <span>
          <span className="block font-display text-base font-bold text-text">Şifrə ilə qoru</span>
          <span className="block text-xs text-muted">
            Şagird imtahana başlamaq üçün şifrəni daxil etməlidir.
          </span>
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

    {enabled && (
      <Field label="İmtahan şifrəsi" htmlFor="examPassword">
        <input
          id="examPassword"
          name="password"
          type="text"
          value={value}
          onChange={onChange}
          className={inputClass}
          placeholder="Məsələn: 2025"
          autoComplete="off"
        />
      </Field>
    )}
  </div>
);

export default PasswordField;
