import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addExamToUser,
  deleteExam,
  getExamsByClass,
  getExamsByUser,
} from "../../redux/features/quiz/quizSlice";
import { Link, useNavigate } from "react-router-dom";
import Loader from "./Loader";
import { MdOutlineModeEditOutline } from "react-icons/md";
import { AdminTeacherLink } from "./protect/hiddenLink";
import { AiFillDelete, AiOutlinePlus } from "react-icons/ai";
import { FiClock, FiBarChart2, FiArrowRight, FiFileText } from "react-icons/fi";
import { payExam } from "../../redux/features/stripe/stripeSlice";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import ConfirmDialog from "./ui/ConfirmDialog";

const ExamList = ({ classId }) => {
  const dispatch = useDispatch();
  const { exams, myExams } = useSelector((state) => state.quiz);
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    let active = true;
    // Background fetch; don't gate on isLoading so cached exams show instantly.
    Promise.resolve(dispatch(getExamsByClass(classId))).finally(() => {
      if (active) setLoadedOnce(true);
    });
    dispatch(getExamsByUser());
    return () => {
      active = false;
    };
  }, [dispatch, classId]);

  const [confirmExam, setConfirmExam] = useState(null);
  const [deletingExam, setDeletingExam] = useState(false);

  const handleDeleteExam = async () => {
    if (!confirmExam) return;
    setDeletingExam(true);
    try {
      await dispatch(deleteExam(confirmExam._id)).unwrap();
      setConfirmExam(null);
      dispatch(getExamsByClass(classId));
    } catch {
      /* error toast handled by the slice */
    } finally {
      setDeletingExam(false);
    }
  };

  const addExam = async (e, exam) => {
    e.preventDefault();
    // Free exam: skip Stripe, add directly and go to the success page.
    if (!exam.price || Number(exam.price) === 0) {
      const res = await dispatch(addExamToUser({ examId: exam._id }));
      if (res.type !== "quiz/addExamToUser/rejected") {
        await dispatch(getExamsByUser());
        navigate("/myExams?success=true");
      }
      return;
    }
    // Paid exam: Stripe checkout (payExam redirects to Stripe).
    await dispatch(payExam({ exam, userId: user._id }));
  };

  const hasExams = exams && exams.length > 0;

  // Loader only on the very first load when there's nothing to show yet.
  if (!hasExams && !loadedOnce) return <Loader />;

  if (!hasExams) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center text-muted">
        Hələlik imtahan yoxdur.
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {exams.map((exam, index) => {
        const owned =
          myExams?.length > 0 && myExams.some((m) => m._id === exam._id);
        return (
          <div
            key={exam._id}
            className="flex animate-fade-in flex-col rounded-3xl border border-line bg-surface p-7 shadow-soft transition-all duration-200 ease-out-quint hover:-translate-y-1 hover:shadow-lift"
            style={{ animationDelay: `${Math.min(index * 60, 360)}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                  <FiFileText className="text-[21px]" />
                </span>
                <h3 className="font-display text-xl font-bold leading-tight text-text">
                  {exam.name}
                </h3>
              </div>
              <AdminTeacherLink>
                <div className="-mr-1 flex shrink-0 items-center">
                  <Link
                    to={`/exam/${exam._id}/resultsByExam`}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-primary"
                    aria-label="Nəticələr"
                  >
                    <FiBarChart2 />
                  </Link>
                  <Link
                    to={`/exam/${exam._id}/addQuestion`}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-primary"
                    aria-label="Sual əlavə et"
                  >
                    <AiOutlinePlus />
                  </Link>
                  <Link
                    to={`/exam/edit/${exam._id}`}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-primary"
                    aria-label="Düzəliş"
                  >
                    <MdOutlineModeEditOutline />
                  </Link>
                  <button
                    onClick={() => setConfirmExam(exam)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/12 hover:text-danger"
                    aria-label="Sil"
                  >
                    <AiFillDelete />
                  </button>
                </div>
              </AdminTeacherLink>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Badge tone="neutral">
                <FiClock /> {Math.floor(exam.duration / 60)} dəq {exam.duration % 60} san
              </Badge>
              {exam.class?.level != null && (
                <Badge tone="primary">{exam.class.level} sinif</Badge>
              )}
              <Badge tone={exam.price > 0 ? "accent" : "success"}>
                {exam.price > 0 ? `${exam.price} AZN` : "Pulsuz"}
              </Badge>
            </div>

            <div className="mt-auto pt-7">
              {owned ? (
                <Button to={`/exam/details/${exam._id}`} size="lg" className="w-full">
                  İmtahana bax <FiArrowRight />
                </Button>
              ) : (
                <Button onClick={(e) => addExam(e, exam)} size="lg" className="w-full">
                  {exam.price > 0 ? `Əldə et · ${exam.price} AZN` : "Pulsuz əldə et"}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ExamList;
