import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { getUserById } from "../../../redux/features/auth/authSlice";
import { FiEye, FiClock, FiFileText } from "react-icons/fi";
import { addExamToUserById, getExams } from "../../../redux/features/quiz/quizSlice";
import Loader from "../../components/Loader";
import AccountLayout from "../../components/AccountLayout";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import ProgressChart from "../../components/analytics/ProgressChart";
import { progressSeries } from "../../helper/analytics";

const roleLabels = {
  admin: "Admin",
  teacher: "Müəllim",
  student: "Tələbə",
  suspended: "Bloklanıb",
};

const ExamMini = ({ exam, footer }) => (
  <div className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-soft">
    <h3 className="font-display text-base font-bold text-text">{exam.name}</h3>
    <div className="mt-2 flex flex-col gap-1.5 text-sm text-muted">
      <span className="flex items-center gap-2">
        <FiClock className="text-primary" /> {Math.floor(exam.duration / 60)} dəq{" "}
        {exam.duration % 60} san
      </span>
      <span className="flex items-center gap-2">
        <FiFileText className="text-primary" /> {exam.questions?.length ?? 0} sual
      </span>
    </div>
    {exam.tags?.length > 0 && (
      <div className="mt-3 flex flex-wrap gap-1.5">
        {exam.tags.map((t) => (
          <Badge key={t._id} tone="primary">
            {t.name}
          </Badge>
        ))}
      </div>
    )}
    {footer && <div className="mt-4">{footer}</div>}
  </div>
);

const UserDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { isLoading, userById } = useSelector((state) => state.auth);
  const { exams } = useSelector((state) => state.quiz);
  const quiz = useSelector((state) => state.quiz);

  useEffect(() => {
    dispatch(getUserById(id));
    dispatch(getExams());
  }, [dispatch, id]);

  const addExam = async (e, exam) => {
    e.preventDefault();
    await dispatch(addExamToUserById({ userId: id, examData: { examId: exam._id } }));
    dispatch(getExams());
    dispatch(getUserById(id));
  };

  if (!userById && isLoading) return <Loader />;

  const owned = (examId) => userById?.exams?.some((m) => m._id === examId);

  const uResults = userById?.results || [];
  const uScored = uResults.filter((r) => r?.earnPoints != null).map((r) => r.earnPoints);
  const uAvg = uScored.length
    ? Math.round((uScored.reduce((a, b) => a + b, 0) / uScored.length) * 10) / 10
    : 0;
  const uBest = uScored.length ? Math.max(...uScored) : 0;
  const uSeries = progressSeries(uResults);

  return (
    <AccountLayout title="İstifadəçi məlumatları">
      <div className="flex flex-col items-center gap-6 rounded-3xl border border-line bg-surface p-6 shadow-soft sm:flex-row sm:p-8">
        <img
          src={userById?.photo}
          alt={userById?.name}
          className="h-24 w-24 shrink-0 rounded-full border border-line object-cover"
        />
        <div className="text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
            <h2 className="font-display text-2xl font-bold text-text">{userById?.name}</h2>
            <Badge tone={userById?.role === "admin" ? "primary" : "neutral"}>
              {roleLabels[userById?.role] || userById?.role}
            </Badge>
            {userById?.isVerified ? (
              <Badge tone="success">Təsdiqlənib</Badge>
            ) : (
              <Badge tone="warning">Təsdiqlənməyib</Badge>
            )}
          </div>
          <p className="mt-1.5 text-muted">{userById?.email}</p>
          <p className="text-sm text-muted">{userById?.phone}</p>
          {userById?.bio && <p className="mt-2 text-sm text-muted">{userById.bio}</p>}
        </div>
      </div>

      {uResults.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Cəhd</p>
              <p className="mt-1 font-display text-2xl font-bold text-text">{uResults.length}</p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Orta bal</p>
              <p className="mt-1 font-display text-2xl font-bold text-primary">{uAvg}</p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Ən yüksək</p>
              <p className="mt-1 font-display text-2xl font-bold text-success">{uBest}</p>
            </div>
          </div>
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-soft lg:col-span-2">
            <h3 className="mb-4 font-display text-lg font-bold text-text">İrəliləyiş</h3>
            {uSeries.length >= 2 ? (
              <ProgressChart series={uSeries} />
            ) : (
              <p className="py-8 text-center text-sm text-muted">
                İrəliləyiş qrafiki üçün ən az 2 nəticə lazımdır.
              </p>
            )}
          </div>
        </div>
      )}

      <h3 className="mb-3 mt-8 font-display text-lg font-bold text-text">
        Əldə edilən imtahanlar
      </h3>
      {userById?.exams?.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {userById.exams.map((exam) => (
            <ExamMini key={exam._id} exam={exam} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-muted">
          Hələ imtahan yoxdur.
        </div>
      )}

      {quiz.isLoading ? (
        <Loader />
      ) : (
        <>
          <h3 className="mb-3 mt-8 font-display text-lg font-bold text-text">Nəticələr</h3>
          {userById?.results?.length > 0 ? (
            <div className="scrollbar-thin overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-6 py-4 font-semibold">Cavablanan</th>
                    <th className="px-6 py-4 font-semibold">İmtahan</th>
                    <th className="px-6 py-4 font-semibold">Bal</th>
                    <th className="px-6 py-4 text-right font-semibold">Təhlil</th>
                  </tr>
                </thead>
                <tbody>
                  {userById.results.map((res) => (
                    <tr
                      key={res?._id}
                      className="border-b border-line/60 transition-colors last:border-0 hover:bg-surface2/50"
                    >
                      <td className="px-6 py-4 text-muted">{res?.attempts}</td>
                      <td className="px-6 py-4 text-text">{res?.examId?.name}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary">
                          {res?.earnPoints} bal
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/result/${res._id}/review`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-primary/40 hover:text-primary"
                          aria-label="Təhlil"
                        >
                          <FiEye />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-muted">
              Hələ nəticə yoxdur.
            </div>
          )}

          <h3 className="mb-3 mt-8 font-display text-lg font-bold text-text">Bütün imtahanlar</h3>
          {exams?.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {exams.map((exam) => (
                <ExamMini
                  key={exam._id}
                  exam={exam}
                  footer={
                    owned(exam._id) ? (
                      <Button to={`/exam/details/${exam._id}`} size="sm" className="w-full">
                        İmtahana bax
                      </Button>
                    ) : (
                      <Button
                        onClick={(e) => addExam(e, exam)}
                        size="sm"
                        variant="soft"
                        className="w-full"
                      >
                        İstifadəçiyə əlavə et
                      </Button>
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-muted">
              İmtahan yoxdur.
            </div>
          )}
        </>
      )}
    </AccountLayout>
  );
};

export default UserDetails;
