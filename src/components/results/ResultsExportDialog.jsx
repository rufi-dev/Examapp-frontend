import { useEffect, useMemo, useRef, useState } from "react";
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
  DATE_PRESETS,
  ATTEMPT_MODES,
  WEEKDAYS_SHORT,
  applyResultFilters,
  clearFilter,
  clockOf,
  dateWindow,
  dayKey,
  dayShort,
  defaultFilters,
  describeFilters,
  effectiveFilters,
  fileStem,
  gradeName,
  isFilterAvailable,
  rankRows,
  resultFacets,
  summarize,
  weekdayOf,
} from "../../helper/resultFilters";

/*
 * «Nəticələri ixrac et» — choose WHICH results go into the PDF / Excel before it is made:
 * a day or a date range (today, the exam day, last week…), one attempt per student,
 * passed / not passed, a score range, anti-cheat, online / paper, grade, a name. The
 * summary recounts live, and the file prints the filter it was made with.
 * Filter rules live in helper/resultFilters.js; this file only draws them.
 */

const fmt1 = (n) => (n == null ? "—" : String(Math.round(Number(n) * 10) / 10));

const chip = (active) =>
  `inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30 ${
    active
      ? "border-primary bg-primary text-primary-fg shadow-soft"
      : "border-line bg-surface text-text hover:border-primary/40 hover:bg-surface2"
  }`;

const Section = ({ icon: Icon, title, aside, children }) => (
  <section className="py-5 first:pt-1">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em] text-muted">
        <Icon className="text-[17px] text-primary" aria-hidden="true" /> {title}
      </h3>
      {aside}
    </div>
    {children}
  </section>
);

