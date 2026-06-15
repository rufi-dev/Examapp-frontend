import { AdminTeacherLink } from "../components/protect/hiddenLink";
import Categories from "../components/Categories";
import AccountLayout from "../components/AccountLayout";
import Button from "../components/ui/Button";
import { FiPlus } from "react-icons/fi";

const Tags = () => {
  return (
    <AccountLayout
      title="Kateqoriyalar"
      subtitle="Hazırlaşmaq istədiyin istiqaməti seç."
      actions={
        <AdminTeacherLink>
          <Button to="/tagAdd" variant="secondary" size="sm">
            <FiPlus /> Kateqoriya əlavə et
          </Button>
        </AdminTeacherLink>
      }
    >
      <Categories />
    </AccountLayout>
  );
};

export default Tags;
