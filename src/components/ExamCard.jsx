import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FiClock, FiBarChart2, FiEyeOff, FiGift, FiPlay, FiCheckCircle } from "react-icons/fi";
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
  // Owner/admin of THIS exam — only they get the management footer.
  const canManage =
    user?.role === "admin" || (exam?.owner && String(exam.owner) === String(user?._id));

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
      {/* Cover — kept fully visible (no overlay panel) so the artwork reads clearly. */}
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden">
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
        {/* light top scrim so the badges stay legible over any cover */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent" />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm ring-1 ring-white/25 ${statusSolid}`}>
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
                  ? "bg-success text-white ring-white/25"
                  : "bg-amber-400 text-emerald-950 ring-amber-200/50"
              }`}
            >
              {free ? <FiGift className="text-[12px]" /> : null} {free ? "Pulsuz" : `${exam.price} ₼`}
            </span>
          </div>
        </div>
      </div>

      {/* Info block — solid surface, dark readable text. Title, stats and the
          action sit together as one unit directly under the cover. */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-[2.75rem] font-display text-[16px] font-bold leading-snug text-text transition-colors group-hover:text-primary">
          {exam.name}
        </h3>

        <div className="mt-3 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-xl border border-line bg-surface2/50">
          <div className="px-1 py-2.5 text-center">
            <p className="font-display text-lg font-extrabold leading-none tabular-nums text-text">{qCount}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Sual</p>
          </div>
          <div className="px-1 py-2.5 text-center">
            <p className="font-display text-lg font-extrabold leading-none tabular-nums text-text">
              {Math.round((exam.duration || 0) / 60)}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Dəq</p>
          </div>
          <div className="px-1 py-2.5 text-center">
            <p className="font-display text-lg font-extrabold leading-none tabular-nums text-text">
              {exam.totalMarks ?? "—"}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Bal</p>
          </div>
        </div>

        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
          {publicView ? (
            <Button onClick={openCard} size="md" className="w-full">
              {!free && !owned && !isStaff ? (
                `Ödəniş et və başla · ${exam.price} ₼`
              ) : (
                <>
                  <FiPlay /> Başla
                </>
              )}
            </Button>
          ) : taken ? (
            <div className="flex flex-col gap-2">
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

        {/* Owner/admin tools only — students never see this row. */}
        {!publicView && canManage && (
          <div className="mt-3 border-t border-line pt-3" onClick={(e) => e.stopPropagation()}>
            <ExamAdminActions exam={exam} onChanged={onChanged} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamCard;
