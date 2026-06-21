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
  FiClock,
  FiFileText,
  FiCalendar,
} from "react-icons/fi";

const API = `${import.meta.env.VITE_BACKEND_URL}/api/quiz`;

const fmtDate = (d) => {
  if (!d) return "";
  const x = new Date(d);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(x.getDate())}.${p(x.getMonth() + 1)}.${x.getFullYear()}`;
};

// Active / ended / upcoming pill for an exam.
const statusInfo = (exam, now) => {
  const s = exam.startDate ? new Date(exam.startDate).getTime() : null;
  const e = exam.endDate ? new Date(exam.endDate).getTime() : null;
  if (s && now < s) return { label: "Gələcək", cls: "bg-warning/15 text-warning" };
  if (e && now > e) return { label: "Bitib", cls: "bg-danger/15 text-danger" };
  return { label: "Aktiv", cls: "bg-success/15 text-success" };
};

const Overview = () => {
  useRedirectLoggedOutUser("/login");
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { myExams } = useSelector((s) => s.quiz);
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

  const results = result || [];
  const examsCount = myExams?.length || 0;
  const resultsCount = results.length;
  const scored = results.filter((r) => r.earnPoints != null);
  const avg = scored.length
    ? Math.round(scored.reduce((a, r) => a + r.earnPoints, 0) / scored.length)
    : 0;
  const best = scored.length ? Math.max(...scored.map((r) => r.earnPoints)) : 0;
  const recent = [...results].slice(-5).reverse();
  const firstName = user?.name?.split(" ")[0] || "";
  const now = Date.now();
  const isNew = (d) => d && now - new Date(d).getTime() < 3 * 24 * 60 * 60 * 1000;

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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <InfoBox icon={<FiAward />} title="İmtahanlarım" count={examsCount} tone="primary" />
        <InfoBox icon={<FiBarChart2 />} title="Cəhdlər" count={resultsCount} tone="success" />
        <InfoBox icon={<FiTrendingUp />} title="Orta bal" count={avg} tone="muted" />
        <InfoBox icon={<FiTarget />} title="Ən yüksək" count={best} tone="primary" />
      </div>

      {/* Latest exams — the dashboard shortcut to a just-published exam. */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-text">Son əlavə olunan imtahanlar</h2>
            <p className="text-sm text-muted">Yeni imtahanı tez tap və başla.</p>
          </div>
          <Link to="/tags" className="shrink-0 text-sm font-semibold text-primary hover:underline">
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
              Sinifə qoşul və ya kateqoriyalardan imtahanlara bax.
            </p>
            <Button to="/tags" className="mt-5">
              İmtahanlara bax <FiArrowRight />
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {latest.map((exam) => {
              const st = statusInfo(exam, now);
              const category =
                exam.class?.name ||
                (exam.class?.level != null ? `${exam.class.level} sinif` : null);
              return (
                <Link
                  key={exam._id}
                  to={`/exam/details/${exam._id}`}
                  className="group flex flex-col rounded-3xl border border-line bg-surface p-5 shadow-soft transition-all duration-200 ease-out-quint hover:-translate-y-1 hover:shadow-lift"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/12 text-primary ring-1 ring-inset ring-primary/15">
                      <FiFileText className="text-[21px]" />
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isNew(exam.createdAt) && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary-fg">
                          Yeni
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                  </div>

                  <h3 className="mt-3.5 line-clamp-2 font-display text-base font-bold leading-tight text-text">
                    {exam.name}
                  </h3>
                  {category && <p className="mt-1 text-xs text-muted">{category}</p>}

                  <div className="mt-4 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-xl border border-line bg-surface2/40 text-center">
                    <div className="py-2">
                      <p className="font-display text-base font-bold text-primary">
                        {exam.questionCount ?? "—"}
                      </p>
                      <p className="text-[10px] text-muted">Sual</p>
                    </div>
                    <div className="py-2">
                      <p className="font-display text-base font-bold text-success">
                        {Math.round((exam.duration || 0) / 60)}
                      </p>
                      <p className="text-[10px] text-muted">Dəq</p>
                    </div>
                    <div className="py-2">
                      <p className="font-display text-base font-bold text-accent2">
                        {exam.totalMarks ?? "—"}
                      </p>
                      <p className="text-[10px] text-muted">Bal</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      {exam.endDate ? (
                        <>
                          <FiCalendar /> {fmtDate(exam.endDate)}
                        </>
                      ) : (
                        <>
                          <FiClock /> Həmişə aktiv
                        </>
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-primary transition-transform group-hover:translate-x-0.5">
                      Aç <FiArrowRight />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-line bg-surface p-6 shadow-soft">
          <div>
            <h3 className="font-display text-lg font-bold text-text">İmtahanlara bax</h3>
            <p className="mt-1 text-sm text-muted">Kateqoriyalardan sınaq seç və başla.</p>
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
