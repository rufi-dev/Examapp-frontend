import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiAlertTriangle, FiBookOpen, FiBriefcase, FiMousePointer, FiPlay, FiUserPlus, FiUsers, FiX, FiFileText, FiVideo } from "react-icons/fi";
import { TbDeviceGamepad2 } from "react-icons/tb";
import AccountLayout from "../../components/AccountLayout";
import { listRecordings } from "../../utils/recApi";
import { formatDayTime, readDevice, sourceLabel } from "../../helper/peopleFormat";
import { lasted } from "../../helper/sessionLog";
import CenterLoader from "../../components/ui/CenterLoader";

/*
 * Every kept visit, newest first: who, where they came from, when, how long,
 * the way in and out, and whether anything went wrong, with a button to watch
 * it. Teachers and students are two separate lists (owner, 2026-11-11: "in a
 * different tab, not blended with teachers"); a student's row says whose class
 * they are in. Refreshes itself every few seconds while open, so a visit
 * happening now shows up (marked CANLI) without a reload.
 */

const REFRESH_MS = 10000;

const AUDIENCES = [
  { key: "teachers", label: "Müəllimlər", icon: FiBriefcase },
  { key: "students", label: "Şagirdlər", icon: FiUsers },
];

const SUBTITLE = {
  teachers: "Müəllimlərin saytda etdikləri: hər səhifə, klik və xəta. Bütün müəllimlər yazılır; 3 gün saxlanılır, sonra tam silinir.",
  students: "Şagirdlərin saytda etdikləri: hər səhifə, klik və xəta. İmtahan yazma səhifəsi yazılmır; 3 gün saxlanılır, sonra tam silinir.",
};

