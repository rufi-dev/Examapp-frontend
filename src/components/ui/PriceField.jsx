import { FiDollarSign } from "react-icons/fi";
import { Field, inputClass } from "./Field";
import ToggleSection from "./ToggleSection";

// Optional paid exam: off = free; on = a price in AZN.
const PriceField = ({ enabled, value, onToggle, onChange }) => (
  <ToggleSection
    icon={FiDollarSign}
    title="Ödənişli imtahan"
    description="Söndürülübsə, imtahan pulsuzdur."
    enabled={enabled}
    onToggle={onToggle}
  >
    <Field label="Qiymət (AZN)" htmlFor="price">
      <input
        id="price"
        name="price"
        type="number"
        min="0"
        value={value}
        onChange={onChange}
        className={inputClass}
        placeholder="Məsələn: 5"
      />
    </Field>
  </ToggleSection>
);

export default PriceField;
