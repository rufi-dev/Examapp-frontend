import { FiMinusCircle } from "react-icons/fi";
import { Field, inputClass } from "./Field";
import ToggleSection from "./ToggleSection";

// Negative marking: every N wrong answers cancel M correct answers' worth.
// `until` limits it to questions 1..N (0/empty = every question).
const NegativeMarkingField = ({ enabled, wrong, correct, until, onToggle, onChange }) => (
  <ToggleSection
    icon={FiMinusCircle}
    title="Neqativ qiymətləndirmə"
    description="Səhv cavablar balı azaldır (boş suallar cəzalanmır)."
    enabled={enabled}
    onToggle={onToggle}
  >
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Neçə səhv" htmlFor="wrongPerPenalty">
        <input
          id="wrongPerPenalty"
          name="wrongPerPenalty"
          type="number"
          min="1"
          value={wrong}
          onChange={onChange}
          className={inputClass}
        />
      </Field>
      <Field label="Neçə doğrunu aparır" htmlFor="correctPerPenalty">
        <input
          id="correctPerPenalty"
          name="correctPerPenalty"
          type="number"
          min="1"
          value={correct}
          onChange={onChange}
          className={inputClass}
        />
      </Field>
      <Field
        label="Neçənci suala qədər"
        htmlFor="negMarkUntil"
        hint="0 = bütün suallara tətbiq olunur"
      >
        <input
          id="negMarkUntil"
          name="negMarkUntil"
          type="number"
          min="0"
          value={until ?? 0}
          onChange={onChange}
          className={inputClass}
        />
      </Field>
    </div>
    <p className="mt-3 rounded-lg bg-surface2/60 px-3 py-2 text-xs text-muted">
      Hər <span className="font-semibold text-text">{wrong || 1}</span> səhv cavab{" "}
      <span className="font-semibold text-text">{correct || 1}</span> sualın balını aparır
      {Number(until) > 0 ? (
        <>
          {" "}— yalnız ilk <span className="font-semibold text-text">{until}</span> suala.
        </>
      ) : (
        "."
      )}
    </p>
  </ToggleSection>
);

export default NegativeMarkingField;
