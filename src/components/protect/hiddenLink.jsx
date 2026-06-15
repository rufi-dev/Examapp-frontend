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

  const start = singleExam?.startDate ? new Date(singleExam.startDate) : null;
  const end = singleExam?.endDate ? new Date(singleExam.endDate) : null;
  const open = singleExam && (!start || today >= start) && (!end || today <= end);

  if (open) {
    return <>{children}</>;
  }

  const message = end && today > end ? "İmtahan artıq bitib" : "İmtahan hələ başlamayıb";
  return (
    <div className="rounded-xl border border-line bg-surface2 px-4 py-3 text-center font-medium text-muted">
      {message}
    </div>
  );
};
export const AdminTeacherLink = ({ children }) => {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const user = useSelector(selectUser);

  if (isLoggedIn && (user?.role === "admin" || user?.role === "teacher")) {
    return <>{children}</>;
  }
  return null;
};
