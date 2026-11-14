import PropTypes from "prop-types";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { FiArrowDown, FiArrowUp, FiChevronDown, FiChevronLeft, FiChevronRight, FiClock, FiCreditCard, FiFileText, FiMonitor, FiUserCheck } from "react-icons/fi";
import { SOURCES, azDay, daysBetween, dayLabel, fmtDevice, fmtDuration, fmtNum, fmtTime, fmtWhen, sawPlans, sourceLabel, sourceOf } from "./analyticsOps";
import { Toggle } from "./parts";

/*
 * The visits themselves, one row each, newest first (single visits are kept for
 * 7 days; older days live on as the numbers above, and the log says so instead
 * of showing an empty list). A row reads: when, from where and which source,
 * the way through the site, how long; a visit that looked at prices is marked.
 * Open it for everything that was recorded.
 */
const API = `${import.meta.env.VITE_BACKEND_URL}/api/track`;
const LIMIT = 50;

const Field = ({ label, value, mono = false }) => (
  <div className="min-w-0">
    <dt className="text-xs text-muted">{label}</dt>
    <dd className={`mt-0.5 break-words text-sm text-text ${mono ? "font-mono text-[13px]" : ""}`}>{value === undefined || value === null || value === "" ? "Yoxdur" : value}</dd>
  </div>
);
Field.propTypes = { label: PropTypes.string, mono: PropTypes.bool, value: PropTypes.node };

function Detail({ r }) {
  const pages = Array.isArray(r.pages) ? r.pages : [];
  return (
    <div className="mt-3 rounded-xl bg-surface2/60 p-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        {r.registeredUsers?.length > 0 && <Field label="Qeydiyyatlı istifadəçi" value={r.registeredUsers.join(", ")} />}
        <Field label="İlk baxış" value={fmtWhen(r.firstSeen)} />
        <Field label="Son aktivlik" value={fmtWhen(r.lastActivity)} />
        <Field label="Ölkə" value={r.country} />
        <Field label="IP" value={r.ip} mono />
        <Field label="Mənbə" value={r.affiliate} />
        <Field label="Referrer" value={r.referrer} />
        <Field label="Kampaniya (utm)" value={r.campaign} />
        <Field label="Cihaz" value={fmtDevice(r.userAgent)} />
      </dl>
      <p className="mt-4 text-xs text-muted">Gəzdiyi səhifələr ({pages.length})</p>
      {pages.length > 0 && (
        <ol className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-1.5">
          {pages.map((p, i) => (
            <li key={`${i}-${p}`} className="flex items-center gap-1">
              <span className="rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[12px] text-text">{p}</span>
              {i < pages.length - 1 && <FiChevronRight aria-hidden className="text-muted" />}
            </li>
          ))}
        </ol>
      )}
      {r.userAgent && <p className="mt-3 break-all text-xs text-muted">{r.userAgent}</p>}
    </div>
  );
}
Detail.propTypes = { r: PropTypes.object.isRequired };

