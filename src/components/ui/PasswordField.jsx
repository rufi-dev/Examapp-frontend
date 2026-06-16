import { FiLock } from "react-icons/fi";
import { Field, inputClass } from "./Field";
import ToggleSection from "./ToggleSection";

// Optional exam access password: a toggle that reveals a password input.
const PasswordField = ({ enabled, value, onToggle, onChange }) => (
  <ToggleSection
    icon={FiLock}
    title="Şifrə ilə qoru"
    description="Şagird imtahana başlamaq üçün şifrəni daxil etməlidir."
    enabled={enabled}
    onToggle={onToggle}
  >
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
  </ToggleSection>
);

export default PasswordField;
