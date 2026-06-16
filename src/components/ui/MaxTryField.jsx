import { FiRepeat } from "react-icons/fi";
import { Field, inputClass } from "./Field";
import ToggleSection from "./ToggleSection";

// Optional attempt limit: off = unlimited; on = a specific number of tries.
const MaxTryField = ({ enabled, value, onToggle, onChange }) => (
  <ToggleSection
    icon={FiRepeat}
    title="Cəhd sayını məhdudlaşdır"
    description="Söndürülübsə, şagird limitsiz cəhd edə bilər."
    enabled={enabled}
    onToggle={onToggle}
  >
    <Field label="Maksimum cəhd sayı" htmlFor="maxTry">
      <input
        id="maxTry"
        name="maxTry"
        type="number"
        min="1"
        value={value}
        onChange={onChange}
        className={inputClass}
        placeholder="Məsələn: 2"
      />
    </Field>
  </ToggleSection>
);

export default MaxTryField;
