import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addExamToUser,
  deleteExam,
  setExamHidden,
  getExamsByClass,
  getExamsByUser,
} from "../../redux/features/quiz/quizSlice";
import { Link, useNavigate } from "react-router-dom";
import Loader from "./Loader";
import { MdOutlineModeEditOutline } from "react-icons/md";
import { AdminTeacherLink } from "./protect/hiddenLink";
import { AiFillDelete, AiOutlinePlus } from "react-icons/ai";
import { FiClock, FiBarChart2, FiArrowRight, FiFileText, FiEye, FiEyeOff, FiCalendar } from "react-icons/fi";
import { payExam } from "../../redux/features/stripe/stripeSlice";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import ConfirmDialog from "./ui/ConfirmDialog";
import useServerNow from "../customHook/useServerNow";
import { formatExamWindow, formatRemaining } from "../helper/datetime";

// Scheduled-window line + a live status pill (starts in / closes in / ended),
// driven by the shared server-synced clock so it ticks and survives reloads.
const ExamSchedule = ({ exam, now }) => {
  if (!exam.startDate && !exam.endDate) return null;
  const s = exam.startDate ? new Date(exam.startDate).getTime() : null;
  const e = exam.endDate ? new Date(exam.endDate).getTime() : null;
  let label, cls;
  if (s && now < s) {
    label = `Başlamasına ${formatRemaining(s - now)}`;
    cls = "bg-warning/15 text-warning";
  } else if (e && now > e) {
    label = "Bitib";
    cls = "bg-danger/15 text-danger";
  } else if (e) {
    label = `Bağlanmasına ${formatRemaining(e - now)}`;
    cls = "bg-success/15 text-success";
  } else {
    label = "Aktiv";
    cls = "bg-success/15 text-success";
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface2/50 px-2.5 py-0.5 text-xs font-medium text-muted">
        <FiCalendar className="text-[13px]" /> {formatExamWindow(exam.startDate, exam.endDate)}
      </span>
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${cls}`}>
        {label}
      </span>
    </div>
  );
};

// Admin action button with a hover tooltip so each icon's purpose is clear.
const ExamAction = ({ to, onClick, label, tone = "primary", children }) => {
  const toneCls =
    tone === "danger"
      ? "hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
      : "hover:border-primary/40 hover:bg-primary/10 hover:text-primary";
  const cls = `grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface text-muted transition-colors ${toneCls}`;
  return (
    <div className="group/act relative">
      {to ? (
        <Link to={to} aria-label={label} className={cls}>
          {children}
        </Link>
      ) : (
        <button type="button" onClick={onClick} aria-label={label} className={cls}>
          {children}
        </button>
      )}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-text px-2 py-1 text-xs font-semibold text-bg opacity-0 shadow-lift transition-opacity duration-150 group-hover/act:opacity-100">
        {label}
      </span>
    </div>
  );
};

const ExamList = ({ classId }) => {
  const dispatch = useDispatch();
  const { exams, myExams } = useSelector((state) => state.quiz);
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [loadedOnce, setLoadedOnce] = useState(false);
  // The card pills show coarse units ("starts in 2 days", "closes in 45 min"),
  // so a 30s tick is plenty — a 1s tick would re-reconcile the whole grid 60x/min
  // for zero visible change.
  const now = useServerNow(30000); // shared, low-frequency clock for all cards



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

  const handleToggleHidden = async (exam) => {
    try {
      await dispatch(setExamHidden({ examId: exam._id, hidden: !exam.hidden })).unwrap();
      dispatch(getExamsByClass(classId));
    } catch {
      /* error toast handled by the slice */
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
    <>
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
            <div className="flex min-w-0 items-center gap-3.5">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary ring-1 ring-inset ring-primary/15">
                <FiFileText className="text-[26px]" />
              </span>
              <div className="min-w-0">
                <h3 className="line-clamp-2 font-display text-xl font-bold leading-tight text-text">
                  {exam.name}
                </h3>
                {exam.hidden && (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                    <FiEyeOff /> Gizli
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
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

            <ExamSchedule exam={exam} now={now} />

            <div className="mt-auto pt-6">
              <AdminTeacherLink>
                <div className="mb-4 flex items-center justify-end gap-1.5 border-t border-line pt-4">
                  <ExamAction
                    onClick={() => handleToggleHidden(exam)}
                    label={exam.hidden ? "Göstər" : "Gizlət"}
                  >
                    {exam.hidden ? (
                      <FiEye className="text-[17px]" />
                    ) : (
                      <FiEyeOff className="text-[17px]" />
                    )}
                  </ExamAction>
                  <ExamAction to={`/exam/${exam._id}/resultsByExam`} label="Nəticələr">
                    <FiBarChart2 className="text-[17px]" />
                  </ExamAction>
                  <ExamAction to={`/exam/${exam._id}/addQuestion`} label="Sual əlavə et">
                    <AiOutlinePlus className="text-[17px]" />
                  </ExamAction>
                  <ExamAction to={`/exam/edit/${exam._id}`} label="Redaktə et">
                    <MdOutlineModeEditOutline className="text-[17px]" />
                  </ExamAction>
                  <ExamAction onClick={() => setConfirmExam(exam)} label="Sil" tone="danger">
                    <AiFillDelete className="text-[17px]" />
                  </ExamAction>
                </div>
              </AdminTeacherLink>
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

      <ConfirmDialog
        open={!!confirmExam}
        onClose={() => setConfirmExam(null)}
        onConfirm={handleDeleteExam}
        title="İmtahanı silmək?"
        confirmLabel="Bəli, sil"
        cancelLabel="Geri"
        tone="danger"
        loading={deletingExam}
      >
        <p>
          <span className="font-semibold text-text">{confirmExam?.name}</span> imtahanı,
          sualları, PDF-i və bütün nəticələri həmişəlik silinəcək. Bu əməliyyat geri
          qaytarıla bilməz.
        </p>
      </ConfirmDialog>
    </>
  );
};

export default ExamList;
