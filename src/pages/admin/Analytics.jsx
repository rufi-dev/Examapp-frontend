import PropTypes from "prop-types";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { FiBarChart2, FiList, FiRefreshCw } from "react-icons/fi";
import AccountLayout from "../../components/AccountLayout";
import Columns, { Legend } from "../../components/admin/analytics/Columns";
import VisitLog from "../../components/admin/analytics/VisitLog";
import {
  Figure,
  Panel,
  PeriodBar,
  RankBars,
  SectionHead,
  Toggle,
} from "../../components/admin/analytics/parts";
import {
  SETUP,
  change,
  chartRange,
  dayLabel,
  daysBetween,
  fmtNum,
  hourLabel,
  periodRange,
  previousRange,
  sourceLabel,
  sum,
} from "../../components/admin/analytics/analyticsOps";

/*
 * «Analitika» (redesigned 2026-11-03; owner: "impress me"). One period (in the
 * URL) for every number, and two tabs (owner: "visits in one tab, the other
 * statistics in another"):
 *   «Ziyarətlər»: the visits themselves (kept 7 days), and nothing else;
 *   «Statistika»: the period in five figures, each against the period before,
 *     with its trend; Trafik (visits by day or by hour, where they came from);
 *     Artım (sign-ups, exams with questions vs empty, classes); Müəllimlər
 *     (how many, how far teachers got in setting up).
 * Statistics load only when their tab is open. Traffic for any range comes from
 * /api/track/overview, which reads the daily summaries, so a month back no
 * longer falls to zero. A source in «Statistika» opens the visits from it.
 */
const BASE = import.meta.env.VITE_BACKEND_URL;
const get = (path, params) =>
  axios.get(`${BASE}${path}`, { params }).then((r) => r.data);
const DEVICE = { mobile: "Telefon", desktop: "Kompüter", tablet: "Planşet" };
const PRESET_KEYS = ["today", "yesterday", "7", "30", "90", "custom"];

