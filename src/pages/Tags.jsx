import { AdminTeacherLink } from "../components/protect/hiddenLink";
import Categories from "../components/Categories";
import AccountLayout from "../components/AccountLayout";
import JoinClassButton from "../components/JoinClassButton";
import Button from "../components/ui/Button";
import { FiPlus, FiUsers } from "react-icons/fi";

const Tags = () => {
  return (
    <AccountLayout
      title="Kateqoriyalar"
      subtitle="Hazırlaşmaq istədiyin istiqaməti seç."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <JoinClassButton />
          <AdminTeacherLink>
            <Button to="/myClasses" variant="ghost" size="sm">
              <FiUsers /> Siniflərim
            </Button>
            <Button to="/tagAdd" variant="secondary" size="sm">
              <FiPlus /> Kateqoriya əlavə et
            </Button>
          </AdminTeacherLink>
        </div>
      }
    >
      <Categories />
    </AccountLayout>
  );
};

export default Tags;
