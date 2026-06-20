import { useParams } from "react-router-dom";
import { AdminTeacherLink } from "../components/protect/hiddenLink";
import ExamList from "../components/ExamList";
import ClassShareBanner from "../components/ClassShareBanner";
import useRedirectLoggedOutUser from "../customHook/useRedirectLoggedOutUser";
import AccountLayout from "../components/AccountLayout";
import Button from "../components/ui/Button";
import { FiPlus } from "react-icons/fi";

const Exams = () => {
  useRedirectLoggedOutUser("/login");
  const { classId } = useParams();

  return (
    <AccountLayout
      title="İmtahanlar"
      subtitle="Sınaq imtahanını seç və həll etməyə başla."
      actions={
        <AdminTeacherLink>
          <Button to={`/examAdd/${classId}`} variant="secondary" size="sm">
            <FiPlus /> İmtahan əlavə et
          </Button>
        </AdminTeacherLink>
      }
    >
      <ClassShareBanner classId={classId} />
      <ExamList classId={classId} />
    </AccountLayout>
  );
};

export default Exams;
