import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiCpu,
  FiDatabase,
  FiGlobe,
  FiHardDrive,
  FiLink2,
  FiRefreshCw,
  FiServer,
  FiShield,
  FiTrendingUp,
  FiUploadCloud,
  FiXCircle,
  FiZap,
} from "react-icons/fi";
import AccountLayout from "../../components/AccountLayout";
import Badge from "../../components/ui/Badge";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { selectUser } from "../../../redux/features/auth/authSlice";

const API = `${import.meta.env.VITE_BACKEND_URL}/api/health`;

/* ------------------------------ formatters ------------------------------ */

const fmtBytes = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return "—";
  if (v >= 1024 ** 3) return `${(v / 1024 ** 3).toFixed(1)} GB`;
  if (v >= 1024 ** 2) return `${(v / 1024 ** 2).toFixed(1)} MB`;
  if (v >= 1024) return `${(v / 1024).toFixed(0)} KB`;
  return `${v} B`;
};
const fmtMs = (n) => (Number.isFinite(Number(n)) ? `${Math.round(n)}ms` : "—");
const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
};
const fmtTime = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleTimeString();
  } catch {
    return "—";
  }
};
// 93784s -> "1 gün 2 saat", 7384s -> "2 saat 3 dəq"
const fmtDuration = (sec) => {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} gün ${h} saat`;
  if (h > 0) return `${h} saat ${m} dəq`;
  if (m > 0) return `${m} dəq`;
  return `${s} san`;
};
const fmtInterval = (ms) => {
  const m = Math.round((Number(ms) || 0) / 60000);
  if (m >= 60) return `${Math.round(m / 60)} saat`;
  if (m >= 1) return `${m} dəq`;
  return `${Math.round((Number(ms) || 0) / 1000)} san`;
};

/* ------------------------------ status maps ----------------------------- */

const OVERALL = {
  healthy: {
    label: "Examopia sağlamdır",
    sub: "Bütün yoxlamalar normaldır.",
    icon: FiCheckCircle,
    chip: "bg-success/12 text-success",
    ring: "border-success/40",
  },
  warning: {
    label: "Examopia-da xəbərdarlıqlar var",
    sub: "Sistem işləyir, amma diqqət tələb edən məsələlər var.",
    icon: FiAlertTriangle,
    chip: "bg-warning/12 text-warning",
    ring: "border-warning/40",
  },
  critical: {
    label: "Examopia kritik vəziyyətdədir",
    sub: "İstifadəçilər təsirlənməmiş problemləri dərhal yoxlayın.",
    icon: FiAlertTriangle,
    chip: "bg-danger/12 text-danger",
    ring: "border-danger/50",
  },
  down: {
    label: "Examopia işləmir",
    sub: "Əsas servislərdən biri əlçatmazdır.",
    icon: FiXCircle,
    chip: "bg-danger/12 text-danger",
    ring: "border-danger/60",
  },
};

const sevTone = (s) =>
  s === "down" || s === "critical"
    ? "bg-danger/12 text-danger"
    : s === "warning"
    ? "bg-warning/12 text-warning"
    : "bg-primary/12 text-primary";
const sevLabel = { down: "Dayanıb", critical: "Kritik", warning: "Xəbərdarlıq", info: "Məlumat" };

const scoreLabel = (n) =>
  n >= 90 ? "Əla" : n >= 75 ? "Yaxşı" : n >= 50 ? "Xəbərdarlıq" : n >= 25 ? "Kritik" : "Ağır vəziyyət";
const scoreColor = (n) => (n >= 75 ? "text-success" : n >= 50 ? "text-warning" : "text-danger");

/* ----------------------------- tiny components -------------------------- */

const Dot = ({ ok, warn }) => (
  <span
    className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
      ok === true ? "bg-success" : ok === false ? "bg-danger" : warn ? "bg-warning" : "bg-muted/40"
    }`}
  />
);

const StatusPill = ({ ok, okText = "İşləyir", failText = "Xəta", unknownText = "—" }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      ok === true
        ? "bg-success/12 text-success"
        : ok === false
        ? "bg-danger/12 text-danger"
        : "bg-surface2 text-muted"
    }`}
  >
    <Dot ok={ok} /> {ok === true ? okText : ok === false ? failText : unknownText}
  </span>
);

// Percentage bar with warning/critical coloring.
const MeterBar = ({ pct, warn = 75, crit = 90 }) => {
  const v = Math.max(0, Math.min(100, Number(pct) || 0));
  const tone = v >= crit ? "bg-danger" : v >= warn ? "bg-warning" : "bg-success";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
      <div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${v}%` }} />
    </div>
  );
};

