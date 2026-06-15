import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import useRedirectLoggedOutUser from "../customHook/useRedirectLoggedOutUser";
import { getUser } from "../../redux/features/auth/authSlice";
import { getExamsByUser } from "../../redux/features/quiz/quizSlice";
import { getResultsByUser } from "../../redux/features/quiz/resultSlice";
import AccountLayout from "../components/AccountLayout";
import InfoBox from "../components/InfoBox";
import Button from "../components/ui/Button";
import {
  FiAward,
  FiBarChart2,
  FiTrendingUp,
  FiTarget,
  FiEye,
  FiBookOpen,
  FiArrowRight,
} from "react-icons/fi";

const Overview = () => {
  useRedirectLoggedOutUser("/login");
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { myExams } = useSelector((s) => s.quiz);
  const { result } = useSelector((s) => s.result);

  useEffect(() => {
    dispatch(getUser());
    dispatch(getExamsByUser());
    dispatch(getResultsByUser());
  }, [dispatch]);

  const results = result || [];
  const examsCount = myExams?.length || 0;
  const resultsCount = results.length;
  const avg = resultsCount
    ? Math.round(results.reduce((a, r) => a + (r.earnPoints || 0), 0) / resultsCount)
    : 0;
  const best = resultsCount ? Math.max(...results.map((r) => r.earnPoints || 0)) : 0;
  const recent = [...results].slice(-5).reverse();

  const firstName = user?.name?.split(" ")[0] || "";

  return (
    <AccountLayout
      title={`Salam, ${firstName} 👋`}
      subtitle="Hesabının icmalı və son fəaliyyətin."
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <InfoBox icon={<FiAward />} title="İmtahanlarım" count={examsCount} tone="primary" />
        <InfoBox icon={<FiBarChart2 />} title="Cəhdlər" count={resultsCount} tone="success" />
        <InfoBox icon={<FiTrendingUp />} title="Orta bal" count={avg} tone="muted" />
        <InfoBox icon={<FiTarget />} title="Ən yüksək" count={best} tone="primary" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-line bg-surface p-6 shadow-soft">
          <div>
            <h3 className="font-display text-lg font-bold text-text">İmtahanlara bax</h3>
            <p className="mt-1 text-sm text-muted">Yeni sınaq imtahanı seç və başla.</p>
          </div>
          <Button to="/tags" size="sm">
            <FiBookOpen /> Bax
          </Button>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-line bg-surface p-6 shadow-soft">
          <div>
            <h3 className="font-display text-lg font-bold text-text">İmtahanlarım</h3>
            <p className="mt-1 text-sm text-muted">Əldə etdiyin imtahanları gör.</p>
          </div>
          <Button to="/myExams" size="sm" variant="soft">
            <FiArrowRight /> Aç
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-text">Son nəticələr</h2>
          {recent.length > 0 && (
            <Link to="/myResults" className="text-sm font-medium text-primary hover:underline">
              Hamısı
            </Link>
          )}
        </div>

        {recent.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
            <table className="min-w-full text-sm">
              <tbody>
                {recent.map((res) => (
                  <tr
                    key={res._id}
                    className="border-b border-line/60 transition-colors last:border-0 hover:bg-surface2/50"
                  >
                    <td className="px-6 py-4 font-medium text-text">
                      {res.examId?.name || "İmtahan"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary">
                        {res.earnPoints} bal
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
          <div className="rounded-3xl border border-dashed border-line bg-surface p-12 text-center">
            <p className="font-display text-lg font-bold text-text">Hələ nəticə yoxdur</p>
            <p className="mx-auto mt-2 max-w-sm text-muted">
              İlk sınaq imtahanını həll et və nəticən burada görünsün.
            </p>
            <Button to="/tags" className="mt-6">
              İmtahanlara bax
            </Button>
          </div>
        )}
      </div>
    </AccountLayout>
  );
};

export default Overview;
