import { useEffect } from "react";
import AccountLayout from "../../components/AccountLayout";
import { useDispatch, useSelector } from "react-redux";
import {
  addExamToUser,
  deleteMyExam,
  getExamsByUser,
} from "../../../redux/features/quiz/quizSlice";
import { AiFillDelete } from "react-icons/ai";
import { FiClock, FiFileText } from "react-icons/fi";
import { useLocation } from "react-router-dom";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success, token]);

  const deleteExam = async (e, id) => {
    e.preventDefault();
    await dispatch(deleteMyExam(id));
    await dispatch(getExamsByUser());
  };

  return (
    <AccountLayout title="İmtahanlarım" subtitle="Əldə etdiyin imtahanlar burada toplanır.">
      {isLoading ? (
          <CenterLoader />
        ) : myExams && myExams.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {myExams.map((exam) => (
              <div
                key={exam._id}
                className="flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-soft transition-all duration-200 ease-out-quint hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-lg font-bold text-text">{exam.name}</h2>
                  <button
                    onClick={(e) => deleteExam(e, exam._id)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/12 hover:text-danger"
                    aria-label="Sil"
                  >
                    <AiFillDelete />
                  </button>
                </div>

                <div className="mt-4 flex flex-col gap-2 text-sm text-muted">
                  <span className="flex items-center gap-2">
                    <FiClock className="text-primary" />
                    {Math.floor(exam.duration / 60)} dəq {exam.duration % 60} san
                  </span>
                  <span className="flex items-center gap-2">
                    <FiFileText className="text-primary" />
                    {exam.questions?.length ?? 0} sual
                  </span>
                </div>

                {exam.tags?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {exam.tags.map((tag) => (
                      <Badge key={tag._id} tone="primary">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}

                <Button to={`/exam/details/${exam._id}`} className="mt-6 w-full">
                  İmtahana bax
                </Button>
              </div>
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
