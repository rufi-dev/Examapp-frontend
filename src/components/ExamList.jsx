import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addExamToUser,
  deleteExam,
  setExamHidden,
  getExamsByClass,
  getExamsByUser,
} from "../../redux/features/quiz/quizSlice";
import { getResultsByUser } from "../../redux/features/quiz/resultSlice";
import { Link, useNavigate } from "react-router-dom";
import Loader from "./Loader";
import { MdOutlineModeEditOutline } from "react-icons/md";
import { AiFillDelete, AiOutlinePlus } from "react-icons/ai";
import {
  FiClock,
  FiBarChart2,
  FiFileText,
  FiEye,
  FiEyeOff,
  FiGift,
  FiPlay,
  FiCheckCircle,
} from "react-icons/fi";
import { payExam } from "../../redux/features/stripe/stripeSlice";
import Button from "./ui/Button";
import ConfirmDialog from "./ui/ConfirmDialog";
import useServerNow from "../customHook/useServerNow";

// dd.mm.yyyy
const fmtDate = (d) => {
  if (!d) return "";
  const x = new Date(d);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(x.getDate())}.${p(x.getMonth() + 1)}.${x.getFullYear()}`;
};

// Status pill: future / active / always-active / ended.
const statusInfo = (exam, now) => {
  const s = exam.startDate ? new Date(exam.startDate).getTime() : null;
  const e = exam.endDate ? new Date(exam.endDate).getTime() : null;
  if (s && now < s) return { label: "Gələcək", cls: "bg-warning/15 text-warning" };
  if (e && now > e) return { label: "Bitib", cls: "bg-danger/15 text-danger" };
  if (e) return { label: "Aktiv", cls: "bg-success/15 text-success" };
  return { label: "Həmişə aktiv", cls: "bg-success/15 text-success" };
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
  const { result: userResults } = useSelector((state) => state.result);
  // Only the owner (or admin) manages an exam — not a participant teacher.
  const canManage = (exam) =>
    user?.role === "admin" || (exam?.owner && String(exam.owner) === String(user?._id));
  const navigate = useNavigate();
  const [loadedOnce, setLoadedOnce] = useState(false);
  const now = useServerNow(30000); // shared, low-frequency clock for all cards

  // Exams this student already has a result for (drives the "Nəticəni Gör" CTA).
  const takenIds = useMemo(() => {
    const set = new Set();
    (Array.isArray(userResults) ? userResults : []).forEach((r) => {
      const id = r?.examId?._id || r?.examId;
      if (id) set.add(String(id));
    });
    return set;
  }, [userResults]);

  useEffect(() => {
    let active = true;
    Promise.resolve(dispatch(getExamsByClass(classId))).finally(() => {
      if (active) setLoadedOnce(true);
    });
    dispatch(getExamsByUser());
    dispatch(getResultsByUser());
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
    if (!exam.price || Number(exam.price) === 0) {
      const res = await dispatch(addExamToUser({ examId: exam._id }));
      if (res.type !== "quiz/addExamToUser/rejected") {
        await dispatch(getExamsByUser());
        navigate("/myExams?success=true");
      }
      return;
    }
    await dispatch(payExam({ exam, userId: user._id }));
  };

  const hasExams = exams && exams.length > 0;
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
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {exams.map((exam, index) => {
          const owned = myExams?.length > 0 && myExams.some((m) => m._id === exam._id);
          const status = statusInfo(exam, now);
          const sTime = exam.startDate ? new Date(exam.startDate).getTime() : null;
          const eTime = exam.endDate ? new Date(exam.endDate).getTime() : null;
          const upcoming = sTime && now < sTime;
          const ended = eTime && now > eTime;
          const taken = takenIds.has(String(exam._id));
          const free = !exam.price || Number(exam.price) === 0;
          const category = exam.class?.name || (exam.class?.level != null ? `${exam.class.level} sinif` : null);
          // Short display code derived from the exam id (e.g. "Kod: 3C1B7394").
          const code = String(exam._id || "").slice(-8).toUpperCase();
          // Solid status colour for the pill that sits on top of the cover.
          const statusSolid = upcoming
            ? "bg-warning text-white"
            : ended
            ? "bg-danger text-white"
            : "bg-success text-white";

          return (
            <div
              key={exam._id}
              className="group flex animate-fade-in flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-soft transition-all duration-200 ease-out-quint hover:-translate-y-1 hover:shadow-lift"
              style={{ animationDelay: `${Math.min(index * 60, 360)}ms` }}
            >
              {/* Cover banner with status + price overlaid */}
              <div className="relative h-44 w-full shrink-0 overflow-hidden">
                {exam.coverImage ? (
                  <img
                    src={exam.coverImage}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 ease-out-quint group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary via-primary to-accent2">
                    <FiFileText className="text-6xl text-white/25" />
                  </div>
                )}
                {/* Top shade so the pills stay readable on bright photos. */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/30 to-transparent" />
                <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${statusSolid}`}>
                    {upcoming ? (
                      <FiClock className="text-[13px]" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                    {status.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {exam.hidden && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                        <FiEyeOff /> Gizli
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
                        free ? "bg-success text-white" : "bg-accent2 text-white"
                      }`}
                    >
                      <FiGift className="text-[13px]" /> {free ? "Pulsuz" : `${exam.price} ₼`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                {/* Title + code + category */}
                <h3 className="line-clamp-2 font-display text-lg font-bold leading-snug text-text">
                  {exam.name}
                </h3>
                <p className="mt-1.5 text-xs font-medium tracking-wide text-muted">Kod: {code}</p>
                {category && <p className="mt-0.5 text-xs text-muted">{category}</p>}

                {/* Stats: Sual / Dəq / Bal */}
                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-5 text-center">
                  <div>
                    <p className="font-display text-[26px] font-extrabold leading-none text-primary">
                      {exam.questionCount ?? "—"}
                    </p>
                    <p className="mt-1.5 text-xs text-muted">Sual</p>
                  </div>
                  <div>
                    <p className="font-display text-[26px] font-extrabold leading-none text-success">
                      {Math.round((exam.duration || 0) / 60)}
                    </p>
                    <p className="mt-1.5 text-xs text-muted">Dəq</p>
                  </div>
                  <div>
                    <p className="font-display text-[26px] font-extrabold leading-none text-accent2">
                      {exam.totalMarks ?? "—"}
                    </p>
                    <p className="mt-1.5 text-xs text-muted">Bal</p>
                  </div>
                </div>

                {/* Footer: owner tools + action button(s) */}
                <div className="mt-auto pt-5">
                  {canManage(exam) && (
                    <div className="mb-4 flex items-center justify-end gap-1.5 border-t border-line pt-4">
                      <ExamAction onClick={() => handleToggleHidden(exam)} label={exam.hidden ? "Göstər" : "Gizlət"}>
                        {exam.hidden ? <FiEye className="text-[17px]" /> : <FiEyeOff className="text-[17px]" />}
                      </ExamAction>
                      <ExamAction to={`/exam/${exam._id}/resultsByExam`} label="Nəticələr">
                        <FiBarChart2 className="text-[17px]" />
                      </ExamAction>
                      <ExamAction
                        to={exam.mode === "structured" ? `/exam/${exam._id}/build` : `/exam/${exam._id}/addQuestion`}
                        label="Sual əlavə et"
                      >
                        <AiOutlinePlus className="text-[17px]" />
                      </ExamAction>
                      <ExamAction to={`/exam/edit/${exam._id}`} label="Redaktə et">
                        <MdOutlineModeEditOutline className="text-[17px]" />
                      </ExamAction>
                      <ExamAction onClick={() => setConfirmExam(exam)} label="Sil" tone="danger">
                        <AiFillDelete className="text-[17px]" />
                      </ExamAction>
                    </div>
                  )}

                  {taken ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        to={`/exam/${exam._id}/result`}
                        size="lg"
                        className="w-full bg-success text-white hover:brightness-105"
                      >
                        <FiBarChart2 /> Nəticəni gör
                      </Button>
                      {/* Always offer a look at the exam when a result exists —
                          including ended exams (review what you took). */}
                      <Button to={`/exam/details/${exam._id}`} variant="outline" size="lg" className="w-full">
                        İmtahana bax
                      </Button>
                    </div>
                  ) : upcoming ? (
                    <Button disabled size="lg" className="w-full">
                      <FiClock /> Tezliklə · {fmtDate(exam.startDate)}
                    </Button>
                  ) : ended ? (
                    <Button disabled size="lg" className="w-full">
                      İmtahan bitib
                    </Button>
                  ) : owned ? (
                    <Button to={`/exam/details/${exam._id}`} size="lg" className="w-full">
                      <FiPlay /> İmtahana başla
                    </Button>
                  ) : (
                    <Button onClick={(e) => addExam(e, exam)} size="lg" className="w-full">
                      {free ? (
                        <>
                          <FiCheckCircle /> Pulsuz əldə et
                        </>
                      ) : (
                        `Ödəniş et və qoşul · ${exam.price} AZN`
                      )}
                    </Button>
                  )}
                </div>
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
          <span className="font-semibold text-text">{confirmExam?.name}</span> imtahanı, sualları, PDF-i
          və bütün nəticələri həmişəlik silinəcək. Bu əməliyyat geri qaytarıla bilməz.
        </p>
      </ConfirmDialog>
    </>
  );
};

export default ExamList;
