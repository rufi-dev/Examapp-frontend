import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import axios from "axios";
import useRedirectLoggedOutUser from "../customHook/useRedirectLoggedOutUser";
import { getUser } from "../../redux/features/auth/authSlice";
import { getExamsByUser } from "../../redux/features/quiz/quizSlice";
import { getResultsByUser } from "../../redux/features/quiz/resultSlice";
import AccountLayout from "../components/AccountLayout";
import Spinner from "../components/Spinner";
import Button from "../components/ui/Button";
import { FiEye, FiBookOpen, FiArrowRight, FiPlus } from "react-icons/fi";
import ExamCard from "../components/ExamCard";

const API = `${import.meta.env.VITE_BACKEND_URL}/api/quiz`;

const Overview = () => {
  useRedirectLoggedOutUser("/login");
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { result } = useSelector((s) => s.result);
  const [latest, setLatest] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      dispatch(getUser()),
      dispatch(getExamsByUser()),
      dispatch(getResultsByUser()),
      axios
        .get(`${API}/getLatestExams`)
        .then((r) => active && setLatest(Array.isArray(r.data) ? r.data : []))
        .catch(() => {}),
    ]).finally(() => {
      if (active) setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [dispatch]);

  // Re-fetch the latest-exams list after an owner hides/deletes one from a card.
  const loadLatest = () =>
    axios
      .get(`${API}/getLatestExams`)
      .then((r) => setLatest(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});

  const results = result || [];
  const recent = [...results].slice(-5).reverse();
  const firstName = user?.name?.split(" ")[0] || "";
  // Teachers/admins create exams; students browse them — drives the quick link.
  const isStaff = user?.role === "admin" || user?.role === "teacher";

  if (!loaded) {
    return (
      <AccountLayout title="İcmal" subtitle="Hesabının icmalı və son fəaliyyətin.">
        <div className="flex justify-center py-24">
          <Spinner size={44} className="text-primary" />
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout
      title={`Salam, ${firstName} 👋`}
      subtitle="Hesabının icmalı və ən son imtahanlar."
    >
      {/* Latest exams — the dashboard shortcut to a just-published exam. */}
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-text">Son əlavə olunan imtahanlar</h2>
            <p className="text-sm text-muted">Yeni imtahanı tez tap və başla.</p>
          </div>
          <Link to="/classes" className="shrink-0 text-sm font-semibold text-primary hover:underline">
            Hamısı
          </Link>
        </div>

        {latest.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-surface p-10 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary">
              <FiBookOpen className="text-[22px]" />
            </span>
            <p className="mt-3 font-display text-lg font-bold text-text">Hələ imtahan yoxdur</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              Sinifə qoşul və ya siniflərdən imtahanlara bax.
            </p>
            <Button to="/classes" className="mt-5">
              İmtahanlara bax <FiArrowRight />
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {latest.map((exam) => (
              <ExamCard key={exam._id} exam={exam} onChanged={loadLatest} />
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-line bg-surface p-6 shadow-soft">
          <div>
            <h3 className="font-display text-lg font-bold text-text">
              {isStaff ? "İmtahan əlavə et" : "İmtahanlara bax"}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {isStaff ? "Sinif seç və yeni imtahan yarat." : "Siniflərdən sınaq seç və başla."}
            </p>
          </div>
          <Button to="/classes" size="sm">
            {isStaff ? (
              <>
                <FiPlus /> Əlavə et
              </>
            ) : (
              <>
                <FiBookOpen /> Bax
              </>
            )}
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

      {/* Recent results */}
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
                        {res.earnPoints != null ? `${res.earnPoints} bal` : "Qəbul edildi"}
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
            <Button to="/classes" className="mt-6">
              İmtahanlara bax
            </Button>
          </div>
        )}
      </div>
    </AccountLayout>
  );
};

export default Overview;
