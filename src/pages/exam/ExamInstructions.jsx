import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { getExam } from "../../../redux/features/quiz/quizSlice";
import { getResultsByUserByExam } from "../../../redux/features/quiz/resultSlice";
import Loader from "../../components/Loader";
import { toast } from "react-toastify";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { ExamDeadline } from "../../components/protect/hiddenLink";
import AccountLayout from "../../components/AccountLayout";
import Button from "../../components/ui/Button";
import { FiClock, FiCalendar, FiList, FiInfo, FiPlay, FiRepeat } from "react-icons/fi";

const ExamInstructions = () => {
  useRedirectLoggedOutUser("/login");
  const [startDateString, setStartDate] = useState(null);
  const [endDateString, setEndDateString] = useState(null);
  const { singleExam, isLoading } = useSelector((state) => state.quiz);
  const { resultByExam } = useSelector((state) => state.result);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { examId } = useParams();

  useEffect(() => {
    dispatch(getExam(examId));
    dispatch(getResultsByUserByExam(examId));
  }, [dispatch, examId]);

  useEffect(() => {
    if (singleExam?.startDate) {
      const s = new Date(singleExam.startDate);
      setStartDate(`${s.toLocaleDateString("en-GB")} ${s.toLocaleTimeString("en-GB")}`);
    }
    if (singleExam?.endDate) {
      const e = new Date(singleExam.endDate);
      setEndDateString(`${e.toLocaleDateString("en-GB")} ${e.toLocaleTimeString("en-GB")}`);
    }
  }, [singleExam]);

  if (isLoading || !singleExam) {
    return <Loader />;
  }

  const duration = singleExam.duration || 0;
  const maxTry = singleExam.maxTry || 0;
  const attempts = resultByExam?.length || 0;
  const triesLeft = maxTry > 0 ? Math.max(0, maxTry - attempts) : null;
  const canStart = maxTry === 0 || attempts < maxTry;

  const startExam = () => {
    if (!user.isVerified) {
      return toast.error("Hesabınız təsdiqlənməyib. Zəhmət olmasa email-i təsdiqləyin");
    }
    if (!canStart) {
      return toast.error("Maksimum cəhd sayına çatmısınız");
    }
    navigate(`/exam/${singleExam?._id}/start`);
  };

  const meta = [
    {
      icon: FiClock,
      label: "Müddət",
      value: `${Math.floor(duration / 60)} dəq ${duration % 60} san`,
    },
    {
      icon: FiList,
      label: "Sual sayı",
      value: singleExam.questions?.correctAnswers?.length ?? "—",
    },
    {
      icon: FiRepeat,
      label: "Cəhdlər",
      value: maxTry > 0 ? `${attempts} / ${maxTry}` : "Limitsiz",
    },
    { icon: FiCalendar, label: "Başlanma", value: startDateString || "Məhdudiyyət yoxdur" },
    { icon: FiCalendar, label: "Bitmə", value: endDateString || "Məhdudiyyət yoxdur" },
  ];

  const rules = [
    "İmtahanı verilən vaxt ərzində tamamlamalısınız.",
    "Təqdim etməzdən əvvəl cavablarınızı nəzərdən keçirə bilərsiniz.",
    "Təqdim edildikdən sonra nəticələri və cavabları görə bilərsiniz.",
    "İmtahan başladıqdan sonra səhifəni yeniləməyin və geri qayıtmayın.",
  ];

  return (
    <AccountLayout>
      <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-line bg-surface p-8 shadow-soft sm:p-10">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              İmtahan
            </span>
            <h1 className="mt-2 font-display text-3xl font-bold text-text sm:text-4xl">
              {singleExam.name}
            </h1>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {meta.map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.label}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface2/40 p-4"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                      <Icon className="text-[19px]" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">
                        {m.label}
                      </p>
                      <p className="truncate font-semibold text-text">{m.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-text">
                <FiInfo className="text-primary" /> Qaydalar
              </h2>
              <ul className="mt-3 flex flex-col gap-2.5">
                {rules.map((r, i) => (
                  <li key={i} className="flex gap-2.5 leading-relaxed text-muted">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-9">
              {canStart ? (
                <ExamDeadline>
                  <Button onClick={startExam} size="lg" className="w-full sm:w-auto">
                    <FiPlay /> İmtahanı başlat
                    {triesLeft != null ? ` (${triesLeft} cəhd qalıb)` : ""}
                  </Button>
                </ExamDeadline>
              ) : (
                <div className="rounded-xl border border-line bg-surface2 px-4 py-3 text-center font-medium text-muted">
                  Maksimum cəhd sayına çatmısınız
                </div>
              )}
            </div>
          </div>
      </div>
    </AccountLayout>
  );
};

export default ExamInstructions;