/* One choice out of a few: radio buttons drawn as a segmented bar; arrows move along it. */
function Segmented({ options, value, onChange, label }) {
  const refs = useRef([]);
  const move = (e, i) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const j = (i + d + options.length) % options.length;
    onChange(options[j].key);
    refs.current[j]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className="flex w-full gap-1 rounded-2xl border border-line bg-surface2/60 p-1">
      {options.map((o, i) => {
        const on = value === o.key;
        return (
          <button
            key={o.key}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.key)}
            onKeyDown={(e) => move(e, i)}
            className={`min-h-[2.5rem] min-w-0 flex-1 rounded-xl px-2 text-[13px] font-semibold leading-tight transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30 ${
              on ? "bg-surface text-text shadow-soft" : "text-muted hover:text-text"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const inputCls =
  "h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-3 text-[15px] text-text outline-none transition placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-ring/25";

const FORMATS = [
  { key: "results", icon: FiAward, title: "Nəticələr", desc: "Sıralama cədvəli · PDF", primary: true },
  { key: "answers", icon: FiList, title: "Cavablar", desc: "Hər şagirdin cavabları · PDF" },
  { key: "excel", icon: FiGrid, title: "Excel", desc: "Bütün məlumat · 4 vərəq" },
];

// Tab stays inside the dialog while it is open.
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

export default function ResultsExportDialog({ open, onClose, results, examName, filters, onChange }) {
  const [busy, setBusy] = useState(null); // "results" | "answers" | "excel"
  const busyRef = useRef(false); // a second click in the same moment never starts a second file
  const [allDays, setAllDays] = useState(false);
  const panel = useRef(null);
  // The latest close handler, so the focus effect runs once per opening (not on every
  // filter change, which would pull focus out of the box being typed in).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [now, setNow] = useState(() => Date.now());

  const facets = useMemo(() => resultFacets(results), [results]);
  const f = useMemo(() => effectiveFilters(filters || defaultFilters(), facets), [filters, facets]);
  const list = useMemo(() => applyResultFilters(results, f, { now, facets }), [results, f, now, facets]);
  const sum = useMemo(() => summarize(list, facets), [list, facets]);
  const lines = useMemo(() => describeFilters(f, facets, now), [f, facets, now]);
  const preview = useMemo(() => rankRows(list).slice(0, 5), [list]);

  const set = (patch) => onChange({ ...f, ...patch });
  const setDate = (patch) => set({ date: { ...f.date, ...patch } });

  // «Bu gün» is today when the dialog opens, not when the page was loaded.
  useEffect(() => {
    if (open) setNow(Date.now());
  }, [open]);

  // Focus in, Tab kept inside, Escape out, focus back where it was, page still.
  useEffect(() => {
    if (!open) return undefined;
    const before = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !busyRef.current) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      if (before && typeof before.focus === "function") before.focus();
    };
  }, [open]);

  if (!open) return null;

  const win = dateWindow(f.date, now);
  const singleDay = f.date.preset === "custom" && win.from && win.from === win.to ? win.from : null;
  const days = allDays ? facets.days : facets.days.slice(0, 8);
  const firstDay = facets.days.length ? facets.days[facets.days.length - 1].key : "";
  const lastDay = facets.days.length ? facets.days[0].key : "";
  const empty = list.length === 0;
  const close = () => !busyRef.current && onClose();

  const pickPreset = (key) => {
    if (key === "custom") setDate({ preset: "custom", from: f.date.from || firstDay, to: f.date.to || lastDay });
    else setDate({ preset: key });
  };
  const pickDay = (k) => (singleDay === k ? setDate({ preset: "all", from: "", to: "" }) : setDate({ preset: "custom", from: k, to: k }));

  const run = async (kind) => {
    if (empty || busyRef.current) return;
    busyRef.current = true;
    setBusy(kind);
    const texts = lines.map((l) => l.text);
    const stem = fileStem(examName, f, facets, now);
    try {
      if (kind === "excel") {
        const { exportResultsExcel } = await import("../ResultsExcelExport");
        await exportResultsExcel(list, { filters: texts, fileName: `${stem}_neticeler.xlsx` });
      } else {
        const { downloadResultsPdf } = await import("./ResultsFiles");
        await downloadResultsPdf(kind, list, { filters: texts, fileName: `${stem}_${kind === "answers" ? "cavablar" : "neticeler"}.pdf` });
      }
      toast.success(`Fayl hazırdır — ${list.length} nəticə`);
    } catch (e) {
      toast.error("Fayl hazırlanmadı, yenidən cəhd edin");
      // eslint-disable-next-line no-console
      console.error("results export:", e);
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const reset = () => onChange(defaultFilters());
  const bandMax = Math.max(1, ...sum.bands);
  const total = facets.maxScore;

  return createPortal(
    <div className="fixed inset-0 z-[1500] flex items-stretch justify-center sm:items-center sm:p-4">
      <button type="button" tabIndex={-1} aria-label="Bağla" onClick={close} className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm" />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        className="relative flex h-full w-full max-w-5xl animate-scale-in flex-col overflow-hidden bg-surface shadow-lift outline-none sm:h-auto sm:max-h-[92vh] sm:rounded-3xl sm:border sm:border-line"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
              <FiDownload className="text-[22px]" />
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
            onClick={close}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface2 hover:text-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
            aria-label="Bağla"
          >
            <FiX className="text-[22px]" />
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
                  <button type="button" onClick={() => set(clearFilter(f, "date"))} className="text-xs font-semibold text-primary hover:underline">
                    Təmizlə
                  </button>
                )
              }
            >
              <div className="flex flex-wrap gap-2">
                {DATE_PRESETS.map((p) => {
                  const on = f.date.preset === p.key;
                  return (
                    <button key={p.key} type="button" aria-pressed={on} onClick={() => pickPreset(p.key)} className={chip(on)}>
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {f.date.preset === "custom" && (
                <div className="mt-3 grid grid-cols-2 gap-3 animate-fade-in">
                  <label className="text-xs font-semibold text-muted">
                    Başlanğıc
                    <input type="date" value={f.date.from} min={firstDay || undefined} max={lastDay || undefined} onChange={(e) => setDate({ from: e.target.value })} className={`${inputCls} mt-1`} />
                  </label>
                  <label className="text-xs font-semibold text-muted">
                    Son
                    <input type="date" value={f.date.to} min={firstDay || undefined} max={lastDay || undefined} onChange={(e) => setDate({ to: e.target.value })} className={`${inputCls} mt-1`} />
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
                          aria-pressed={on}
                          aria-label={`${dayShort(d.key)}, ${WEEKDAYS_SHORT[weekdayOf(d.key)]}: ${d.count} nəticə`}
                          onClick={() => pickDay(d.key)}
                          className={`group inline-flex min-h-[2.75rem] items-center gap-2 rounded-2xl border py-1.5 pl-3 pr-1.5 text-left transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30 ${
                            on ? "border-primary bg-primary/10" : "border-line bg-surface hover:border-primary/40 hover:bg-surface2"
                          }`}
                        >
                          <span className="flex flex-col leading-tight">
                            <span className={`text-sm font-bold tabular-nums ${on ? "text-primary" : "text-text"}`}>{dayShort(d.key)}</span>
                            <span className="text-[11px] text-muted">{WEEKDAYS_SHORT[weekdayOf(d.key)]}</span>
                          </span>
                          <span className={`grid min-w-[1.75rem] place-items-center rounded-xl px-1.5 py-1 text-xs font-bold tabular-nums ${on ? "bg-primary text-primary-fg" : "bg-surface2 text-muted group-hover:text-text"}`}>
                            {d.count}
                          </span>
                        </button>
                      );
                    })}
                    {facets.days.length > 8 && (
                      <button type="button" onClick={() => setAllDays((v) => !v)} className="min-h-[2.75rem] rounded-2xl px-3 text-sm font-semibold text-primary hover:underline">
                        {allDays ? "Az göstər" : `+${facets.days.length - 8} gün`}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </Section>

            {isFilterAvailable("attempts", facets) && (
              <Section icon={FiLayers} title="Cəhdlər">
                <Segmented label="Cəhdlər" options={ATTEMPT_MODES} value={f.attempts} onChange={(v) => set({ attempts: v })} />
                <p className="mt-2 text-xs text-muted">{ATTEMPT_MODES.find((m) => m.key === f.attempts)?.hint}</p>
              </Section>
            )}

            <Section icon={FiTrendingUp} title="Nəticə">
              {isFilterAvailable("outcome", facets) && (
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
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={f.score.min}
                    onChange={(e) => set({ score: { ...f.score, min: e.target.value } })}
                    className={`${inputCls} mt-1`}
                  />
                </label>
                <span className="pb-3 text-muted">—</span>
                <label className="text-xs font-semibold text-muted">
                  Ən çox bal
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={String(total)}
                    value={f.score.max}
                    onChange={(e) => set({ score: { ...f.score, max: e.target.value } })}
                    className={`${inputCls} mt-1`}
                  />
                </label>
              </div>
            </Section>

            {(isFilterAvailable("conduct", facets) || isFilterAvailable("source", facets)) && (
              <Section icon={FiShield} title="Pozuntu və mənbə">
                <div className="flex flex-col gap-3">
                  {isFilterAvailable("conduct", facets) && (
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
                  {isFilterAvailable("source", facets) && (
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

            {isFilterAvailable("grades", facets) && (
              <Section icon={FiUsers} title="Sinif">
                <div className="flex flex-wrap gap-2">
                  {facets.grades.map((g) => {
                    const on = f.grades.includes(g);
                    return (
                      <button key={g} type="button" aria-pressed={on} onClick={() => set({ grades: on ? f.grades.filter((x) => x !== g) : [...f.grades, g] })} className={chip(on)}>
                        {gradeName(g)}
                      </button>
                    );
                  })}
                </div>
              </Section>
            )}

            <Section icon={FiSearch} title="Şagird">
              <div className="relative">
                <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[17px] text-muted" />
                <input
                  type="search"
                  value={f.query}
                  onChange={(e) => set({ query: e.target.value })}
                  placeholder="Ad, e-poçt və ya nömrə…"
                  aria-label="Şagird axtar"
                  className={`${inputCls} pl-10`}
                />
              </div>
            </Section>
          </div>

          {/* ── Live summary ── */}
          <aside className="border-t border-line bg-surface2/40 px-5 py-5 sm:px-7 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:px-6" aria-live="polite">
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
                      <p className="text-xs font-semibold text-muted">{k}</p>
                      <p className="font-display text-lg font-bold tabular-nums text-text">{v}</p>
                    </div>
                  ))}
                </div>

                {/* Score distribution */}
                <div className="mt-4 rounded-2xl border border-line bg-surface p-3">
                  <p className="mb-2 text-xs font-semibold text-muted">Bal bölgüsü</p>
                  <div className="flex h-16 items-end gap-1.5" aria-hidden="true">
                    {sum.bands.map((n, i) => (
                      <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
                        <span className="text-[11px] font-bold tabular-nums text-muted">{n || ""}</span>
                        <div
                          className="w-full rounded-md bg-primary/80 transition-[height] duration-300 ease-out"
                          style={{ height: `${Math.max(n ? 8 : 2, (n / bandMax) * 44)}px`, opacity: n ? 0.35 + (0.65 * n) / bandMax : 0.15 }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 flex gap-1.5" aria-hidden="true">
                    {sum.bands.map((_, i) => (
                      <span key={i} className="flex-1 text-center text-[11px] tabular-nums text-muted">
                        {Math.round((total * i) / 5)}–{Math.round((total * (i + 1)) / 5)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <ul className="mt-4 flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
                  {preview.map((r) => (
                    <li key={r._id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-text">{r.userId?.name || "—"}</span>
                        <span className="text-xs text-muted">
                          {r.createdAt ? `${dayShort(dayKey(r.createdAt))} · ${clockOf(r.createdAt)}` : ""}
                          {r.terminated ? " · pozuntu" : ""}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-0.5 text-sm font-bold tabular-nums text-primary">{fmt1(r.earnPoints)}</span>
                    </li>
                  ))}
                  {list.length > 5 && <li className="px-3 py-2 text-xs font-semibold text-muted">və daha {list.length - 5} nəticə</li>}
                </ul>
              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-line bg-surface p-5 text-center">
                <FiFilter className="mx-auto text-2xl text-muted" />
                <p className="mt-2 text-sm font-semibold text-text">Bu filtrə uyğun nəticə yoxdur</p>
                <p className="mt-1 text-xs text-muted">Tarixi genişləndirin və ya filtrləri sıfırlayın.</p>
              </div>
            )}

            {lines.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted">Seçilmiş filtrlər · faylda yazılacaq</p>
                  <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    <FiRotateCcw /> Sıfırla
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {lines.map((l) => (
                    <span key={l.key} className="inline-flex items-center gap-1 rounded-lg bg-primary/10 py-1 pl-2 pr-1 text-xs font-semibold text-primary">
                      {l.text}
                      <button
                        type="button"
                        onClick={() => set(clearFilter(f, l.key))}
                        aria-label={`${l.text} filtrini sil`}
                        className="grid h-6 w-6 place-items-center rounded-md hover:bg-primary/15"
                      >
                        <FiX />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* ── Download ── */}
        <footer className="border-t border-line bg-surface px-4 py-3 sm:px-7 sm:py-4">
          {/* Phones: the summary sits below the filters, so keep the live count in
              sight right above the download buttons. */}
          <div className="mb-2.5 flex items-center justify-between gap-3 lg:hidden">
            <p className="text-sm text-muted">
              Faylda:{" "}
              <span key={sum.count} className="font-display text-base font-bold tabular-nums text-text animate-fade-in">
                {sum.count}
              </span>{" "}
              nəticə
              {lines.length > 0 && <span className="text-xs"> · {lines.length} filtr</span>}
            </p>
            {lines.length > 0 && (
              <button type="button" onClick={reset} className="inline-flex min-h-[2.25rem] items-center gap-1 text-xs font-semibold text-primary">
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
                  className={`group flex min-h-[3.5rem] flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2.5 text-center transition-[background-color,border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 sm:flex-row sm:justify-start sm:gap-3 sm:px-4 sm:text-left ${
                    fm.primary
                      ? "border-primary bg-primary text-primary-fg shadow-soft hover:bg-primary-hover hover:shadow-glow"
                      : "border-line bg-surface text-text hover:border-primary/40 hover:bg-surface2"
                  }`}
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl sm:h-10 sm:w-10 ${fm.primary ? "bg-white/15" : "bg-primary/10 text-primary"}`}>
                    {isBusy ? <Spinner size={18} /> : <Icon className="text-[20px]" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{isBusy ? "Hazırlanır…" : fm.title}</span>
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

// The trigger on the results page: shows how many filters are on.
export function ExportButton({ onClick, activeCount = 0, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-glow focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
    >
      <FiFileText className="text-[18px]" /> Nəticələri ixrac et
      {activeCount > 0 && (
        <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-white/90 px-1 text-[11px] font-bold text-primary" title="Aktiv filtr sayı">
          {activeCount}
        </span>
      )}
    </button>
  );
}
