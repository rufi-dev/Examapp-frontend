import { FiCamera } from "react-icons/fi";
import ToggleSection from "./ToggleSection";

// When on, students can attach a photo of their worked solution to each question
// during the exam; teachers review them per student afterwards.
const SolutionPhotosField = ({ enabled, onToggle }) => (
  <ToggleSection
    icon={FiCamera}
    title="Həll şəkilləri (şagird)"
    description="Şagird hər suala öz həllinin şəklini əlavə edə bilər."
    enabled={enabled}
    onToggle={onToggle}
  >
    <p className="text-sm leading-relaxed text-muted">
      Aktiv olduqda imtahan zamanı şagird hər suala (istəyə görə) həll yolunun şəklini yükləyə
      bilər. Müəllim sonradan hər şagirdin həll şəkillərini nəticələrdə görür.
    </p>
  </ToggleSection>
);

export default SolutionPhotosField;
