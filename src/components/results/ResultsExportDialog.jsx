import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import {
  FiX,
  FiCalendar,
  FiUsers,
  FiAward,
  FiList,
  FiGrid,
  FiSearch,
  FiRotateCcw,
  FiDownload,
  FiLayers,
  FiShield,
  FiFileText,
  FiFilter,
  FiTrendingUp,
} from "react-icons/fi";
import Spinner from "../Spinner";
import {
  DEFAULT_FILTERS,
  DATE_PRESETS,
  ATTEMPT_MODES,
  applyResultFilters,
  resultFacets,
  summarize,
  describeFilters,
  dateWindow,
  dayKey,
  fileSlug,
} from "../../helper/resultFilters";

/*
 * «Nəticələri ixrac et» — choose WHICH results go into the PDF / Excel before it
 * is made: a day or a date range (today, the exam day, last week…), one attempt
 * per student, passed / failed, a score range, anti-cheat, online / paper, grade,
 * a name. The summary on the right recounts live, and the file prints the filter
 * it was made with.
 */

const WEEKDAYS = ["Bazar", "B.e.", "Ç.a.", "Çər.", "C.a.", "Cümə", "Şənbə"];
const pad = (n) => String(n).padStart(2, "0");
const fmt1 = (n) => (Math.round((Number(n) || 0) * 10) / 10).toString();
const shortDay = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;

// "9" → "9-cu sinif", "6" → "6-cı sinif", "11" → "11-ci sinif" (the suffix follows
// the vowel of the number's last word); anything else ("Məzun") stays as it is.
const UNIT_SUFFIX = ["", "ci", "ci", "cü", "cü", "ci", "cı", "ci", "ci", "cu"];
const TENS_SUFFIX = ["", "cu", "ci", "cu", "cı", "ci", "cı", "ci", "ci", "cı"];
const gradeName = (g) => {
  if (!/^\d+$/.test(g)) return g;
  const n = Number(g);
  const suf = n % 10 ? UNIT_SUFFIX[n % 10] : TENS_SUFFIX[Math.floor(n / 10) % 10] || "cu";
  return `${n}-${suf} sinif`;
};

const chip = (active) =>
  `inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30 ${
    active
      ? "border-primary bg-primary text-primary-fg shadow-soft"
      : "border-line bg-surface text-text hover:border-primary/40 hover:bg-surface2"
  }`;

const Section = ({ icon: Icon, title, aside, children }) => (
  <section className="py-5 first:pt-1">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em] text-muted">
        <Icon className="text-[15px] text-primary" aria-hidden="true" /> {title}
      </h3>
      {aside}
    </div>
    {children}
  </section>
);

// A segmented control (one choice).
const Segmented = ({ options, value, onChange, label }) => (
  <div role="radiogroup" aria-label={label} className="flex w-full gap-1 rounded-2xl border border-line bg-surface2/60 p-1">
    {options.map((o) => {
      const on = value === o.key;
      return (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={on}
          onClick={() => onChange(o.key)}
          className={`min-h-10 flex-1 rounded-xl px-2.5 text-[13px] font-semibold transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30 ${
            on ? "bg-surface text-text shadow-soft" : "text-muted hover:text-text"
          }`}
        >
          {o.label}
        </button>
      );
    })}
  </div>
);

const numInput =
  "h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/25";

