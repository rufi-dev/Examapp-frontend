import { AdminTeacherLink, ShowOnLogin } from "../components/protect/hiddenLink";
import ClassList from "../components/ClassList";
import JoinClassButton from "../components/JoinClassButton";
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
        <div className="flex items-center gap-2">
          {/* Anyone logged in can join a class with the teacher's code. */}
          <ShowOnLogin>
            <JoinClassButton />
          </ShowOnLogin>
          <AdminTeacherLink>
            <Button to="/classAdd" variant="secondary" size="sm">
              <FiPlus /> Sinif əlavə et
            </Button>
          </AdminTeacherLink>
        </div>
      }
    >
      <ClassList />
    </AccountLayout>
  );
};

export default Classes;
