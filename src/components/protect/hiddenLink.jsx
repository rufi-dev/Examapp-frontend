import { useDispatch, useSelector } from "react-redux";
import {
  selectIsLoggedIn,
  selectUser,
} from "../../../redux/features/auth/authSlice";
import { Link } from "react-router-dom";
import useServerNow from "../../customHook/useServerNow";
import { formatRemaining, formatExamWindow } from "../../helper/datetime";

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
  // Server-synced ticking clock: countdowns are authoritative and resume after
  // any reload/return because they're derived from absolute timestamps.
  const now = useServerNow();
  const { singleExam } = useSelector((state) => state.quiz);

  const start = singleExam?.startDate ? new Date(singleExam.startDate).getTime() : null;
  const end = singleExam?.endDate ? new Date(singleExam.endDate).getTime() : null;

  // Before the window opens: live countdown that auto-flips to the start button
  // the moment it reaches zero (no refresh needed).
  if (start && now < start) {
    return (
      <div className="max-w-md rounded-2xl border border-warning/30 bg-warning/10 px-5 py-4">
        <p className="text-sm font-medium text-muted">İmtahanın başlamasına</p>
        <p className="mt-1 font-display text-3xl font-bold tabular-nums text-text">
          {formatRemaining(start - now)}
        </p>
        <p className="mt-1.5 text-xs text-muted">
          {formatExamWindow(singleExam.startDate, singleExam.endDate)}
        </p>
      </div>
    );
  }

  // After it closes.
  if (end && now > end) {
    return (
      <div className="max-w-md rounded-xl border border-line bg-surface2 px-4 py-3 text-center font-medium text-muted">
        İmtahan artıq bitib
      </div>
    );
  }

  // Open: render the start button, plus a ticking "closes in" note if there's
  // an end time so the student feels the pressure of the window.
  return (
    <div className="space-y-3">
      {end && (
        <div className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface2/60 px-3 py-1.5 text-sm font-medium text-muted">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-success" />
          Bağlanmasına:{" "}
          <span className="font-semibold tabular-nums text-text">
            {formatRemaining(end - now)}
          </span>
        </div>
      )}
      {children}
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