export default function ResultsExportDialog({ open, onClose, results, examName, filters, onChange }) {
  const [busy, setBusy] = useState(null); // "results" | "answers" | "excel"
  const [allDays, setAllDays] = useState(false);
  const f = filters || DEFAULT_FILTERS;
  const set = (patch) => onChange({ ...f, ...patch });
  const setDate = (patch) => onChange({ ...f, date: { ...f.date, ...patch } });

  const facets = useMemo(() => resultFacets(results), [results]);
  const filtered = useMemo(() => applyResultFilters(results, f), [results, f]);
  const sum = useMemo(() => summarize(filtered, facets.passMark), [filtered, facets.passMark]);
  const labels = useMemo(() => describeFilters(f), [f]);
  const totalMarks = Number(results?.[0]?.examId?.totalMarks) || 100;

  // Score distribution of what will be exported (5 bands of the full mark).
  const bands = useMemo(() => {
    const b = [0, 0, 0, 0, 0];
    for (const r of filtered) {
      const p = Math.max(0, Math.min(0.9999, (Number(r.earnPoints) || 0) / totalMarks));
      b[Math.floor(p * 5)] += 1;
    }
    const max = Math.max(1, ...b);
    return b.map((n, i) => ({ n, h: n / max, from: Math.round((totalMarks * i) / 5), to: Math.round((totalMarks * (i + 1)) / 5) }));
  }, [filtered, totalMarks]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  const { start: wStart, end: wEnd } = dateWindow(f.date);
  const singleDay = f.date.preset === "custom" && f.date.from && f.date.from === f.date.to ? f.date.from : null;
  const days = allDays ? facets.days : facets.days.slice(0, 8);
  const firstDay = facets.days.length ? dayKey(facets.days[facets.days.length - 1].date) : "";
  const lastDay = facets.days.length ? dayKey(facets.days[0].date) : "";

  const pickPreset = (key) => {
    if (key === "custom") {
      setDate({ preset: "custom", from: f.date.from || firstDay, to: f.date.to || lastDay });
    } else setDate({ preset: key });
  };
  const pickDay = (k) =>
    singleDay === k ? setDate({ preset: "all", from: "", to: "" }) : setDate({ preset: "custom", from: k, to: k });

  // file name: exam + the date window it covers
  const fileBase = () => {
    let s = fileSlug(examName);
    if (wStart && wEnd) s += dayKey(wStart) === dayKey(wEnd) ? `_${dayKey(wStart)}` : `_${dayKey(wStart)}_${dayKey(wEnd)}`;
    else if (wStart) s += `_${dayKey(wStart)}-den`;
    else if (wEnd) s += `_${dayKey(wEnd)}-e-qeder`;
    return s;
  };

  const run = async (kind) => {
    if (!filtered.length || busy) return;
    setBusy(kind);
    try {
      if (kind === "excel") {
        const { exportResultsExcel } = await import("../ResultsExcelExport");
        await exportResultsExcel(filtered, { filters: labels, fileName: `${fileBase()}_neticeler.xlsx` });
      } else {
        const { downloadResultsPdf } = await import("./ResultsFiles");
        await downloadResultsPdf(kind, filtered, {
          filters: labels,
          fileName: `${fileBase()}_${kind === "answers" ? "cavablar" : "neticeler"}.pdf`,
        });
      }
      toast.success(`Fayl hazırdır — ${filtered.length} nəticə`);
    } catch (e) {
      toast.error("Fayl hazırlanmadı, yenidən cəhd edin");
      // eslint-disable-next-line no-console
      console.error("results export:", e);
    } finally {
      setBusy(null);
    }
  };

  const reset = () => onChange({ ...DEFAULT_FILTERS, date: { ...DEFAULT_FILTERS.date }, grades: [] });
  const empty = filtered.length === 0;

  const FORMATS = [
    { key: "results", icon: FiAward, title: "Nəticələr", desc: "Sıralama cədvəli · PDF", primary: true },
    { key: "answers", icon: FiList, title: "Cavablar", desc: "Hər şagirdin cavabları · PDF" },
    { key: "excel", icon: FiGrid, title: "Excel", desc: "Bütün məlumat · 4 vərəq" },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[1500] flex items-stretch justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="export-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div className="relative flex h-full w-full max-w-5xl animate-scale-in flex-col overflow-hidden bg-surface shadow-lift sm:h-auto sm:max-h-[92vh] sm:rounded-3xl sm:border sm:border-line">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
              <FiDownload className="text-xl" />
            </span>
            <div className="min-w-0">
              <h2 id="export-title" className="font-display text-xl font-bold leading-tight text-text">
                Nəticələri ixrac et
              </h2>
              <p className="truncate text-sm text-muted">
                {examName} · {facets.total} nəticə, {facets.students} şagird
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface2 hover:text-text"
            aria-label="Bağla"
          >
            <FiX className="text-xl" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_330px] lg:overflow-hidden">
          {/* ── Filters ── */}
          <div className="divide-y divide-line px-5 py-2 sm:px-7 lg:overflow-y-auto">
            <Section
              icon={FiCalendar}
              title="Tarix"
              aside={
                f.date.preset !== "all" && (
                  <button type="button" onClick={() => setDate({ preset: "all", from: "", to: "" })} className="text-xs font-semibold text-primary hover:underline">
                    Təmizlə
                  </button>
                )
              }
            >
              <div className="flex flex-wrap gap-2">
                {DATE_PRESETS.map((p) => (
                  <button key={p.key} type="button" onClick={() => pickPreset(p.key)} className={chip(f.date.preset === p.key)}>
                    {p.label}
                  </button>
                ))}
              </div>

              {f.date.preset === "custom" && (
                <div className="mt-3 grid grid-cols-2 gap-3 animate-fade-in">
                  <label className="text-xs font-semibold text-muted">
                    Başlanğıc
                    <input type="date" value={f.date.from} min={firstDay} max={lastDay || undefined} onChange={(e) => setDate({ from: e.target.value })} className={`${numInput} mt-1`} />
                  </label>
                  <label className="text-xs font-semibold text-muted">
                    Son
                    <input type="date" value={f.date.to} min={firstDay} max={lastDay || undefined} onChange={(e) => setDate({ to: e.target.value })} className={`${numInput} mt-1`} />
                  </label>
                </div>
              )}

              {facets.days.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-muted">Nəticə olan günlər — bir günü seçin</p>
                  <div className="flex flex-wrap gap-2">
                    {days.map((d) => {
                      const on = singleDay === d.key;
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => pickDay(d.key)}
                          className={`group inline-flex items-center gap-2 rounded-2xl border py-1.5 pl-3 pr-1.5 text-left transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] ${
                            on ? "border-primary bg-primary/10" : "border-line bg-surface hover:border-primary/40 hover:bg-surface2"
                          }`}
                          title={`${d.count} nəticə`}
                        >
                          <span className="flex flex-col leading-tight">
                            <span className={`text-sm font-bold tabular-nums ${on ? "text-primary" : "text-text"}`}>{shortDay(d.date)}</span>
                            <span className="text-[11px] text-muted">{WEEKDAYS[d.date.getDay()]}</span>
                          </span>
                          <span className={`grid min-w-[1.75rem] place-items-center rounded-xl px-1.5 py-1 text-xs font-bold tabular-nums ${on ? "bg-primary text-primary-fg" : "bg-surface2 text-muted group-hover:text-text"}`}>
                            {d.count}
                          </span>
                        </button>
                      );
                    })}
                    {facets.days.length > 8 && (
                      <button type="button" onClick={() => setAllDays((v) => !v)} className="rounded-2xl px-3 text-sm font-semibold text-primary hover:underline">
                        {allDays ? "Az göstər" : `+${facets.days.length - 8} gün`}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </Section>

            {facets.hasRetakes && (
              <Section icon={FiLayers} title="Cəhdlər">
                <Segmented label="Cəhdlər" options={ATTEMPT_MODES} value={f.attempts} onChange={(v) => set({ attempts: v })} />
                <p className="mt-2 text-xs text-muted">{ATTEMPT_MODES.find((m) => m.key === f.attempts)?.hint}</p>
              </Section>
            )}

            <Section icon={FiTrendingUp} title="Nəticə">
              {facets.passMark > 0 && (
                <Segmented
                  label="Nəticə"
                  options={[
                    { key: "all", label: "Hamısı" },
                    { key: "passed", label: `Keçənlər (≥${facets.passMark})` },
                    { key: "failed", label: "Keçməyənlər" },
                  ]}
                  value={f.outcome}
                  onChange={(v) => set({ outcome: v })}
                />
              )}
              <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                <label className="text-xs font-semibold text-muted">
                  Ən az bal
                  <input type="number" inputMode="decimal" min={0} max={totalMarks} placeholder="0" value={f.minScore} onChange={(e) => set({ minScore: e.target.value })} className={`${numInput} mt-1`} />
                </label>
                <span className="pb-2.5 text-muted">—</span>
                <label className="text-xs font-semibold text-muted">
                  Ən çox bal
                  <input type="number" inputMode="decimal" min={0} max={totalMarks} placeholder={String(totalMarks)} value={f.maxScore} onChange={(e) => set({ maxScore: e.target.value })} className={`${numInput} mt-1`} />
                </label>
              </div>
            </Section>

            {(facets.hasTerminated || (facets.hasPaper && facets.hasOnline)) && (
              <Section icon={FiShield} title="Pozuntu və mənbə">
                <div className="flex flex-col gap-3">
                  {facets.hasTerminated && (
                    <Segmented
                      label="Pozuntu"
                      options={[
                        { key: "all", label: "Hamısı" },
                        { key: "clean", label: "Pozuntusuz" },
                        { key: "terminated", label: "Dayandırılanlar" },
                      ]}
                      value={f.conduct}
                      onChange={(v) => set({ conduct: v })}
                    />
                  )}
                  {facets.hasPaper && facets.hasOnline && (
                    <Segmented
                      label="Mənbə"
                      options={[
                        { key: "all", label: "Hamısı" },
                        { key: "online", label: "Onlayn" },
                        { key: "paper", label: "Kağız" },
                      ]}
                      value={f.source}
                      onChange={(v) => set({ source: v })}
                    />
                  )}
                </div>
              </Section>
            )}

            {facets.grades.length > 1 && (
              <Section icon={FiUsers} title="Sinif">
                <div className="flex flex-wrap gap-2">
                  {facets.grades.map((g) => {
                    const on = f.grades.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => set({ grades: on ? f.grades.filter((x) => x !== g) : [...f.grades, g] })}
                        className={chip(on)}
                        aria-pressed={on}
                      >
                        {gradeName(g)}
                      </button>
                    );
                  })}
                </div>
              </Section>
            )}

            <Section icon={FiSearch} title="Şagird">
              <div className="relative">
                <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={f.query}
                  onChange={(e) => set({ query: e.target.value })}
                  placeholder="Ad, e-poçt və ya nömrə…"
                  className={`${numInput} h-11 pl-10`}
                />
              </div>
            </Section>
          </div>

          {/* ── Live summary ── */}
          <aside className="border-t border-line bg-surface2/40 px-5 py-5 sm:px-7 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:px-6">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Faylda olacaq</p>
            <div className="mt-2 flex items-end gap-2">
              <span key={sum.count} className="font-display text-5xl font-black leading-none tabular-nums text-text animate-fade-in">
                {sum.count}
              </span>
              <span className="mb-1 text-sm font-semibold text-muted">
                nəticə{sum.students !== sum.count ? ` · ${sum.students} şagird` : ""}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">{facets.total} nəticədən</p>

            {!empty ? (
              <>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    ["Orta", fmt1(sum.avg)],
                    ["Ən yüksək", fmt1(sum.top)],
                    [facets.passMark ? "Keçən" : "Ən aşağı", facets.passMark ? `${sum.passed}/${sum.count}` : fmt1(sum.low)],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-2xl border border-line bg-surface px-3 py-2.5">
                      <p className="text-[11px] font-semibold text-muted">{k}</p>
                      <p className="font-display text-lg font-bold tabular-nums text-text">{v}</p>
                    </div>
                  ))}
                </div>

                {/* Score distribution */}
                <div className="mt-4 rounded-2xl border border-line bg-surface p-3">
                  <p className="mb-2 text-[11px] font-semibold text-muted">Bal bölgüsü</p>
                  <div className="flex h-16 items-end gap-1.5" aria-hidden="true">
                    {bands.map((b, i) => (
                      <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
                        <span className="text-[10px] font-bold tabular-nums text-muted">{b.n || ""}</span>
                        <div className="w-full rounded-md bg-primary/80 transition-[height] duration-300 ease-out" style={{ height: `${Math.max(b.n ? 8 : 2, b.h * 44)}px`, opacity: b.n ? 0.35 + 0.65 * b.h : 0.15 }} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 flex gap-1.5">
                    {bands.map((b, i) => (
                      <span key={i} className="flex-1 text-center text-[10px] tabular-nums text-muted">
                        {b.from}–{b.to}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <ul className="mt-4 flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
                  {[...filtered]
                    .sort((a, b) => (Number(b.earnPoints) || 0) - (Number(a.earnPoints) || 0))
                    .slice(0, 5)
                    .map((r) => {
                      const d = r.createdAt ? new Date(r.createdAt) : null;
                      return (
                        <li key={r._id} className="flex items-center justify-between gap-3 px-3 py-2">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-text">{r.userId?.name || "—"}</span>
                            <span className="text-[11px] text-muted">
                              {d ? `${shortDay(d)} · ${pad(d.getHours())}:${pad(d.getMinutes())}` : ""}
                              {r.terminated ? " · pozuntu" : ""}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-0.5 text-sm font-bold tabular-nums text-primary">{fmt1(r.earnPoints)}</span>
                        </li>
                      );
                    })}
                  {filtered.length > 5 && <li className="px-3 py-2 text-xs font-semibold text-muted">və daha {filtered.length - 5} nəticə</li>}
                </ul>
              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-line bg-surface p-5 text-center">
                <FiFilter className="mx-auto text-2xl text-muted" />
                <p className="mt-2 text-sm font-semibold text-text">Bu filtrə uyğun nəticə yoxdur</p>
                <p className="mt-1 text-xs text-muted">Tarixi genişləndirin və ya filtrləri sıfırlayın.</p>
              </div>
            )}

            {labels.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-muted">Seçilmiş filtrlər · faylda yazılacaq</p>
                  <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    <FiRotateCcw /> Sıfırla
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {labels.map((l) => (
                    <span key={l} className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* ── Download ── */}
        <footer className="border-t border-line bg-surface px-4 py-3 sm:px-7 sm:py-4">
          {/* Phones: the summary sits below the filters, so keep the live count
              in sight right above the download buttons. */}
          <div className="mb-2.5 flex items-center justify-between gap-3 lg:hidden" aria-live="polite">
            <p className="text-sm text-muted">
              Faylda:{" "}
              <span key={sum.count} className="font-display text-base font-bold tabular-nums text-text animate-fade-in">
                {sum.count}
              </span>{" "}
              nəticə
              {labels.length > 0 && <span className="text-xs"> · {labels.length} filtr</span>}
            </p>
            {labels.length > 0 && (
              <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <FiRotateCcw /> Sıfırla
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {FORMATS.map((fm) => {
            const Icon = fm.icon;
            const isBusy = busy === fm.key;
            return (
              <button
                key={fm.key}
                type="button"
                disabled={empty || !!busy}
                onClick={() => run(fm.key)}
                className={`group flex min-h-[3.5rem] items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-[background-color,border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50 sm:px-4 ${
                  fm.primary
                    ? "border-primary bg-primary text-primary-fg shadow-soft hover:bg-primary-hover hover:shadow-glow"
                    : "border-line bg-surface text-text hover:border-primary/40 hover:bg-surface2"
                }`}
              >
                <span className={`hidden h-10 w-10 shrink-0 place-items-center rounded-xl sm:grid ${fm.primary ? "bg-white/15" : "bg-primary/10 text-primary"}`}>
                  {isBusy ? <Spinner size={18} /> : <Icon className="text-lg" />}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-bold">
                    <span className="sm:hidden">{isBusy ? <Spinner size={14} /> : <Icon />}</span>
                    {isBusy ? "Hazırlanır…" : fm.title}
                  </span>
                  <span className={`hidden truncate text-xs sm:block ${fm.primary ? "text-primary-fg/80" : "text-muted"}`}>{fm.desc}</span>
                </span>
              </button>
            );
          })}
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}

// Small trigger used on the results page: shows how many filters are on.
export function ExportButton({ onClick, activeCount = 0, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-glow disabled:pointer-events-none disabled:opacity-50"
    >
      <FiFileText /> Nəticələri ixrac et
      {activeCount > 0 && (
        <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-white/90 px-1 text-[11px] font-bold text-primary" title="Aktiv filtr sayı">
          {activeCount}
        </span>
      )}
    </button>
  );
}
