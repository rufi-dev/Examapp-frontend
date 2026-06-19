import { FiShuffle, FiPercent } from "react-icons/fi";
import ToggleSection from "./ToggleSection";

// Grading options that apply only to STRUCTURED (native) exams: per-student
// option shuffle and multi-select partial credit. Shown only when the exam is
// in structured mode (they're ignored server-side for PDF exams).
const StructuredGradingFields = ({ shuffle, partial, onShuffle, onPartial }) => (
  <>
    <ToggleSection
      icon={FiShuffle}
      title="Variantları qarışdır"
      description="Hər tələbə üçün variant sırası təsadüfi olur."
      enabled={shuffle}
      onToggle={onShuffle}
    >
      <p className="text-sm leading-relaxed text-muted">
        Tək və çox seçimli sualların variantları hər tələbədə fərqli sırada göstərilir.
        Cavablar serverdə düzgün qiymətləndirilir — sıra dəyişsə də nəticə düz olur.
      </p>
    </ToggleSection>
    <ToggleSection
      icon={FiPercent}
      title="Çox seçimdə hissəvi bal"
      description="Tam düzgün olmasa belə qismən bal."
      enabled={partial}
      onToggle={onPartial}
    >
      <p className="text-sm leading-relaxed text-muted">
        Çox seçimli suallarda hər düzgün variant bal qazandırır, hər səhv variant azaldır
        (bal mənfi olmur). Tək seçim, açıq və uyğunlaşdırma suallarına təsir etmir.
      </p>
    </ToggleSection>
  </>
);

export default StructuredGradingFields;