function Skeleton({ className }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-2xl border border-line bg-surface ${className}`}
    />
  );
}
Skeleton.propTypes = { className: PropTypes.string };

export default function Analytics() {
  const [params, setParams] = useSearchParams();
  const preset = PRESET_KEYS.includes(params.get("p"))
    ? params.get("p")
    : "today";
  const custom = { from: params.get("from") || "", to: params.get("to") || "" };
  const range = periodRange(preset, custom);
  const prev = previousRange(range);
  const chart = chartRange(range);
  const oneDay = range.from === range.to;
  const tab = params.get("tab") === "stats" ? "stats" : "visits";
  const setPeriod = (p, c = {}) =>
    setParams(
      {
        ...(tab === "stats" ? { tab } : {}),
        ...(p === "custom"
          ? { p, from: c.from || range.from, to: c.to || range.to }
          : { p }),
      },
      { replace: true },
    );
  const setTab = (t) =>
    setParams(
      (cur) => {
        const next = Object.fromEntries(cur);
        if (t === "stats") next.tab = "stats";
        else delete next.tab;
        return next;
      },
      { replace: true },
    );

  const [refresh, setRefresh] = useState(0);
  const [traffic, setTraffic] = useState(null);
  const [trafficPrev, setTrafficPrev] = useState(null);
  const [growth, setGrowth] = useState(null);
  const [growthPrev, setGrowthPrev] = useState(null);
  const [growthChart, setGrowthChart] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [failed, setFailed] = useState(false);
  const [unique, setUnique] = useState(false);
  const [source, setSource] = useState("");
  const log = useRef(null);

  const key = `${range.from}|${range.to}|${refresh}|${tab}`;
  useEffect(() => {
    if (tab !== "stats") return undefined;
    let on = true;
    setFailed(false);
    setTraffic(null);
    setTrafficPrev(null);
    setGrowth(null);
    setGrowthPrev(null);
    setGrowthChart(null);
    const sameChart = chart.from === range.from && chart.to === range.to;
    Promise.allSettled([
      get("/api/track/overview", range),
      get("/api/track/overview", prev),
      get("/api/track/growth", range),
      get("/api/track/growth", prev),
      sameChart ? Promise.resolve(null) : get("/api/track/growth", chart),
    ]).then(([t, tp, g, gp, gc]) => {
      if (!on) return;
      if (t.status === "fulfilled") setTraffic(t.value);
      if (tp.status === "fulfilled") setTrafficPrev(tp.value);
      if (g.status === "fulfilled") setGrowth(g.value);
      if (gp.status === "fulfilled") setGrowthPrev(gp.value);
      setGrowthChart(
        sameChart
          ? g.status === "fulfilled"
            ? g.value
            : null
          : gc.status === "fulfilled"
            ? gc.value
            : null,
      );
      if ([t, g].some((x) => x.status === "rejected")) setFailed(true);
    });
    return () => {
      on = false;
    };
    // The period (and «Yenilə») decide what is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (tab !== "stats") return undefined;
    let on = true;
    get("/api/users/setup-funnel")
      .then((d) => on && setFunnel(d))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [refresh, tab]);

  const versus =
    preset === "today"
      ? "dünənə görə"
      : preset === "yesterday"
        ? "srağagünə görə"
        : `əvvəlki ${daysBetween(range.from, range.to)} günə görə`;
  const days = traffic?.days || [];
  const s = growth?.series;
  const sp = growthPrev?.series;
  const examsMade = sum(s?.examsCreated);
  const examsReady = sum(s?.examsReady);

  const figures = [
    {
      label: "Ziyarət",
      value: traffic?.totals?.visits,
      before: trafficPrev?.totals?.visits,
      trend: days.map((d) => d.visits),
    },
    {
      label: "Unikal ziyarətçi",
      value: traffic?.totals?.uniqueIps,
      before: trafficPrev?.totals?.uniqueIps,
      trend: days.map((d) => d.uniqueIps),
      note: oneDay ? null : "günlük unikal IP-lərin cəmi",
    },
    {
      label: "Yeni müəllim",
      value: s ? sum(s.teachers) : undefined,
      before: sp ? sum(sp.teachers) : undefined,
      trend: s?.teachers,
    },
    {
      label: "Yeni şagird",
      value: s ? sum(s.students) : undefined,
      before: sp ? sum(sp.students) : undefined,
      trend: s?.students,
    },
    {
      label: "Yaradılan imtahan",
      value: s ? examsMade : undefined,
      before: sp ? sum(sp.examsCreated) : undefined,
      trend: s?.examsCreated,
      note: examsMade
        ? `${Math.round((examsReady / examsMade) * 100)}% suallı`
        : null,
    },
  ];

  const hours = (unique ? traffic?.hoursUnique : traffic?.hours) || [];
  const peak = hours.reduce(
    (best, v, h) => (v > (hours[best] || 0) ? h : best),
    0,
  );
  const totals = traffic?.totals || {};
  const lost = Math.max(0, (totals.opened || 0) - (totals.rendered || 0));
  const sources = useMemo(
    () =>
      (traffic?.sources || []).map((x) => ({
        key: x.key,
        label: sourceLabel(x.key),
        n: x.n,
      })),
    [traffic],
  );
  // A source opens the visits that came from it.
  const pickSource = (k) => {
    setSource(k === "other" ? "" : k);
    setTab("visits");
    requestAnimationFrame(() =>
      log.current?.scrollIntoView?.({ block: "start" }),
    );
  };
  const TABS = [
    { key: "visits", label: "Ziyarətlər", icon: FiList },
    { key: "stats", label: "Statistika", icon: FiBarChart2 },
  ];
  const onTabKey = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = tab === "visits" ? "stats" : "visits";
    setTab(next);
    requestAnimationFrame(() =>
      document.getElementById(`an-tab-${next}`)?.focus(),
    );
  };

  const gc = growthChart?.series;
  const gDays = growthChart?.days || [];
  const shortRange = chart.from !== range.from;
  const teachers = funnel?.total || 0;

  return (
    <AccountLayout
      title="Analitika"
      subtitle="Sayta kim gəlir, kim qeydiyyatdan keçir və müəllimlər hara çatıb."
      actions={
        <button
          type="button"
          onClick={() => setRefresh((n) => n + 1)}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-text transition-colors hover:bg-surface2"
        >
          <FiRefreshCw
            aria-hidden
            className={
              tab === "stats" && !traffic ? "motion-safe:animate-spin" : ""
            }
          />{" "}
          Yenilə
        </button>
      }
    >
      <div ref={log} className="mb-5 scroll-mt-24 space-y-4">
        <div
          role="tablist"
          aria-label="Analitika"
          className="-mx-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map((t) => {
            const on = tab === t.key;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                id={`an-tab-${t.key}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls="an-panel"
                tabIndex={on ? 0 : -1}
                onKeyDown={onTabKey}
                onClick={() => setTab(t.key)}
                className={`relative inline-flex h-11 shrink-0 items-center gap-2 rounded-t-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30 ${on ? "text-text" : "text-muted hover:text-text"}`}
              >
                <Icon aria-hidden className={on ? "text-primary" : ""} />
                {t.label}
                {on && (
                  <span
                    aria-hidden
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
                  />
                )}
              </button>
            );
          })}
        </div>
        <PeriodBar
          preset={preset}
          range={range}
          custom={custom}
          onPreset={(p) => setPeriod(p)}
          onCustom={(c) => setPeriod("custom", c)}
        />
      </div>

      <div id="an-panel" role="tabpanel" aria-labelledby={`an-tab-${tab}`}>
        {tab === "visits" ? (
          <VisitLog
            range={range}
            source={source}
            onSource={setSource}
            refreshKey={refresh}
          />
        ) : (
          <div className="space-y-10">
            <div className="space-y-4">
              {failed && (
                <p className="rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger">
                  Bəzi rəqəmlər yüklənmədi. «Yenilə» ilə yenidən cəhd et.
                </p>
              )}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-5 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
                {figures.map((f) => (
                  <Figure
                    key={f.label}
                    label={f.label}
                    value={
                      f.value === undefined ? (
                        <span className="inline-block h-7 w-12 animate-pulse rounded bg-surface2" />
                      ) : (
                        fmtNum(f.value)
                      )
                    }
                    delta={
                      f.value === undefined || f.before === undefined
                        ? undefined
                        : change(f.value, f.before)
                    }
                    versus={versus}
                    trend={oneDay ? null : f.trend}
                    note={f.note}
                  />
                ))}
              </div>
            </div>

            {/* ── Trafik ─────────────────────────────────────────────────────────── */}
            <section aria-labelledby="an-traffic">
              <SectionHead id="an-traffic" title="Trafik">
                {oneDay
                  ? "Günün saatları üzrə (Azərbaycan vaxtı)."
                  : "Gün-gün ziyarətlər və haradan gəldikləri."}
              </SectionHead>
              {!traffic ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <Skeleton className="h-80 lg:col-span-2" />
                  <Skeleton className="h-80" />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <Panel labelledBy="an-visits" className="lg:col-span-2">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3
                          id="an-visits"
                          className="text-sm font-bold text-text"
                        >
                          {oneDay ? "Saatlar üzrə ziyarət" : "Gündəlik ziyarət"}
                        </h3>
                        <p className="text-xs text-muted">
                          {oneDay
                            ? hours.some(Boolean)
                              ? `Ən aktiv saat: ${hourLabel(peak)}`
                              : "Bu gün hələ ziyarət yoxdur"
                            : `${fmtNum(totals.visits)} ziyarət, ${fmtNum(totals.signedIn)} giriş etmiş istifadəçi`}
                        </p>
                      </div>
                      <Toggle on={unique} onChange={setUnique}>
                        Unikal IP
                      </Toggle>
                    </div>
                    {oneDay ? (
                      <Columns
                        title="Saatlar üzrə ziyarət"
                        labels={Array.from({ length: 24 }, (_, h) => h)}
                        formatLabel={(h) => String(h).padStart(2, "0")}
                        fullLabel={(h) =>
                          `${hourLabel(h)} – ${hourLabel((h + 1) % 24)}`
                        }
                        series={[
                          {
                            key: "v",
                            label: unique ? "Unikal IP" : "Ziyarət",
                            tone: "primary",
                            data: unique ? traffic.hoursUnique : traffic.hours,
                          },
                        ]}
                      />
                    ) : (
                      <Columns
                        title="Gündəlik ziyarət"
                        labels={days.map((d) => d.day)}
                        formatLabel={(k) => dayLabel(k)}
                        fullLabel={(k) => dayLabel(k, true)}
                        series={[
                          {
                            key: "v",
                            label: unique ? "Unikal IP" : "Ziyarət",
                            tone: "primary",
                            data: days.map((d) =>
                              unique ? d.uniqueIps : d.visits,
                            ),
                          },
                        ]}
                      />
                    )}
                    {totals.opened > 0 && (
                      <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
                        Səhifəni açıb sayt görünməmiş çıxan:{" "}
                        <span className="font-semibold tabular-nums text-text">
                          {fmtNum(lost)}
                        </span>{" "}
                        ({Math.round((lost / totals.opened) * 100)}%). Çox
                        olarsa, sayt gec açılır.
                      </p>
                    )}
                  </Panel>
                  <Panel labelledBy="an-sources">
                    <h3 id="an-sources" className="text-sm font-bold text-text">
                      Mənbələr
                    </h3>
                    <p className="mb-3 text-xs text-muted">
                      Birinə bas: o mənbədən gələn ziyarətlər açılır.
                    </p>
                    <RankBars
                      items={sources}
                      onPick={pickSource}
                      picked={source}
                      max={7}
                      empty="Bu dövrdə ziyarət yoxdur"
                    />
                  </Panel>
                  <Panel labelledBy="an-countries">
                    <h3
                      id="an-countries"
                      className="mb-3 text-sm font-bold text-text"
                    >
                      Ölkələr
                    </h3>
                    <RankBars
                      items={(traffic.countries || []).map((c) => ({
                        key: c.key,
                        label: c.key,
                        n: c.n,
                      }))}
                      max={5}
                    />
                  </Panel>
                  {/* Visits record no device type yet; an empty panel would read as broken. */}
                  {(traffic.devices || []).length > 0 && (
                    <Panel labelledBy="an-devices">
                      <h3
                        id="an-devices"
                        className="mb-3 text-sm font-bold text-text"
                      >
                        Cihazlar
                      </h3>
                      <RankBars
                        items={traffic.devices.map((c) => ({
                          key: c.key,
                          label: DEVICE[c.key] || c.key,
                          n: c.n,
                        }))}
                        max={4}
                      />
                    </Panel>
                  )}
                  <Panel labelledBy="an-landings">
                    <h3
                      id="an-landings"
                      className="mb-3 text-sm font-bold text-text"
                    >
                      Giriş səhifələri
                    </h3>
                    <RankBars
                      items={(traffic.landings || []).map((c) => ({
                        key: c.key,
                        label: c.key,
                        n: c.n,
                      }))}
                      max={5}
                    />
                  </Panel>
                </div>
              )}
            </section>

            {/* ── Artım ──────────────────────────────────────────────────────────── */}
            <section aria-labelledby="an-growth">
              <SectionHead id="an-growth" title="Artım">
                {shortRange
                  ? "Qısa dövr seçilib: qrafiklər son 7 günü göstərir, rəqəmlər yuxarıdadır."
                  : "Gün-gün yeni müəllim, şagird, imtahan və sinif."}
              </SectionHead>
              {!gc ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Skeleton className="h-72 lg:col-span-2" />
                  <Skeleton className="h-64" />
                  <Skeleton className="h-64" />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Panel labelledBy="an-signups" className="lg:col-span-2">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3
                        id="an-signups"
                        className="text-sm font-bold text-text"
                      >
                        Qeydiyyatlar
                      </h3>
                      <Legend
                        series={[
                          {
                            key: "t",
                            label: `Müəllim (${fmtNum(sum(gc.teachers))})`,
                            tone: "primary",
                          },
                          {
                            key: "s",
                            label: `Şagird (${fmtNum(sum(gc.students))})`,
                            tone: "muted",
                          },
                        ]}
                      />
                    </div>
                    <Columns
                      title="Qeydiyyatlar"
                      height={240}
                      labels={gDays}
                      formatLabel={(k) => dayLabel(k)}
                      fullLabel={(k) => dayLabel(k, true)}
                      series={[
                        {
                          key: "t",
                          label: "Müəllim",
                          tone: "primary",
                          data: gc.teachers,
                        },
                        {
                          key: "s",
                          label: "Şagird",
                          tone: "muted",
                          data: gc.students,
                        },
                      ]}
                    />
                  </Panel>
                  <Panel labelledBy="an-exams">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 id="an-exams" className="text-sm font-bold text-text">
                        İmtahanlar
                      </h3>
                      <Legend
                        series={[
                          { key: "r", label: "Suallı", tone: "primary" },
                          { key: "e", label: "Boş", tone: "muted" },
                        ]}
                      />
                    </div>
                    <Columns
                      title="İmtahanlar"
                      labels={gDays}
                      formatLabel={(k) => dayLabel(k)}
                      fullLabel={(k) => dayLabel(k, true)}
                      series={[
                        {
                          key: "r",
                          label: "Suallı",
                          tone: "primary",
                          data: gc.examsReady,
                        },
                        {
                          key: "e",
                          label: "Boş",
                          tone: "muted",
                          data: gc.examsCreated.map((v, i) =>
                            Math.max(0, v - (gc.examsReady[i] || 0)),
                          ),
                        },
                      ]}
                    />
                  </Panel>
                  <Panel labelledBy="an-classes">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3
                        id="an-classes"
                        className="text-sm font-bold text-text"
                      >
                        Siniflər
                      </h3>
                      <span className="text-xs text-muted">
                        {fmtNum(sum(gc.classes))} yeni
                      </span>
                    </div>
                    <Columns
                      title="Siniflər"
                      labels={gDays}
                      formatLabel={(k) => dayLabel(k)}
                      fullLabel={(k) => dayLabel(k, true)}
                      series={[
                        {
                          key: "c",
                          label: "Sinif",
                          tone: "primary",
                          data: gc.classes,
                        },
                      ]}
                    />
                  </Panel>
                </div>
              )}
            </section>

            {/* ── Müəllimlər ─────────────────────────────────────────────────────── */}
            <section aria-labelledby="an-teachers">
              <SectionHead id="an-teachers" title="Müəllimlər">
                İndiki vəziyyət (dövrdən asılı deyil).
              </SectionHead>
              {!funnel ? (
                <Skeleton className="h-56" />
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
                  <Panel labelledBy="an-teacher-count">
                    <h3 id="an-teacher-count" className="text-sm font-bold text-text">
                      Müəllimlər
                    </h3>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-text">
                      {fmtNum(teachers)}{" "}
                      <span className="text-sm font-normal text-muted">
                        müəllim
                      </span>
                    </p>
                    {teachers > 0 && (
                      <p className="mt-3 text-sm text-muted">
                        <span className="font-semibold tabular-nums text-success">
                          {fmtNum(funnel.finished || 0)}
                        </span>{" "}
                        tam qurulub ({Math.round(((funnel.finished || 0) / teachers) * 100)}%)
                      </p>
                    )}
                  </Panel>
                  <Panel labelledBy="an-setup">
                    <h3 id="an-setup" className="text-sm font-bold text-text">
                      Qurulum
                    </h3>
                    <p className="mb-3 text-xs text-muted">
                      Hər biri bütün müəllimlərə görə; vəziyyətlər üst-üstə düşə
                      bilər.
                    </p>
                    <RankBars
                      of={teachers || 1}
                      items={SETUP.map((x) => ({
                        key: x.key,
                        label: x.label,
                        hint: x.hint,
                        n: funnel[x.key] || 0,
                        tone: x.key === "finished" ? "success" : "primary",
                      }))}
                      max={SETUP.length}
                    />
                  </Panel>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