const initials = (n) =>
  String(n || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const Stat = ({ icon: Icon, value, tone = "text-muted", title }) => (
  <span className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${tone}`} title={title}>
    <Icon className="text-[12px]" /> {value}
  </span>
);
Stat.propTypes = { icon: PropTypes.elementType, title: PropTypes.string, tone: PropTypes.string, value: PropTypes.node };

export default function SessionList() {
  const [params, setParams] = useSearchParams();
  const who = params.get("who") === "students" ? "students" : "teachers";
  const user = params.get("user") || "";
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setFailed(false);
    const params = {
      who,
      ...(user ? { user } : {}),
    };
    const fetchRows = (first) =>
      listRecordings(params)
        .then((r) => alive && setRows(r))
        .catch(() => alive && first && setFailed(true));
    fetchRows(true);
    // Quietly again every few seconds, but only while this tab is being looked at.
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") fetchRows(false);
    }, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [who, user]);

  // Teachers or students: two lists; switching drops a person filter.
  const setWho = (w) => {
    const next = new URLSearchParams(params);
    next.delete("user");
    if (w === "students") next.set("who", "students");
    else next.delete("who");
    setParams(next, { replace: true });
  };
  const whose = user && rows?.[0]?.user?.name;
  const students = who === "students";

  return (
    <AccountLayout title="Sessiyalar" subtitle={SUBTITLE[who]}>
      <div role="tablist" aria-label="Kimin sessiyaları" className="mb-5 grid max-w-md grid-cols-2 gap-1 rounded-2xl border border-line bg-surface2/60 p-1">
        {AUDIENCES.map((a) => (
          <button
            key={a.key}
            type="button"
            role="tab"
            aria-selected={who === a.key}
            onClick={() => setWho(a.key)}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
              who === a.key ? "bg-surface text-text shadow-soft" : "text-muted hover:text-text"
            }`}
          >
            <a.icon className={who === a.key ? (a.key === "students" ? "text-success" : "text-primary") : ""} /> {a.label}
          </button>
        ))}
      </div>
      {user && (
        <div className="mb-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-3.5 pr-1.5 text-sm text-text">
            {whose || (students ? "Bir şagird" : "Bir müəllim")}
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(params);
                next.delete("user");
                setParams(next, { replace: true });
              }}
              aria-label="Filtri sil"
              className="grid h-6 w-6 place-items-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-text"
            >
              <FiX />
            </button>
          </span>
        </div>
      )}

      {failed ? (
        <p className="rounded-2xl border border-line bg-surface p-8 text-center text-sm text-muted">Sessiyalar yüklənmədi.</p>
      ) : !rows ? (
        <CenterLoader />
      ) : !rows.length ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-surface px-6 py-16 text-center shadow-soft">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <FiVideo className="text-2xl" />
          </span>
          <p className="font-display text-lg font-bold text-text">Hələ sessiya yoxdur</p>
          <p className="max-w-sm text-sm text-muted">
            {students
              ? "Şagird hesabına daxil olub sayta girəndə səfəri burada görünəcək."
              : "Müəllim sayta girəndə səfəri burada görünəcək; qeydiyyat həmin səfərdə olubsa, əvvəlki hissə də daxil."}
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
          {rows.map((r) => {
            const dev = readDevice(r.userAgent);
            const problems = (r.errors || 0) + (r.apiErrors || 0) + (r.toasts || 0);
            return (
              <li key={r._id} className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line/60 px-5 py-4 last:border-0 hover:bg-surface2/40">
                <div className="flex min-w-[14rem] flex-1 items-center gap-3">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display text-[13px] font-bold ${
                      r.user?.role === "student" ? "bg-success/[0.12] text-success" : "bg-blue-500/[0.12] text-blue-600 dark:text-blue-300"
                    }`}
                  >
                    {initials(r.user?.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-text">
                      {r.user?.name || "Silinmiş hesab"}
                      {r.live && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-danger px-1.5 py-0.5 text-[11px] font-bold text-white" title="İndi saytdadır">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> CANLI
                        </span>
                      )}
                      {r.games > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-accent2/[0.15] px-1.5 py-0.5 text-[11px] font-bold text-text" title="AI imtahanı yazarkən gözləmə oyunu oynadı">
                          <TbDeviceGamepad2 className="text-[11px] text-accent2" /> oyun
                        </span>
                      )}
                      {r.registeredInSession && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-success/[0.12] px-1.5 py-0.5 text-[11px] font-bold text-success" title="Bu səfərdə qeydiyyatdan keçib; qeydiyyatdan əvvəlki hissə də yazılıb">
                          <FiUserPlus className="text-[10px]" /> qeydiyyat bu sessiyada
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {r.user?.email}
                      {r.source && <span title="Haradan gəlib"> · {sourceLabel(r.source)}</span>}
                    </p>
                    {/* Whose student: their class and its teacher. */}
                    {r.user?.role === "student" && (
                      <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs text-muted" title="Sinfi və müəllimi">
                        <FiBookOpen className="shrink-0 text-[11px]" />
                        {r.classes?.length
                          ? r.classes.map((c) => [c.className, c.teacherName].filter(Boolean).join(" · ")).join(", ")
                          : "Sinfə qoşulmayıb"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="w-44 shrink-0 text-sm">
                  <p className="text-text">{formatDayTime(r.startedAt)}</p>
                  <p className="text-xs text-muted">
                    {r.durationMs != null ? lasted(r.durationMs) : "—"}
                    {dev && ` · ${dev.browser}${dev.system ? `, ${dev.system}` : ""}`}
                  </p>
                </div>

                <div className="min-w-[12rem] flex-1 font-mono text-[12px] text-muted">
                  <span className="text-text">{r.entry || "?"}</span> → <span className="text-text">{r.exit || "?"}</span>
                  <span className="ml-2 font-sans text-[11px]">({r.pages} səhifə)</span>
                </div>

                <div className="flex items-center gap-3">
                  <Stat icon={FiMousePointer} value={r.clicks} title="Kliklər" />
                  {problems > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-danger/10 px-2 py-1 text-xs font-bold text-danger" title={`${r.errors} xəta · ${r.apiErrors} uğursuz sorğu · ${r.toasts} xəta mesajı`}>
                      <FiAlertTriangle className="text-[12px]" /> {problems} problem
                    </span>
                  ) : (
                    <Stat icon={FiFileText} value="problemsiz" tone="text-success" />
                  )}
                </div>

                <Link
                  to={`/sessiyalar/${r._id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-bold text-primary-fg transition-colors hover:bg-primary-hover"
                >
                  <FiPlay /> {r.live ? "Canlı bax" : "Bax"}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AccountLayout>
  );
}