// Resource summary card: icon + % + bar + detail line.
const MeterCard = ({ icon: Icon, title, pct, detail, warn, crit }) => (
  <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-sm font-medium text-muted">
        <Icon className="text-[16px]" /> {title}
      </span>
      <span
        className={`font-display text-lg font-bold tabular-nums ${
          pct == null
            ? "text-muted"
            : pct >= (crit ?? 90)
            ? "text-danger"
            : pct >= (warn ?? 75)
            ? "text-warning"
            : "text-text"
        }`}
      >
        {pct == null ? "—" : `${pct}%`}
      </span>
    </div>
    <div className="mt-2.5">
      <MeterBar pct={pct ?? 0} warn={warn} crit={crit} />
    </div>
    {detail && <p className="mt-2 truncate text-xs text-muted">{detail}</p>}
  </div>
);

const Section = ({ icon: Icon, title, right, children }) => (
  <section className="mt-8">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 font-display text-base font-bold text-text">
        {Icon && <Icon className="text-primary" />} {title}
      </h3>
      {right}
    </div>
    {children}
  </section>
);

const Table = ({ head, children }) => (
  <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft scrollbar-thin">
    <table className="min-w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
          {head.map((h, i) => (
            <th key={i} className={`px-4 py-3 font-semibold ${h.right ? "text-right" : ""}`}>
              {h.label ?? h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

const Tr = ({ children }) => (
  <tr className="border-b border-line/60 transition-colors last:border-0 hover:bg-surface2/50">{children}</tr>
);

// Uptime strip: one colored block per (aggregated) sample.
const HistoryStrip = ({ rows }) => {
  if (!rows?.length)
    return <p className="py-4 text-center text-sm text-muted">Hələ tarixçə yoxdur — hər 5 dəqiqədən bir toplanır.</p>;
  // Aggregate down to ≤ 150 blocks; a block is as bad as its worst sample.
  const target = 150;
  const per = Math.max(1, Math.ceil(rows.length / target));
  const blocks = [];
  for (let i = 0; i < rows.length; i += per) {
    const chunk = rows.slice(i, i + per);
    const worst = chunk.reduce(
      (acc, r) =>
        r.status === "down" || !r.siteUp || !r.dbUp
          ? "down"
          : r.status === "critical" && acc !== "down"
          ? "critical"
          : r.status === "warning" && acc === "ok"
          ? "warning"
          : acc,
      "ok"
    );
    blocks.push({ worst, from: chunk[0].at, to: chunk[chunk.length - 1].at });
  }
  const tone = { ok: "bg-success/70", warning: "bg-warning", critical: "bg-danger/80", down: "bg-danger" };
  return (
    <div>
      <div className="flex h-8 items-stretch gap-px overflow-hidden rounded-lg">
        {blocks.map((b, i) => (
          <div
            key={i}
            className={`min-w-[3px] flex-1 ${tone[b.worst]}`}
            title={`${fmtDate(b.from)}${per > 1 ? ` – ${fmtTime(b.to)}` : ""}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted">
        <span>{fmtDate(rows[0].at)}</span>
        <span>{fmtDate(rows[rows.length - 1].at)}</span>
      </div>
    </div>
  );
};

// Per-minute request volume bars (last hour), errors highlighted.
const MinuteBars = ({ points }) => {
  const max = Math.max(1, ...(points || []).map((p) => p.count));
  return (
    <div className="flex h-24 items-end gap-[2px]">
      {(points || []).map((p, i) => (
        <div
          key={i}
          className={`min-w-[2px] flex-1 rounded-t-sm ${
            p.err5 > 0 ? "bg-danger" : p.err4 > 0 ? "bg-warning/80" : "bg-primary/60"
          }`}
          style={{ height: `${Math.max(p.count > 0 ? 6 : 1, (p.count / max) * 100)}%` }}
          title={`${fmtTime(p.t)} · ${p.count} sorğu · orta ${p.avgMs}ms${p.err5 ? ` · ${p.err5}×5xx` : ""}${
            p.err4 ? ` · ${p.err4}×4xx` : ""
          }`}
        />
      ))}
    </div>
  );
};

const StatTile = ({ label, value, sub, tone = "text-text" }) => (
  <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
    <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
    <p className={`mt-1 font-display text-xl font-bold tabular-nums ${tone}`}>{value}</p>
    {sub && <p className="mt-0.5 truncate text-xs text-muted">{sub}</p>}
  </div>
);

/* --------------------------------- page --------------------------------- */

const HISTORY_RANGES = [
  { hours: 24, label: "24 saat" },
  { hours: 168, label: "7 gün" },
  { hours: 720, label: "30 gün" },
];

const HealthDashboard = () => {
  useRedirectLoggedOutUser("/login");
  const user = useSelector(selectUser);
  const isAdmin = user?.role === "admin";

  const [data, setData] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyHours, setHistoryHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [auto, setAuto] = useState(true);
  const autoRef = useRef(null);

  const load = useCallback(async (opts = {}) => {
    const { silent = false, fresh = false } = opts;
    if (!silent) setRefreshing(true);
    try {
      const res = await axios.get(`${API}${fresh ? "?fresh=1" : ""}`);
      setData(res.data);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Sağlamlıq məlumatı yüklənmədi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadHistory = useCallback(async (hours) => {
    try {
      const res = await axios.get(`${API}/history?hours=${hours}`);
      setHistory(res.data);
    } catch {
      setHistory(null);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    load();
    loadHistory(historyHours);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) loadHistory(historyHours);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyHours]);

  // Auto-refresh every 30s (backend caches ~20s, so this is cheap).
  useEffect(() => {
    if (!isAdmin || !auto) return undefined;
    autoRef.current = setInterval(() => load({ silent: true }), 30 * 1000);
    return () => clearInterval(autoRef.current);
  }, [isAdmin, auto, load]);

  if (!isAdmin) {
    return (
      <AccountLayout title="Sistem sağlamlığı" subtitle="Yalnız adminlər üçün.">
        <div className="rounded-3xl border border-dashed border-line bg-surface p-16 text-center text-muted">
          Bu səhifəyə yalnız adminlərin girişi var.
        </div>
      </AccountLayout>
    );
  }

  if (loading) {
    return (
      <AccountLayout title="Sistem sağlamlığı" subtitle="Yüklənir...">
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-3xl border border-line bg-surface" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, k) => (
              <div key={k} className="h-24 animate-pulse rounded-2xl border border-line bg-surface" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-3xl border border-line bg-surface" />
        </div>
      </AccountLayout>
    );
  }

  if (!data) {
    return (
      <AccountLayout title="Sistem sağlamlığı" subtitle="Platformanın texniki vəziyyəti.">
        <div className="mx-auto mt-10 max-w-md rounded-3xl border border-dashed border-danger/40 bg-surface p-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger/12 text-danger">
            <FiActivity className="text-2xl" />
          </span>
          <h3 className="mt-4 font-display text-lg font-bold text-text">Yüklənmədi</h3>
          <p className="mt-1.5 text-sm text-muted">
            {error || "Sağlamlıq API-ə çatmaq mümkün olmadı."} Server tamamilə dayanıbsa, bu səhifə də açılmaya bilər —
            o halda serverə SSH ilə baxın.
          </p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              load();
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg"
          >
            <FiRefreshCw /> Yenidən cəhd et
          </button>
        </div>
      </AccountLayout>
    );
  }

  const o = OVERALL[data.overall?.status] || OVERALL.warning;
  const OIcon = o.icon;
  const score = data.overall?.score ?? 0;
  const perf = data.performance || {};
  const srv = data.server || {};
  const db = data.database || {};
  const biz = data.business || {};
  const storage = data.storage || {};
  const up = data.uptime || {};

  return (
    <AccountLayout
      title="Sistem sağlamlığı"
      subtitle="Examopia hazırda sağlamdırmı — və deyilsə, konkret nə problemdir?"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium text-muted">
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
              className="h-4 w-4 accent-[oklch(var(--primary))]"
            />
            Avto-yenilə (30s)
          </label>
          <button
            type="button"
            onClick={() => load({ fresh: true })}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
          >
            <FiRefreshCw className={refreshing ? "animate-spin" : ""} /> Yenilə
          </button>
        </div>
      }
    >
      {error && (
        <div className="mb-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {error} — göstərilən məlumat son uğurlu yoxlamadandır.
        </div>
      )}

      {/* 1 — Overall banner */}
      <div className={`rounded-3xl border-2 ${o.ring} bg-surface p-6 shadow-soft`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${o.chip}`}>
              <OIcon className="text-2xl" />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold text-text sm:text-2xl">{o.label}</h2>
              <p className="mt-0.5 text-sm text-muted">{o.sub}</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Sağlamlıq balı</p>
              <p className={`font-display text-3xl font-bold tabular-nums ${scoreColor(score)}`}>
                {score}
                <span className="text-base font-semibold text-muted">/100</span>
              </p>
              <p className={`text-xs font-semibold ${scoreColor(score)}`}>{scoreLabel(score)}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-line pt-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <FiClock /> Son yoxlama: <b className="text-text">{fmtTime(data.generatedAt)}</b> ({data.tookMs}ms)
          </span>
          <span>
            Server vaxtı: <b className="text-text">{fmtTime(data.meta?.serverTime)}</b> ({data.meta?.tz})
          </span>
          <span>
            Mühit: <b className="text-text">{data.meta?.env === "development" ? "Development" : "Production"}</b>
          </span>
          <span>
            Versiya: <b className="text-text">v{data.meta?.version}</b>
            {data.meta?.commit ? ` · ${String(data.meta.commit).slice(0, 7)}` : ""} · Node {data.meta?.node}
          </span>
          <span>
            Yenidən başlamadan bəri: <b className="text-text">{fmtDuration(data.meta?.processUptimeSec)}</b>
          </span>
        </div>
      </div>

      {/* 2 — Active alerts */}
      {(data.alerts || []).length > 0 && (
        <Section icon={FiAlertTriangle} title={`Aktiv xəbərdarlıqlar (${data.alerts.length})`}>
          <div className="space-y-2.5">
            {data.alerts.map((a, i) => (
              <div
                key={i}
                className={`flex flex-col gap-2 rounded-2xl border p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between ${
                  a.severity === "warning" ? "border-warning/40 bg-warning/5" : "border-danger/40 bg-danger/5"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${sevTone(a.severity)}`}>
                      {sevLabel[a.severity] || a.severity}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted">{a.service}</span>
                    {a.value != null && (
                      <span className="text-xs tabular-nums text-muted">
                        {a.value}
                        {a.threshold != null ? ` / hədd ${a.threshold}` : ""}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-text">{a.message}</p>
                  {a.suggestedAction && (
                    <p className="mt-0.5 text-sm text-muted">
                      <span className="font-medium text-text">Tövsiyə:</span> {a.suggestedAction}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 3 — Summary meters */}
      <Section icon={FiServer} title="Server resursları">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MeterCard
            icon={FiCpu}
            title="CPU"
            pct={srv.cpu?.pct}
            warn={70}
            crit={90}
            detail={`${srv.cpu?.cores ?? "?"} nüvə · yük: ${(srv.cpu?.loadAvg || []).join(" / ") || "—"}`}
          />
          <MeterCard
            icon={FiActivity}
            title="RAM"
            pct={srv.memory?.pct}
            warn={75}
            crit={90}
            detail={`${fmtBytes(srv.memory?.used)} / ${fmtBytes(srv.memory?.total)} · Node: ${fmtBytes(
              srv.memory?.process?.rss
            )}`}
          />
          <MeterCard
            icon={FiHardDrive}
            title="Disk"
            pct={srv.disk?.pct}
            warn={75}
            crit={90}
            detail={`Boş: ${fmtBytes(srv.disk?.free)} / ${fmtBytes(srv.disk?.total)}`}
          />
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-medium text-muted">
                <FiDatabase className="text-[16px]" /> Baza
              </span>
              <StatusPill ok={db.ping?.up} okText={fmtMs(db.ping?.ms)} failText="Əlçatmaz" />
            </div>
            <p className="mt-3 text-xs text-muted">
              Yazma testi:{" "}
              {db.writeTest?.ok ? (
                <span className="font-semibold text-success">OK ({fmtMs(db.writeTest.ms)})</span>
              ) : db.writeTest?.error || db.writeTest?.ok === false ? (
                <span className="font-semibold text-danger">Xəta</span>
              ) : (
                "—"
              )}
            </p>
            <p className="mt-1 truncate text-xs text-muted">
              Ölçü: {fmtBytes(db.stats?.dataSize)} · {db.stats?.collections ?? "?"} kolleksiya
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Ən böyük qovluqlar</p>
            {(srv.dirs || []).length === 0 ? (
              <p className="py-3 text-sm text-muted">Məlumat yoxdur.</p>
            ) : (
              <div className="space-y-1.5">
                {(srv.dirs || []).slice(0, 6).map((d) => (
                  <div key={d.dir} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-mono text-[13px] text-text">{d.dir}/</span>
                    <span className="shrink-0 tabular-nums text-muted">{fmtBytes(d.bytes)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Sistem</p>
            <div className="space-y-1.5 text-sm text-muted">
              <p>
                Host: <span className="font-medium text-text">{srv.hostname || "—"}</span> · {srv.platform || ""}
              </p>
              <p>
                Server açıq qalma müddəti:{" "}
                <span className="font-medium text-text">{fmtDuration(srv.osUptimeSec)}</span>
              </p>
              <p>
                Prosesin RAM istifadəsi:{" "}
                <span className="font-medium text-text">{fmtBytes(srv.memory?.process?.rss)}</span> (heap{" "}
                {fmtBytes(srv.memory?.process?.heapUsed)})
              </p>
              <p className="text-xs">
                RAM mənbəyi: {srv.memory?.source === "container" ? "konteyner limiti" : "host"} — WhatsApp Chromium
                sessiyaları Node prosesindən ayrıca yer tutur.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* 4 — Uptime */}
      <Section
        icon={FiTrendingUp}
        title="Uptime və tarixçə"
        right={
          <div className="inline-flex rounded-xl border border-line bg-surface2/50 p-1">
            {HISTORY_RANGES.map((r) => (
              <button
                key={r.hours}
                type="button"
                onClick={() => setHistoryHours(r.hours)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  historyHours === r.hours ? "bg-primary text-primary-fg shadow-soft" : "text-muted hover:text-text"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Sayt · 24 saat", up.d1?.sitePct],
            ["Sayt · 7 gün", up.d7?.sitePct],
            ["Sayt · 30 gün", up.d30?.sitePct],
            ["API · 24 saat", up.d1?.apiPct],
            ["API · 7 gün", up.d7?.apiPct],
            ["API · 30 gün", up.d30?.apiPct],
          ].map(([label, v]) => (
            <StatTile
              key={label}
              label={label}
              value={v == null ? "—" : `${v}%`}
              tone={v == null ? "text-muted" : v >= 99.5 ? "text-success" : v >= 97 ? "text-warning" : "text-danger"}
            />
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-line bg-surface p-4 shadow-soft">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Status zolağı ({HISTORY_RANGES.find((r) => r.hours === historyHours)?.label}) — hər blok bir vaxt
            dilimidir
          </p>
          <HistoryStrip rows={history?.rows} />
          <p className="mt-2 text-xs text-muted">
            "API" faizi gözlənilən 5-dəqiqəlik nümunələrin neçəsinin yazıldığını göstərir — boşluq backend-in
            dayandığı/yenidən başladığı vaxtdır. "Sayt" faizi serverdən examopia.com-un açılıb-açılmadığıdır.
          </p>
        </div>
      </Section>

      {/* 5 — Performance */}
      <Section icon={FiZap} title="Sürət və performans">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Sorğu / dəq (15 dəq)" value={perf.last15min?.reqPerMin ?? "—"} />
          <StatTile label="Orta cavab (1 saat)" value={fmtMs(perf.lastHour?.avgMs)} />
          <StatTile label="Ən yavaş cavab" value={fmtMs(perf.lastHour?.maxMs)} />
          <StatTile
            label="Xəta nisbəti"
            value={`${perf.lastHour?.errorRatePct ?? 0}%`}
            tone={
              (perf.lastHour?.rate5xxPct ?? 0) >= 5
                ? "text-danger"
                : (perf.lastHour?.errorRatePct ?? 0) >= 5
                ? "text-warning"
                : "text-text"
            }
          />
          <StatTile label="5xx (1 saat)" value={perf.lastHour?.err5 ?? 0} tone={perf.lastHour?.err5 ? "text-danger" : "text-text"} />
          <StatTile label="4xx (1 saat)" value={perf.lastHour?.err4 ?? 0} />
        </div>
        <div className="mt-4 rounded-2xl border border-line bg-surface p-4 shadow-soft">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Son 60 dəqiqə — sorğu axını (qırmızı = 5xx xətalı dəqiqə)
          </p>
          <MinuteBars points={perf.perMinute} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Ən yavaş endpointlər (1 saat)</p>
            <Table head={["Endpoint", { label: "Sorğu", right: true }, { label: "Orta", right: true }, { label: "Maks", right: true }]}>
              {(perf.slowestRoutes || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted">
                    Hələ sorğu qeydə alınmayıb.
                  </td>
                </tr>
              ) : (
                (perf.slowestRoutes || []).slice(0, 8).map((r) => (
                  <Tr key={r.route}>
                    <td className="max-w-[260px] truncate px-4 py-2.5 font-mono text-[12px] text-text" title={r.route}>
                      {r.route}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted">{r.count}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${r.avgMs > 2000 ? "text-danger" : r.avgMs > 700 ? "text-warning" : "text-text"}`}>
                      {fmtMs(r.avgMs)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted">{fmtMs(r.maxMs)}</td>
                  </Tr>
                ))
              )}
            </Table>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Ən çox işlənən endpointlər (1 saat)</p>
            <Table head={["Endpoint", { label: "Sorğu", right: true }, { label: "Orta", right: true }, { label: "Xəta", right: true }]}>
              {(perf.busiestRoutes || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted">
                    Hələ sorğu qeydə alınmayıb.
                  </td>
                </tr>
              ) : (
                (perf.busiestRoutes || []).slice(0, 8).map((r) => (
                  <Tr key={r.route}>
                    <td className="max-w-[260px] truncate px-4 py-2.5 font-mono text-[12px] text-text" title={r.route}>
                      {r.route}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text">{r.count}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted">{fmtMs(r.avgMs)}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${r.err5 ? "text-danger" : r.err4 ? "text-warning" : "text-muted"}`}>
                      {r.err5 + r.err4 || 0}
                    </td>
                  </Tr>
                ))
              )}
            </Table>
          </div>
        </div>
      </Section>

      {/* 6 — Website & API endpoints */}
      <Section icon={FiGlobe} title="Sayt və API yoxlamaları">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              examopia.com (serverdən yoxlanılır)
            </p>
            <Table head={["Səhifə", "Status", { label: "Kod", right: true }, { label: "Müddət", right: true }]}>
              {(data.site?.pages || []).map((p) => (
                <Tr key={p.path}>
                  <td className="px-4 py-2.5 font-medium text-text">
                    {p.name} <span className="font-mono text-[11px] text-muted">{p.path}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill ok={p.ok} okText="Açılır" failText={p.error ? "Xəta" : "Açılmır"} />
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{p.status || "—"}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${p.ms > 1500 ? "text-warning" : "text-muted"}`}>
                    {fmtMs(p.ms)}
                  </td>
                </Tr>
              ))}
            </Table>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">api.examopia.com</p>
            <Table head={["Yoxlama", "Status", { label: "Kod", right: true }, { label: "Müddət", right: true }]}>
              {(data.api?.endpoints || []).map((p, i) => (
                <Tr key={i}>
                  <td className="px-4 py-2.5 font-medium text-text">{p.name}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill ok={p.ok} okText="İşləyir" failText={p.error ? "Xəta" : "İşləmir"} />
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{p.status || "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{fmtMs(p.ms)}</td>
                </Tr>
              ))}
            </Table>
            <p className="mt-2 text-xs text-muted">
              "Daxili" — Express prosesi konteynerin içindən; "xarici" — tam yol: DNS → Caddy → SSL → Express.
            </p>
          </div>
        </div>
      </Section>

      {/* 7 — Business checks */}
      <Section icon={FiCheckCircle} title="Examopia yoxlamaları (məhsul səviyyəsi)">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Aktiv imtahan" value={biz.examsActive ?? "—"} sub={`${biz.examsHidden ?? 0} qaralama · ${biz.examsArchived ?? 0} zibil qutusunda`} />
          <StatTile label="Canlı cəhdlər" value={biz.attemptsActive ?? "—"} sub="hazırda imtahan verənlər" tone={biz.attemptsActive > 0 ? "text-primary" : "text-text"} />
          <StatTile label="Nəticə (24 saat)" value={biz.results24h ?? "—"} sub={`son: ${fmtDate(biz.lastResultAt)}`} />
          <StatTile label="Cəhd (24 saat)" value={biz.attempts24h ?? "—"} sub={`${biz.terminated24h ?? 0} pozuntuyla dayandırılıb`} />
          <StatTile label="İstifadəçilər" value={biz.usersTotal ?? "—"} sub={`+${biz.usersNew7d ?? 0} son 7 gündə`} />
          <StatTile label="Video dərslər" value={biz.videos ?? "—"} sub={`${biz.classes ?? 0} sinif`} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4 shadow-soft">
            <div>
              <p className="text-sm font-semibold text-text">Şəkillər / media (Cloudinary)</p>
              <p className="mt-0.5 text-xs text-muted">
                {biz.media?.skipped ? "Yoxlamaq üçün örnək şəkil tapılmadı" : `Son örtük şəkli yoxlanıldı · ${fmtMs(biz.media?.ms)}`}
              </p>
            </div>
            <StatusPill ok={biz.media?.skipped ? null : biz.media?.ok} okText="Yüklənir" failText="Yüklənmir" />
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4 shadow-soft">
            <div>
              <p className="text-sm font-semibold text-text">İmtahan taymerləri (server vaxtı)</p>
              <p className="mt-0.5 text-xs text-muted">Şagird taymerləri bu endpointdən sinxronlaşır</p>
            </div>
            <StatusPill
              ok={(data.api?.endpoints || []).find((e) => e.name.includes("taymer"))?.ok ?? null}
              okText="İşləyir"
              failText="İşləmir"
            />
          </div>
        </div>
      </Section>

      {/* 8 — Storage */}
      <Section icon={FiUploadCloud} title="Fayllar və yaddaş">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text">Yükləmə qovluğu (imtahan PDF-ləri)</p>
              <StatusPill ok={storage.write?.ok} okText="Yazıla bilir" failText="Yazılmır!" />
            </div>
            <p className="mt-2 text-sm text-muted">
              <b className="text-text">{storage.files?.count ?? "?"}</b> fayl ·{" "}
              <b className="text-text">{fmtBytes(storage.files?.bytes)}</b>
            </p>
            <p className="mt-1 text-xs text-muted">
              Bu qovluq imtahan PDF-lərinin YEGANƏ nüsxəsidir (Docker volume) — yazıla bilməməsi kritikdir.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft lg:col-span-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Ən böyük fayllar</p>
            {(storage.files?.largest || []).length === 0 ? (
              <p className="py-2 text-sm text-muted">Fayl yoxdur.</p>
            ) : (
              <div className="space-y-1.5">
                {(storage.files?.largest || []).map((f) => (
                  <div key={f.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-mono text-[12px] text-text">{f.name}</span>
                    <span className="shrink-0 tabular-nums text-muted">{fmtBytes(f.bytes)}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-muted">WhatsApp sessiyaları: {storage.waSessions ?? 0}</p>
          </div>
        </div>
      </Section>

      {/* 9 — Integrations */}
      <Section icon={FiLink2} title="İnteqrasiyalar">
        <Table head={["Servis", "Qurulub?", "Status", "Ətraflı"]}>
          {(data.integrations?.list || []).map((it) => (
            <Tr key={it.name}>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-text">{it.name}</td>
              <td className="px-4 py-3">
                <Badge tone={it.configured ? "primary" : "neutral"}>{it.configured ? "Bəli" : "Xeyr"}</Badge>
              </td>
              <td className="px-4 py-3">
                <StatusPill ok={it.ok} okText="İşləyir" failText="Xəta" unknownText="Yoxlanılmır" />
              </td>
              <td className="px-4 py-3 text-muted">{it.detail}</td>
            </Tr>
          ))}
        </Table>
      </Section>

      {/* 10 — Background jobs */}
      <Section icon={FiClock} title="Fon işləri (schedulerlər)">
        <Table
          head={["İş", "Status", { label: "İnterval", right: true }, { label: "Son işə düşmə", right: true }, { label: "İşləmə / xəta", right: true }, "Son xəta"]}
        >
          {(data.jobs || []).length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-muted">
                Fon işləri hələ qeydə alınmayıb.
              </td>
            </tr>
          ) : (
            (data.jobs || []).map((j) => (
              <Tr key={j.name}>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-[12px] font-medium text-text">{j.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      j.status === "ok"
                        ? "bg-success/12 text-success"
                        : j.status === "pending"
                        ? "bg-surface2 text-muted"
                        : "bg-danger/12 text-danger"
                    }`}
                  >
                    {j.status === "ok" ? "İşləyir" : j.status === "pending" ? "Gözləyir" : j.status === "overdue" ? "Gecikir" : "Xəta verir"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted">{fmtInterval(j.intervalMs)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs tabular-nums text-muted">{fmtDate(j.lastRunAt)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted">
                  {j.runs} / <span className={j.fails ? "font-semibold text-danger" : ""}>{j.fails}</span>
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 text-xs text-muted" title={j.lastError || ""}>
                  {j.lastError || "—"}
                </td>
              </Tr>
            ))
          )}
        </Table>
      </Section>

      {/* 11 — Errors */}
      <Section icon={FiAlertTriangle} title="Xətalar">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile
            label="5xx (son 1 saat)"
            value={perf.lastHour?.err5 ?? 0}
            tone={perf.lastHour?.err5 ? "text-danger" : "text-text"}
          />
          <StatTile label="4xx (son 1 saat)" value={perf.lastHour?.err4 ?? 0} />
          <StatTile
            label="Uğursuz giriş cəhdi (24s)"
            value={(data.errors?.debug?.last24h?.auth_invalid_token || 0) + (data.errors?.debug?.last24h?.auth_user_not_found || 0)}
          />
          <StatTile label="Uğurlu giriş (24s)" value={data.errors?.debug?.last24h?.login_ok || 0} />
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Qruplaşdırılmış xətalar (yenidən başlamadan bəri — eyni xəta bir sətirdə)
          </p>
          <Table head={[{ label: "Kod", right: false }, "Endpoint", "Mesaj", { label: "Say", right: true }, { label: "Son dəfə", right: true }]}>
            {(data.errors?.groups || []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  Xəta qeydə alınmayıb. 🎉
                </td>
              </tr>
            ) : (
              (data.errors?.groups || []).slice(0, 15).map((g, i) => (
                <Tr key={i}>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${g.status >= 500 ? "bg-danger/12 text-danger" : "bg-warning/12 text-warning"}`}>
                      {g.status}
                    </span>
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-2.5 font-mono text-[12px] text-text" title={g.route}>
                    {g.route}
                  </td>
                  <td className="max-w-[280px] truncate px-4 py-2.5 text-muted" title={g.message}>
                    {g.message || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-text">{g.count}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs tabular-nums text-muted">{fmtDate(g.lastAt)}</td>
                </Tr>
              ))
            )}
          </Table>
        </div>
      </Section>

      {/* 12 — SSL & security */}
      <Section icon={FiShield} title="SSL və təhlükəsizlik">
        <div className="grid gap-4 sm:grid-cols-2">
          {(data.ssl || []).map((s) => (
            <div key={s.host} className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
              <div className="flex items-center justify-between">
                <p className="font-mono text-sm font-semibold text-text">{s.host}</p>
                {s.error ? (
                  <Badge tone="danger">Oxunmadı</Badge>
                ) : (
                  <Badge tone={s.daysLeft <= 7 ? "danger" : s.daysLeft <= 30 ? "warning" : "success"}>
                    {s.daysLeft} gün qalıb
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-xs text-muted">
                {s.error
                  ? s.error
                  : `Bitmə: ${fmtDate(s.validTo)} · Verən: ${s.issuer || "?"} · ${s.authorized ? "etibarlıdır" : "zəncir doğrulanmadı"}`}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-line bg-surface p-4 text-sm text-muted shadow-soft">
          <p>
            HTTPS: <b className="text-text">{data.site?.pages?.[0]?.headers?.hsts ? "HSTS aktiv" : "aktiv"}</b> · CORS:{" "}
            <b className="text-text">yalnız examopia.com</b> · AI sorğu limiti:{" "}
            <b className="text-text">aktiv (istifadəçi başına)</b> · Girişlər DebugLog-da izlənir (14 gün).
          </p>
        </div>
      </Section>

      {/* 13 — Database detail */}
      <Section icon={FiDatabase} title="Verilənlər bazası (MongoDB Atlas)">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label="Ping" value={fmtMs(db.ping?.ms)} tone={db.ping?.up ? (db.ping.ms > 300 ? "text-warning" : "text-text") : "text-danger"} />
          <StatTile label="Məlumat ölçüsü" value={fmtBytes(db.stats?.dataSize)} sub={`indekslər: ${fmtBytes(db.stats?.indexSize)}`} />
          <StatTile label="Sənəd sayı" value={db.stats?.objects?.toLocaleString?.() ?? "—"} sub={`${db.stats?.collections ?? "?"} kolleksiya`} />
          <StatTile
            label="Bağlantılar"
            value={db.connections?.unavailable ? "—" : db.connections?.current ?? "—"}
            sub={db.connections?.unavailable ? "Atlas göstərmir" : `mövcud: ${db.connections?.available ?? "?"} · v${db.connections?.version ?? "?"}`}
          />
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Ən böyük kolleksiyalar</p>
          <Table head={["Kolleksiya", { label: "Sənəd", right: true }, { label: "Məlumat", right: true }, { label: "Diskdə", right: true }]}>
            {(db.topCollections || []).length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  Məlumat yoxdur.
                </td>
              </tr>
            ) : (
              (db.topCollections || []).map((c) => (
                <Tr key={c.name}>
                  <td className="px-4 py-2.5 font-mono text-[12px] font-medium text-text">{c.name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{c.count?.toLocaleString?.()}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-text">{fmtBytes(c.size)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{fmtBytes(c.storageSize)}</td>
                </Tr>
              ))
            )}
          </Table>
        </div>
        <div className="mt-4 rounded-2xl border border-line bg-surface p-4 text-sm text-muted shadow-soft">
          <p className="font-semibold text-text">Ehtiyat nüsxələr</p>
          <p className="mt-1">{data.backups?.note}</p>
        </div>
      </Section>

      <p className="mt-8 text-xs text-muted">
        Yoxlamalar oxu rejimindədir və keşlənir (~20s) — avto-yeniləmə serverə əlavə yük salmır. Server tamamilə
        dayanıbsa bu səhifə açılmayacaq: o halda ehtiyat yol serverə SSH-dır.
      </p>
    </AccountLayout>
  );
};

export default HealthDashboard;
