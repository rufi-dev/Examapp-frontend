import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { getExam, getAttemptStatus } from "../../../redux/features/quiz/quizSlice";
import { getResultsByUserByExam } from "../../../redux/features/quiz/resultSlice";
import Loader from "../../components/Loader";
import { toast } from "react-toastify";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { ExamDeadline } from "../../components/protect/hiddenLink";
import AccountLayout from "../../components/AccountLayout";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { formatDateTime } from "../../helper/datetime";
import { FiClock, FiCalendar, FiList, FiInfo, FiPlay, FiRepeat } from "react-icons/fi";

const ExamInstructions = () => {
  useRedirectLoggedOutUser("/login");
  const [startDateString, setStartDate] = useState(null);
  const [endDateString, setEndDateString] = useState(null);
  const [confirmStart, setConfirmStart] = useState(false);
  const [resumeActive, setResumeActive] = useState(false);
  const [usage, setUsage] = useState(null); // server-truth { used, maxTry }
  const { singleExam, isLoading } = useSelector((state) => state.quiz);
  const { resultByExam } = useSelector((state) => state.result);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { examId } = useParams();

  useEffect(() => {
    dispatch(getExam(examId));
    dispatch(getResultsByUserByExam(examId));
    // Server-truth: is an attempt already in progress? If so, offer Resume.
    dispatch(getAttemptStatus(examId))
      .unwrap()
      .then((s) => {
        setResumeActive(!!s?.active);
        setUsage({ used: s?.used ?? 0, maxTry: s?.maxTry ?? 0 });
      })
      .catch(() => setResumeActive(false));
  }, [dispatch, examId]);

  useEffect(() => {
    setStartDate(formatDateTime(singleExam?.startDate));
    setEndDateString(formatDateTime(singleExam?.endDate));
  }, [singleExam]);

  if (isLoading || !singleExam) {
    return <Loader />;
  }

  const duration = singleExam.duration || 0;
  const maxTry = usage?.maxTry ?? (singleExam.maxTry || 0);
  // Server-truth used-try count (started attempts OR results, whichever is
  // higher) so we never offer a start the backend will reject. Falls back to the
  // results count until attemptStatus resolves.
  const attempts = usage ? usage.used : resultByExam?.length || 0;
  const triesLeft = maxTry > 0 ? Math.max(0, maxTry - attempts) : null;
  const canStart = maxTry === 0 || attempts < maxTry;

  const startExam = () => {
    if (!user.isVerified) {
      return toast.error("Hesabınız təsdiqlənməyib. Zəhmət olmasa email-i təsdiqləyin");
    }
    if (!canStart) {
      return toast.error("Maksimum cəhd sayına çatmısınız");
    }
    setConfirmStart(true);
  };

  // Anti-cheat exams open in a separate, chromeless window on DESKTOP (no tab
  // strip — stricter than same-tab). But inside an installed PWA or on mobile,
  // window.open pops OUT into an in-app browser / Chrome Custom Tab (showing the
  // URL bar, leaving the app), so there we navigate in place and stay in the
  // standalone app — fullscreen + anti-cheat still apply.
  const launchExam = () => {
    setConfirmStart(false);
    const url = `/exam/${singleExam._id}/start`;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    const mobile = /android|iphone|ipad|ipod|mobile/i.test(window.navigator.userAgent);
    if (singleExam?.antiCheat && !standalone && !mobile) {
      const w = window.open(
        url,
        "examWindow",
        `popup=yes,toolbar=no,menubar=no,location=no,status=no,width=${window.screen.availWidth},height=${window.screen.availHeight},left=0,top=0`
      );
      if (w) {
        w.focus();
        toast.info("İmtahan ayrıca pəncərədə açıldı.");
        return;
      }
    }
    navigate(url); // PWA / mobile / blocked popup -> stay in the app
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
  if (singleExam.negativeMarking) {
    rules.push(
      `Səhv cavablar balı azaldır: hər ${singleExam.wrongPerPenalty || 3} səhv ${
        singleExam.correctPerPenalty || 1
      } sualın balını aparır (boş suallar cəzalanmır).`
    );
  }
  if (singleExam.antiCheat) {
    rules.push(
      "Anti-cheat aktivdir: imtahan ayrıca pəncərədə və tam ekranda açılır; tab/pəncərə dəyişmə və ya pəncərəni kiçiltmə qeydə alınır."
    );
  }

  return (
    <AccountLayout
      title={singleExam.name}
      subtitle="İmtahana başlamazdan əvvəl təlimatları nəzərdən keçirin."
    >
      <div className="max-w-5xl">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {meta.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-5 shadow-soft"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                  <Icon className="text-[20px]" />
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

        <div className="mt-10">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-text">
            <FiInfo className="text-primary" /> Qaydalar
          </h2>
          <ul className="mt-4 flex max-w-2xl flex-col gap-3">
            {rules.map((r, i) => (
              <li key={i} className="flex gap-3 leading-relaxed text-muted">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10">
          {resumeActive ? (
            <div className="max-w-md space-y-4">
              <div className="flex items-center gap-2.5 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-medium text-text">
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-warning" />
                İmtahanınız davam edir — qaldığınız yerdən davam edin.
              </div>
              <Button onClick={launchExam} size="lg" className="w-full">
                <FiPlay /> İmtahanı davam et
              </Button>
            </div>
          ) : canStart ? (
            <ExamDeadline>
              <Button onClick={startExam} size="lg" className="w-full sm:w-auto">
                <FiPlay /> İmtahanı başlat
                {triesLeft != null ? ` (${triesLeft} cəhd qalıb)` : ""}
              </Button>
            </ExamDeadline>
          ) : (
            <div className="max-w-md rounded-xl border border-line bg-surface2 px-4 py-3 text-center font-medium text-muted">
              Maksimum cəhd sayına çatmısınız
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmStart}
        onClose={() => setConfirmStart(false)}
        onConfirm={launchExam}
        title="İmtahana başlamaq üzrəsiniz"
        confirmLabel="Başla"
        cancelLabel="Geri"
        icon={<FiPlay className="text-[22px]" />}
      >
        <p>
          Düyməni basdığınız anda vaxt <span className="font-semibold text-text">dərhal</span>{" "}
          başlayır və dayandırıla bilməz.
        </p>
        <ul className="mt-3 space-y-1.5 rounded-xl border border-line bg-surface2/40 p-3">
          <li className="flex items-center justify-between">
            <span>Müddət</span>
            <span className="font-semibold text-text">{Math.floor(duration / 60)} dəq</span>
          </li>
          <li className="flex items-center justify-between">
            <span>Sual sayı</span>
            <span className="font-semibold text-text">
              {singleExam.questions?.correctAnswers?.length ?? "—"}
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span>Cəhd</span>
            <span className="font-semibold text-text">
              {maxTry > 0 ? `${attempts + 1} / ${maxTry}` : "Limitsiz"}
            </span>
          </li>
        </ul>
        <p className="mt-3 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-text">
          İmtahan zamanı səhifəni yeniləməyin və ya geri qayıtmayın.
        </p>
      </ConfirmDialog>
    </AccountLayout>
  );
};

export default ExamInstructions;