export default function VisitLog({ range, source, onSource, refreshKey = 0 }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [order, setOrder] = useState("desc");
  const [unique, setUnique] = useState(false);
  const [open, setOpen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Single visits exist for the last 7 days only.
  const keptFrom = azDay(Date.now() - 7 * 864e5);
  const from = range.from < keptFrom ? keptFrom : range.from;
  const covered = range.to >= keptFrom;
  const partly = covered && range.from < keptFrom;

  const load = useCallback(
    async (p) => {
      if (!covered) {
        setRows([]);
        setTotal(0);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const params = { page: p, limit: LIMIT, order, from, to: range.to };
        if (source) params.source = source;
        if (unique) params.unique = 1;
        const { data } = await axios.get(API, { params });
        setRows(data?.rows || []);
        setTotal(data?.total || 0);
        setPage(data?.page || p);
        setOpen(null);
      } catch (e) {
        setError(e?.response?.data?.message || "Ziyarətlər yüklənmədi.");
      } finally {
        setLoading(false);
      }
    },
    [covered, order, from, range.to, source, unique]
  );
  useEffect(() => {
    load(1);
  }, [load, refreshKey]);

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Mənbə" className="flex flex-wrap gap-1.5">
          {[{ key: "", label: "Hamısı" }, ...SOURCES.filter((s) => s.key !== "other")].map((s) => (
            <button
              key={s.key || "all"}
              type="button"
              onClick={() => onSource(s.key)}
              aria-pressed={(source || "") === s.key}
              className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-bold transition-colors ${
                (source || "") === s.key ? "bg-text text-bg" : "border border-line bg-surface text-muted hover:bg-surface2 hover:text-text"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span aria-hidden className="mx-1 hidden h-5 w-px bg-line sm:block" />
        <Toggle on={unique} onChange={setUnique}>
          Hər IP bir dəfə
        </Toggle>
        <button
          type="button"
          onClick={() => setOrder((o) => (o === "desc" ? "asc" : "desc"))}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-bold text-muted transition-colors hover:bg-surface2 hover:text-text"
        >
          {order === "desc" ? <FiArrowDown aria-hidden /> : <FiArrowUp aria-hidden />}
          {order === "desc" ? "Ən son əvvəl" : "Ən köhnə əvvəl"}
        </button>
        <span className="ml-auto text-sm tabular-nums text-muted">
          {fmtNum(total)} {unique ? "IP" : "ziyarət"}
        </span>
      </div>

      {(partly || !covered) && (
        <p className="mb-3 flex items-start gap-2 rounded-xl bg-surface2/70 px-3 py-2.5 text-sm text-muted">
          <FiClock aria-hidden className="mt-0.5 shrink-0" />
          {covered
            ? `Tək-tək ziyarətlər 7 gün saxlanır: siyahı ${dayLabel(from)} tarixindən başlayır. Daha köhnə günlər yuxarıdakı rəqəmlərdədir.`
            : `Tək-tək ziyarətlər 7 gün saxlanır; bu dövrün (${daysBetween(range.from, range.to)} gün) rəqəmləri yuxarıdadır.`}
        </p>
      )}
      {error && <p className="mb-3 rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger">{error}</p>}

      {covered &&
        (loading && !rows.length ? (
          <div aria-busy="true" aria-label="Yüklənir" className="h-48 animate-pulse rounded-2xl border border-line bg-surface" />
        ) : !rows.length ? (
          <p className="rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center text-sm text-muted">Bu dövrdə ziyarət yoxdur.</p>
        ) : (
          <ul aria-label="Ziyarətlər" className={`divide-y divide-line/70 overflow-hidden rounded-2xl border border-line bg-surface ${loading ? "opacity-60" : ""}`}>
            {rows.map((r) => {
              const isOpen = open === r.sessionId;
              const pagesList = Array.isArray(r.pages) ? r.pages : [];
              const src = sourceOf(r);
              const plans = sawPlans(pagesList);
              const day = azDay(r.lastActivity);
              return (
                <li key={r.sessionId} className={plans ? "bg-warning/[0.08]" : ""}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : r.sessionId)}
                    aria-expanded={isOpen}
                    className="grid w-full grid-cols-1 gap-x-5 gap-y-1.5 px-4 py-3 text-left transition-colors hover:bg-surface2/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-ring/30 sm:px-5 lg:grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,1.6fr)_7.5rem_1.25rem] lg:items-center"
                  >
                    <span className="flex items-baseline gap-2 lg:block">
                      <span className="font-semibold tabular-nums text-text">{fmtTime(r.lastActivity)}</span>
                      <span className="text-xs text-muted lg:block">{day === azDay() ? "bu gün" : dayLabel(day)}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-text">{r.country || "Ölkə bilinmir"}</span>
                        <span className="rounded-md bg-surface2 px-1.5 py-0.5 text-[11px] font-bold text-muted">{sourceLabel(src)}</span>
                        {r.registeredUsers?.length > 0 && (
                          <span title={r.registeredUsers.join(", ")} className="inline-flex items-center gap-1 rounded-md bg-success/[0.12] px-1.5 py-0.5 text-[11px] font-bold text-success">
                            <FiUserCheck aria-hidden /> {r.registeredUsers[0]}
                            {r.registeredUsers.length > 1 ? ` +${r.registeredUsers.length - 1}` : ""}
                          </span>
                        )}
                        {plans && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-warning/25 px-1.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-200">
                            <FiCreditCard aria-hidden /> Ödənişə baxıb
                          </span>
                        )}
                      </span>
                      <span className="block truncate font-mono text-xs text-muted">{r.ip || ""}</span>
                    </span>
                    <span className="block min-w-0 truncate text-sm text-text" title={pagesList.join(" › ")}>
                      {pagesList.length ? (
                        <>
                          {pagesList[0]}
                          {pagesList.length > 2 && <span className="text-muted"> › … › </span>}
                          {pagesList.length === 2 && <span className="text-muted"> › </span>}
                          {pagesList.length > 1 && pagesList[pagesList.length - 1]}
                        </>
                      ) : (
                        <span className="text-muted">{r.landing || "Səhifə yazılmayıb"}</span>
                      )}
                    </span>
                    <span className="flex items-center gap-3 text-xs tabular-nums text-muted lg:justify-end">
                      <span className="inline-flex items-center gap-1" title="Səhifə">
                        <FiFileText aria-hidden /> {r.pageViews || 0}
                      </span>
                      <span className="inline-flex items-center gap-1" title="Saytda vaxt">
                        <FiClock aria-hidden /> {fmtDuration(r.durationSeconds)}
                      </span>
                      <span className="inline-flex items-center gap-1 lg:hidden">
                        <FiMonitor aria-hidden /> {fmtDevice(r.userAgent)}
                      </span>
                    </span>
                    <FiChevronDown aria-hidden className={`hidden text-muted transition-transform lg:block ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5">
                      <Detail r={r} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ))}

      {covered && total > LIMIT && (
        <nav aria-label="Səhifələr" className="mt-3 flex items-center justify-center gap-3">
          <button type="button" disabled={page <= 1 || loading} onClick={() => load(page - 1)} className="inline-flex h-10 items-center gap-1 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-text hover:bg-surface2 disabled:opacity-40">
            <FiChevronLeft aria-hidden /> Əvvəlki
          </button>
          <span className="text-sm tabular-nums text-muted">
            {page} / {pages}
          </span>
          <button type="button" disabled={page >= pages || loading} onClick={() => load(page + 1)} className="inline-flex h-10 items-center gap-1 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-text hover:bg-surface2 disabled:opacity-40">
            Növbəti <FiChevronRight aria-hidden />
          </button>
        </nav>
      )}
    </div>
  );
}

VisitLog.propTypes = {
  onSource: PropTypes.func.isRequired,
  range: PropTypes.shape({ from: PropTypes.string, to: PropTypes.string }).isRequired,
  refreshKey: PropTypes.number,
  source: PropTypes.string,
};
