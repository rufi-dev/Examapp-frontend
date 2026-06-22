import { AdminTeacherLink } from "../components/protect/hiddenLink";
import ClassList from "../components/ClassList";
import useRedirectLoggedOutUser from "../customHook/useRedirectLoggedOutUser";
import AccountLayout from "../components/AccountLayout";
import Button from "../components/ui/Button";
import { FiPlus } from "react-icons/fi";

const Classes = () => {
  useRedirectLoggedOutUser("/login");

  return (
    <AccountLayout
      title="Siniflər"
      subtitle="Sinif seç və imtahanlara bax."
      actions={
        <AdminTeacherLink>
          <Button to="/classAdd" variant="secondary" size="sm">
            <FiPlus /> Sinif əlavə et
          </Button>
        </AdminTeacherLink>
      }
    >
      <ClassList />
    </AccountLayout>
  );
};

export default Classes;
