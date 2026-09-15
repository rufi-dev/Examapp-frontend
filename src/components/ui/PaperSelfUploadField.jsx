import { FiUploadCloud } from "react-icons/fi";
import ToggleSection from "./ToggleSection";

// Paper exams: may students photograph and submit their own answer sheet?
const PaperSelfUploadField = ({ enabled, onToggle }) => (
  <ToggleSection
    icon={FiUploadCloud}
    title="Şagird öz vərəqini yükləsin"
    description="Şagird vərəqinin şəklini çəkir, AI oxuyur, yoxlayıb təqdim edir."
    enabled={enabled}
    onToggle={onToggle}
  >
    <p className="text-sm leading-relaxed text-muted">
      Şagird cavablarını yoxlayıb bir dəfə təqdim edir, sonra dəyişə bilmir. Vərəq sizə “Yoxlanmalı” kimi gəlir; şagirdin
      AI oxunuşundan fərqli dəyişdirdiyi cavablar işarələnir. Söndürsəniz, vərəqləri yalnız siz yükləyirsiniz.
    </p>
  </ToggleSection>
);

export default PaperSelfUploadField;
