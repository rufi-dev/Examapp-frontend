import { useEffect } from "react";
import AccountLayout from "../../components/AccountLayout";
import { useDispatch, useSelector } from "react-redux";
import { addExamToUser, getExamsByUser } from "../../../redux/features/quiz/quizSlice";
import { getResultsByUser } from "../../../redux/features/quiz/resultSlice";
import { useLocation } from "react-router-dom";
import Button from "../../components/ui/Button";
import ExamCard from "../../components/ExamCard";
import CenterLoader from "../../components/ui/CenterLoader";

const MyExams = () => {
  const dispatch = useDispatch();
  const { myExams, isLoading } = useSelector((state) => state.quiz);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get("token");
  const examId = searchParams.get("examId");
  const sessionId = searchParams.get("session_id");
  const success = searchParams.get("success");

  useEffect(() => {
    if (token && success) {
      dispatch(addExamToUser({ examId, token, sessionId }));
    }
    dispatch(getExamsByUser());
    dispatch(getResultsByUser());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success, token]);

  return (
    <AccountLayout title="İmtahanlarım" subtitle="Əldə etdiyin imtahanlar burada toplanır.">
      {isLoading ? (
          <CenterLoader />
        ) : myExams && myExams.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {myExams.map((exam) => (
              <ExamCard
                key={exam._id}
                exam={exam}
                onChanged={() => dispatch(getExamsByUser())}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-line bg-surface p-16 text-center">
            <p className="font-display text-xl font-bold text-text">Hələ imtahan əlavə edilməyib</p>
            <p className="mx-auto mt-2 max-w-sm text-muted">
              İmtahanlar bölməsindən sınaq seç və hazırlaşmağa başla.
            </p>
            <Button to="/classes" className="mt-6">
              İmtahanlara bax
            </Button>
          </div>
      )}
    </AccountLayout>
  );
};

export default MyExams;
