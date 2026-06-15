import { useParams } from "react-router-dom";
import { AdminTeacherLink } from "../components/protect/hiddenLink";
import ClassList from "../components/ClassList";
import useRedirectLoggedOutUser from "../customHook/useRedirectLoggedOutUser";
import AccountLayout from "../components/AccountLayout";
import Button from "../components/ui/Button";
import { FiPlus } from "react-icons/fi";

const Classes = () => {
  useRedirectLoggedOutUser("/login");
  const { tagId } = useParams();

  return (
    <AccountLayout
      title="Siniflər"
      subtitle="Sinif və ya qrup seç, sonra imtahanlara bax."
      actions={
        <AdminTeacherLink>
          <Button to={`/classAdd/${tagId}`} variant="secondary" size="sm">
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
