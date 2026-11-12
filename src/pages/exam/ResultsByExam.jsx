import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getResultsByExam } from "../../../redux/features/quiz/resultSlice";
import { useParams, Link } from "react-router-dom";
import ResultCard from "../../components/ResultCard";
import Loader from "../../components/Loader";
import AccountLayout from "../../components/AccountLayout";
import ExamAnalytics from "../../components/analytics/ExamAnalytics";
import { FiAlertTriangle, FiFileText, FiEye, FiSearch, FiX, FiCamera } from "react-icons/fi";
import { AwayChip, PardonButton } from "../../components/AwayInfo";
import ResultsExportDialog, { ExportButton } from "../../components/results/ResultsExportDialog";
import { defaultFilters, describeFilters, resultFacets } from "../../helper/resultFilters";

// The export filters are remembered per exam for this browser session, so
// closing and reopening the export panel (or reloading) keeps the selection.
// (An older saved shape is fine: the filter module fills in what is missing.)
const filterKey = (examId) => `resultsExportFilters_${examId}`;
const loadFilters = (examId) => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(filterKey(examId)) || "null");
    if (saved && typeof saved === "object") return { ...defaultFilters(), ...saved };
  } catch {
    /* ignore */
  }
  return defaultFilters();
};

const ResultsByExam = () => {
  const dispatch = useDispatch();
  const { examId } = useParams();
  const { resultsByExam, isLoading } = useSelector((state) => state.result);
  const [tab, setTab] = useState("analytics"); // "analytics" | "students"
  const [query, setQuery] = useState(""); // student search (name / email / phone)
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFilters, setExportFilters] = useState(() => loadFilters(examId));

  useEffect(() => {
    dispatch(getResultsByExam(examId));
  }, [dispatch, examId]);

  useEffect(() => {
    setExportFilters(loadFilters(examId));
  }, [examId]);

  const changeExportFilters = (next) => {
    setExportFilters(next);
    try {
      sessionStorage.setItem(filterKey(examId), JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  // Active-filter badge: counted the way the dialog applies them (a filter these
  // results can't use is off, so it never shows in the count).
  const exportFacets = useMemo(
    () => resultFacets(Array.isArray(resultsByExam) ? resultsByExam : []),
    [resultsByExam]
  );
  const activeExportFilters = useMemo(
    () => describeFilters(exportFilters, exportFacets).length,
    [exportFilters, exportFacets]
  );

  if (isLoading) {
    return <Loader />;
  }

  const results = Array.isArray(resultsByExam) ? resultsByExam : [];
  const passingMarks = results[0]?.examId?.passingMarks;

  // Client-side student search: match name / email / phone (case-insensitive;
  // phone matches on digits only so "+994 50" and "05055" both work).
  const q = query.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  const filteredResults = q
    ? results.filter((r) => {
        const u = r.userId || {};
        const name = (u.name || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const phone = (u.phone || "").replace(/\D/g, "");
        return (
          name.includes(q) ||
          email.includes(q) ||
          (qDigits.length >= 2 && phone.includes(qDigits))
        );
      })
    : results;

  const tabBtn = (active) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
      active ? "bg-primary text-primary-fg shadow-soft" : "text-muted hover:text-text"
    }`;

  return (
    <AccountLayout
      title="İmtahan nəticələri"
      subtitle="Sinfin ümumi mənzərəsi və hər şagirdin cavabları."
      actions={
        <ExportButton
          onClick={() => setExportOpen(true)}
          activeCount={activeExportFilters}
          disabled={!results.length}
        />
      }
    >
      <ResultsExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        results={results}
        examName={results[0]?.examId?.name || "İmtahan"}
        filters={exportFilters}
        onChange={changeExportFilters}
      />
      <div className="mb-6 inline-flex rounded-xl border border-line bg-surface2/50 p-1">
        <button type="button" onClick={() => setTab("analytics")} className={tabBtn(tab === "analytics")}>
          Analitika
        </button>
        <button type="button" onClick={() => setTab("students")} className={tabBtn(tab === "students")}>
          Şagirdlər ({results.length})
        </button>
      </div>

      {results.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-surface p-16 text-center text-muted">
          Hələ nəticə yoxdur.
        </div>
      ) : tab === "analytics" ? (
        <ExamAnalytics results={results} passingMarks={passingMarks} />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Search students by name / email / phone. */}
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              inputMode="search"
              placeholder="Ad, e-poçt və ya nömrə ilə axtar…"
              className="h-12 w-full rounded-2xl border border-line bg-surface pl-11 pr-11 text-[15px] text-text shadow-soft outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-ring/25"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
                aria-label="Təmizlə"
              >
                <FiX />
              </button>
            )}
          </div>
          {query && (
            <p className="-mt-1 px-1 text-sm text-muted">
              <span className="font-semibold text-text">{filteredResults.length}</span> nəticə
              tapıldı
            </p>
          )}

          {filteredResults.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line bg-surface p-14 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface2 text-muted">
                <FiSearch className="text-xl" />
              </span>
              <p className="mt-3 font-semibold text-text">Şagird tapılmadı</p>
              <p className="mt-1 text-sm text-muted">
                “{query}” üçün nəticə yoxdur — adı, e-poçtu və ya nömrəni yoxlayın.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {filteredResults.map((result, index) => (
            <div
              key={result._id || index}
              className={`rounded-3xl bg-surface p-6 shadow-soft ${
                result.terminated ? "border-2 border-danger" : "border border-line"
              }`}
            >
              {result.terminated && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-danger px-4 py-2.5 text-white">
                  <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
                    <FiAlertTriangle /> Pozuntuya görə dayandırıldı ({result.violations || 0} pozuntu)
                  </span>
                  <PardonButton
                    resultId={result._id}
                    name={result.userId?.name}
                    onDone={() => dispatch(getResultsByExam(examId))}
                    className="py-1.5"
                  />
                </div>
              )}
              {result.pardonedAt && (
                <p className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-success/12 px-3 py-1 text-sm font-semibold text-success">
                  Müəllim pozuntunu ləğv edib — nəticə bərpa olunub
                </p>
              )}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-bold text-text">
                    {result.userId?.name || "—"}
                  </p>
                  <p className="text-sm text-muted">
                    {result.userId?.email}
                    {result.userId?.phone ? ` · ${result.userId.phone}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AwayChip away={result.away} />
                  {result.violations > 0 && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-danger/12 px-3 py-1 text-sm font-semibold text-danger"
                      title="Anti-cheat pozuntuları (tab keçidi / pəncərədən çıxma)"
                    >
                      <FiAlertTriangle /> {result.violations}
                    </span>
                  )}
                  {result.source === "paper" && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-accent2/12 px-3 py-1 text-sm font-semibold text-accent2"
                      title={
                        result.submittedBy === "student"
                          ? "Şagird öz cavab vərəqini yükləyib"
                          : "Kağız cavab vərəqindən yoxlanılıb"
                      }
                    >
                      <FiFileText />{" "}
                      {result.submittedBy === "student"
                        ? `Şagird yükləyib${result.studentEdited?.length ? ` · ${result.studentEdited.length} dəyişiklik` : ""}${
                            result.teacherReviewedAt ? "" : " · yoxlanmayıb"
                          }`
                        : "Kağız"}
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-full bg-primary/12 px-3 py-1 text-sm font-semibold text-primary">
                    {result.earnPoints} bal
                  </span>
                  {result.source === "paper" && result.userId?._id && (
                    <Link
                      to={`/exam/${examId}/paper?student=${result.userId._id}`}
                      title="Vərəqi yenidən yoxla və düzəliş et"
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-text transition-colors hover:bg-surface2"
                    >
                      <FiCamera /> Düzəliş
                    </Link>
                  )}
                  {result._id && (
                    <Link
                      to={`/result/${result._id}/review`}
                      title="Şagirdin cavablarına və həll şəkillərinə bax"
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/5 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                    >
                      <FiEye /> Bax
                    </Link>
                  )}
                </div>
              </div>
              <ResultCard result={result} />
            </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AccountLayout>
  );
};

export default ResultsByExam;
