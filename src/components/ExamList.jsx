import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addExamToUser,
  getExamsByClass,
  getExamsByUser,
} from "../../redux/features/quiz/quizSlice";
import { getResultsByUser } from "../../redux/features/quiz/resultSlice";
import { useNavigate } from "react-router-dom";
import Loader from "./Loader";
import { FiClock, FiBarChart2, FiEyeOff, FiGift, FiPlay, FiCheckCircle } from "react-icons/fi";
import ExamCoverFallback from "./ExamCoverFallback";
import ExamAdminActions from "./ExamAdminActions";
import { payExam } from "../../redux/features/stripe/stripeSlice";
import Button from "./ui/Button";
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

const ExamList = ({ classId }) => {
  const dispatch = useDispatch();
  const { exams, myExams } = useSelector((state) => state.quiz);
  const { user } = useSelector((state) => state.auth);
  const { result: userResults } = useSelector((state) => state.result);
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
                  <ExamCoverFallback
                    seed={exam._id}
                    className="transition-transform duration-300 ease-out-quint group-hover:scale-[1.03]"
                  />
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
                {/* Title */}
                <h3 className="line-clamp-2 font-display text-lg font-bold leading-snug text-text">
                  {exam.name}
                </h3>

                {/* Stats: Sual / Dəq / Bal */}
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-5 text-center">
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
                  <ExamAdminActions
                    exam={exam}
                    onChanged={() => dispatch(getExamsByClass(classId))}
                    className="mb-4 border-t border-line pt-4"
                  />

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
    </>
  );
};

export default ExamList;
