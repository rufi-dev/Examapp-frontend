import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FiClock, FiBarChart2, FiEyeOff, FiGift, FiPlay, FiCheckCircle, FiHelpCircle, FiAward } from "react-icons/fi";
import { addExamToUser, getExamsByUser } from "../../redux/features/quiz/quizSlice";
import useServerNow from "../customHook/useServerNow";
import Button from "./ui/Button";
import ExamCoverFallback from "./ExamCoverFallback";
import ExamAdminActions from "./ExamAdminActions";

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
  if (s && now < s) return "Gələcək";
  if (e && now > e) return "Bitib";
  return "Aktiv";
};

// The single, shared exam card used everywhere a teacher/student sees an exam
// (class list, İcmal dashboard, İmtahanlarım). Self-contained: it reads the
// viewer's acquired exams / results from the store and renders the right CTA
// + owner tools itself. `onChanged` is called after an owner hides/deletes so
// the host can refetch its list.
const ExamCard = ({ exam, onChanged, publicView = false }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { myExams } = useSelector((s) => s.quiz);
  const { user } = useSelector((s) => s.auth);
  const { result: userResults } = useSelector((s) => s.result);
  const now = useServerNow(30000); // shared low-frequency clock

  const takenIds = useMemo(() => {
    const set = new Set();
    (Array.isArray(userResults) ? userResults : []).forEach((r) => {
      const id = r?.examId?._id || r?.examId;
      if (id) set.add(String(id));
    });
    return set;
  }, [userResults]);

  const owned = myExams?.length > 0 && myExams.some((m) => m._id === exam._id);
  const sTime = exam.startDate ? new Date(exam.startDate).getTime() : null;
  const eTime = exam.endDate ? new Date(exam.endDate).getTime() : null;
  const upcoming = sTime && now < sTime;
  const ended = eTime && now > eTime;
  const taken = takenIds.has(String(exam._id));
  const free = !exam.price || Number(exam.price) === 0;
  const label = statusInfo(exam, now);
  const statusSolid = upcoming ? "bg-warning text-white" : ended ? "bg-danger text-white" : "bg-success text-white";
  const qCount =
    exam.questionCount ?? (Array.isArray(exam.questions) ? exam.questions.length : undefined) ?? "—";

  const isStaff = user?.role === "admin" || user?.role === "teacher";

  const buy = async (e) => {
    e.preventDefault();
    if (free) {
      const res = await dispatch(addExamToUser({ examId: exam._id }));
      if (res.type !== "quiz/addExamToUser/rejected") {
        await dispatch(getExamsByUser());
        navigate("/myExams?success=true");
      }
      return;
    }
    // Paid exams go through the manual bank-transfer payment page.
    navigate(`/exam/${exam._id}/pay`);
  };

  // Clicking a PAID exam that the viewer doesn't own (and isn't staff) goes
  // straight to the payment page instead of the detail page.
  const openCard = () => {
    if (!free && !owned && !isStaff) {
      navigate(`/exam/${exam._id}/pay`);
      return;
    }
    navigate(`/exam/details/${exam._id}`);
  };

  return (
    <div
      onClick={openCard}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft ring-1 ring-transparent transition-all duration-200 ease-out-quint hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift hover:ring-primary/10"
    >
      {/* Cover banner with status + price overlaid */}
      <div className="relative h-40 w-full shrink-0 overflow-hidden sm:h-44">
        {exam.coverImage ? (
          <img
            src={exam.coverImage}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 ease-out-quint group-hover:scale-[1.05]"
          />
        ) : (
          <ExamCoverFallback
            seed={exam._id}
            className="transition-transform duration-500 ease-out-quint group-hover:scale-[1.05]"
          />
        )}
        {/* readability scrims — top for badges, bottom to seat the title */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/70" />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm ring-1 ring-white/20 ${statusSolid}`}>
            {upcoming ? <FiClock className="text-[12px]" /> : <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            {label}
          </span>
          <div className="flex items-center gap-1.5">
            {exam.hidden && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur-sm">
                <FiEyeOff /> Gizli
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm ring-1 ${
                free
                  ? "bg-success/90 text-white ring-white/20"
                  : "bg-amber-400 text-emerald-950 ring-amber-200/50"
              }`}
            >
              {free ? <FiGift className="text-[12px]" /> : null} {free ? "Pulsuz" : `${exam.price} ₼`}
            </span>
          </div>
        </div>
        {/* Title seated on the cover — editorial, not a plain card header */}
        <h3 className="absolute inset-x-4 bottom-3 line-clamp-2 font-display text-[15px] font-bold leading-snug text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]">
          {exam.name}
        </h3>
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/* Stats: Sual / Dəq / Bal — a single quiet panel with hairline dividers */}
        <div className="grid grid-cols-3 divide-x divide-line overflow-hidden rounded-xl border border-line bg-surface2/50">
          <div className="flex flex-col items-center gap-0.5 py-3">
            <FiHelpCircle className="text-[13px] text-primary/70" />
            <p className="font-display text-lg font-extrabold leading-none tabular-nums text-text">{qCount}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted">Sual</p>
          </div>
          <div className="flex flex-col items-center gap-0.5 py-3">
            <FiClock className="text-[13px] text-success/80" />
            <p className="font-display text-lg font-extrabold leading-none tabular-nums text-text">
              {Math.round((exam.duration || 0) / 60)}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted">Dəq</p>
          </div>
          <div className="flex flex-col items-center gap-0.5 py-3">
            <FiAward className="text-[13px] text-accent2" />
            <p className="font-display text-lg font-extrabold leading-none tabular-nums text-text">
              {exam.totalMarks ?? "—"}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted">Bal</p>
          </div>
        </div>

        {/* Footer: owner tools + action button(s). Stop card navigation so these
            controls do their own thing. */}
        <div className="mt-auto pt-4" onClick={(e) => e.stopPropagation()}>
          {!publicView && (
            <ExamAdminActions exam={exam} onChanged={onChanged} className="mb-3 border-t border-line pt-3" />
          )}

          {publicView ? (
            <Button to={`/exam/details/${exam._id}`} size="md" className="w-full">
              <FiPlay /> Başla
            </Button>
          ) : taken ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button to={`/exam/${exam._id}/result`} size="md" className="w-full bg-success text-white hover:brightness-105">
                <FiBarChart2 /> Nəticəni gör
              </Button>
              <Button to={`/exam/details/${exam._id}`} variant="outline" size="md" className="w-full">
                İmtahana bax
              </Button>
            </div>
          ) : upcoming ? (
            <Button disabled size="md" className="w-full">
              <FiClock /> Tezliklə · {fmtDate(exam.startDate)}
            </Button>
          ) : ended ? (
            <Button disabled size="md" className="w-full">
              İmtahan bitib
            </Button>
          ) : owned ? (
            <Button to={`/exam/details/${exam._id}`} size="md" className="w-full">
              <FiPlay /> İmtahana başla
            </Button>
          ) : (
            <Button onClick={buy} size="md" className="w-full">
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
};

export default ExamCard;
