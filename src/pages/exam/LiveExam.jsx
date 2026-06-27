import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FiUsers, FiAlertTriangle, FiClock, FiCheckCircle } from "react-icons/fi";
import AccountLayout from "../../components/AccountLayout";
import CenterLoader from "../../components/ui/CenterLoader";
import { getLiveAttempts } from "../../../redux/features/quiz/quizService";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";

const pad = (n) => String(n).padStart(2, "0");
const fmtClock = (ms) => {
  let s = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

const LiveExam = () => {
  useRedirectLoggedOutUser("/login");
  const { examId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let on = true;
    const load = async () => {
      try {
        const d = await getLiveAttempts(examId);
        if (on) {
          setData(d);
          setErr("");
        }
      } catch (e) {
        if (on) setErr(e?.response?.data?.message || "Yüklənmədi");
      } finally {
        if (on) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 5000); // auto-refresh
    return () => {
      on = false;
      clearInterval(id);
    };
  }, [examId]);

  // 1s tick so the countdown moves between polls.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const students = data?.students || [];
  const total = data?.total || 0;
  const activeCount = data?.activeCount || 0;

  return (
    <AccountLayout
      title="Canlı izləmə"
      subtitle={data?.examName || "İmtahanı real vaxtda izlə"}
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-success/12 px-3 py-1.5 text-sm font-semibold text-success">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
          </span>
          {activeCount} aktiv yazır
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-muted">
          <FiUsers /> {students.length} sessiya
        </span>
        <span className="text-xs text-muted">Hər 5 saniyədə yenilənir</span>
      </div>

      {loading ? (
        <CenterLoader className="mt-10" />
      ) : err ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/8 p-8 text-center text-sm font-semibold text-danger">
          {err}
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-surface p-16 text-center text-muted">
          Hazırda bu imtahanı yazan yoxdur.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {students.map((s) => {
            const remaining = s.expiresAt ? new Date(s.expiresAt).getTime() - now : 0;
            const pct = total > 0 ? Math.round((s.answeredCount / total) * 100) : 0;
            const stale = !s.active;
            return (
              <div
                key={s.attemptId}
                className={`rounded-2xl border bg-surface p-4 shadow-soft transition-colors ${
                  s.terminated ? "border-danger/40" : stale ? "border-line" : "border-success/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-bold text-text">{s.name}</p>
                    {s.grade && <p className="text-xs text-muted">{s.grade}</p>}
                  </div>
                  {s.terminated ? (
                    <span className="shrink-0 rounded-full bg-danger/12 px-2.5 py-0.5 text-xs font-bold text-danger">
                      Dayandırıldı
                    </span>
                  ) : (
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        stale ? "bg-surface2 text-muted" : "bg-success/12 text-success"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${stale ? "bg-muted" : "bg-success"}`} />
                      {stale ? "Boşdadır" : "Aktiv"}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Hazırda
                    </p>
                    <p className="font-display text-2xl font-extrabold leading-none text-text">
                      Sual {s.currentQuestion || "—"}
                      <span className="text-base font-bold text-muted">/{total}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="inline-flex items-center gap-1 text-sm font-bold tabular-nums text-text">
                      <FiClock className="text-muted" /> {fmtClock(remaining)}
                    </p>
                    <p className="text-[11px] text-muted">qalan vaxt</p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <FiCheckCircle className="text-success" /> {s.answeredCount} cavablanıb
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface2">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {s.violations > 0 && (
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-warning/12 px-2.5 py-1 text-xs font-semibold text-warning">
                    <FiAlertTriangle /> {s.violations} pozuntu
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AccountLayout>
  );
};

export default LiveExam;
