import { useDispatch, useSelector } from "react-redux";
import {
  selectIsLoggedIn,
  selectUser,
} from "../../../redux/features/auth/authSlice";
import { Link } from "react-router-dom";

export const ShowOnLogin = ({ children }) => {
  const isLoggedIn = useSelector(selectIsLoggedIn);

  if (isLoggedIn) {
    return <>{children}</>;
  }
  return null;
};

export const ShowOnLogout = ({ children }) => {
  const isLoggedIn = useSelector(selectIsLoggedIn);

  if (!isLoggedIn) {
    return <>{children}</>;
  }
  return null;
};
export const ExamDeadline = ({ children }) => {
  const today = new Date();
  const { singleExam } = useSelector((state) => state.quiz);
  if (singleExam && today >= new Date(singleExam.startDate) && today <= new Date(singleExam.endDate)) {
    return <>{children}</>;
  } else if (singleExam && today > new Date(singleExam.endDate)) {
    return <>
      <div>
        <Link className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          İmtahan Artıq Bitib
        </Link>
      </div>
    </>;
  } else {
    return (
      <>
        <div>
          <Link className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            İmtahan Hələ Başlamayıb
          </Link>
        </div>
      </>
    );
  }
};
export const AdminTeacherLink = ({ children }) => {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const user = useSelector(selectUser);

  if (isLoggedIn && (user?.role === "admin" || user?.role === "teacher")) {
    return <>{children}</>;
  }
  return null;
};
