import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getExams } from "../../../redux/features/quiz/quizSlice";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import AccountLayout from "../../components/AccountLayout";
import CenterLoader from "../../components/ui/CenterLoader";
import { FiClock, FiUsers, FiArrowUpRight, FiBarChart2 } from "react-icons/fi";

// Quick-access list of every exam; each opens its results + analytics page.
const ExamResults = () => {
  useRedirectLoggedOutUser("/login");
  const dispatch = useDispatch();
  const { exams } = useSelector((s) => s.quiz);
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    Promise.resolve(dispatch(getExams())).finally(() => setLoadedOnce(true));
  }, [dispatch]);

  const list = Array.isArray(exams) ? exams : [];

  if (!list.length && !loadedOnce) return <CenterLoader />;

  return (
    <AccountLayout
      title="İmtahan nəticələri"
      subtitle="İmtahan seç — nəticələri və analitikanı aç."
    >
      {list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((exam, i) => (
            <Link
              key={exam._id}
              to={`/exam/${exam._id}/resultsByExam`}
              className="group flex animate-fade-in flex-col rounded-3xl border border-line bg-surface p-6 shadow-soft transition-all duration-200 ease-out-quint hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift"
              style={{ animationDelay: `${Math.min(i * 50, 360)}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                  <FiBarChart2 className="text-[20px]" />
                </span>
                <FiArrowUpRight className="text-xl text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold leading-tight text-text">
                {exam.name}
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <span className="flex items-center gap-1.5">
                  <FiUsers className="text-primary" /> {exam.results?.length || 0} nəticə
                </span>
                <span className="flex items-center gap-1.5">
                  <FiClock className="text-primary" /> {Math.floor((exam.duration || 0) / 60)} dəq
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-line bg-surface p-16 text-center text-muted">
          Hələ imtahan yoxdur.
        </div>
      )}
    </AccountLayout>
  );
};

export default ExamResults;
