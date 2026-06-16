import { FiShield } from "react-icons/fi";
import ToggleSection from "./ToggleSection";

// Anti-cheat: when on, the exam runner activates all protective measures.
const AntiCheatField = ({ enabled, onToggle }) => (
  <ToggleSection
    icon={FiShield}
    title="Anti-cheat qoruması"
    description="Tam ekran, tab keçidinin izlənməsi, kopyalama qadağası."
    enabled={enabled}
    onToggle={onToggle}
  >
    <p className="text-sm leading-relaxed text-muted">
      Aktiv olduqda imtahan tam ekranda açılır; tab dəyişmə və pəncərədən çıxma qeydə alınır
      və xəbərdarlıq verilir; kopyalama, yapışdırma və sağ klik bağlanır. Təkrar pozuntudan
      sonra imtahan avtomatik təqdim olunur, pozuntu sayı müəllimə göstərilir.
    </p>
  </ToggleSection>
);

export default AntiCheatField;
