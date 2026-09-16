import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiPlus,
  FiCamera,
  FiKey,
  FiBarChart2,
  FiDownload,
  FiUploadCloud,
  FiCheckCircle,
  FiClock,
  FiEyeOff,
  FiAlertTriangle,
  FiX,
  FiSearch,
  FiFolder,
} from "react-icons/fi";
import AccountLayout from "../../components/AccountLayout";
import Button from "../../components/ui/Button";
import Spinner from "../../components/Spinner";
import DateTimePicker from "../../components/ui/DateTimePicker";
import { Field, inputClass } from "../../components/ui/Field";
import Select from "../../components/ui/Select";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { useSelector } from "react-redux";
import { formatDateTime, toUtcIso } from "../../helper/datetime";
import { fetchPaperExams, createPaperExam, apiError } from "../../helper/paperApi";
import { fetchMyClasses } from "../../helper/classApi";
import MoveExamDialog from "../../components/MoveExamDialog";

/*
 * "Kağız imtahanları" — the home of paper exams, deliberately unlike the exam
 * cards used elsewhere: a sheet-shaped thumbnail per exam and one wide row each,
 * because these are physical answer cards moving through a pipeline
 * (açar → vərəqlər → yoxlama), not content a student browses and buys.
 * Paper exams appear ONLY here: they are filtered out of classes, the dashboard
 * and "İmtahanlarım".
 */

// The CAVAB KARTI itself, in miniature — the page's recurring motif.
const SheetThumb = ({ marked = 3, className = "" }) => (
  <svg viewBox="0 0 52 66" className={className} aria-hidden>
    <rect x="0.75" y="0.75" width="50.5" height="64.5" rx="5" className="fill-surface stroke-line" strokeWidth="1.5" />
    <rect x="6" y="6" width="40" height="7" rx="2" className="fill-surface2" />
    {[0, 1, 2, 3, 4].map((r) => (
      <g key={r}>
        {[0, 1, 2, 3].map((c) => {
          const on = r === marked % 5 && c === (r + 1) % 4;
          return (
            <circle
              key={c}
              cx={9 + c * 8}
              cy={21 + r * 8.5}
              r={2.6}
              className={on ? "fill-danger" : "fill-none stroke-danger/45"}
              strokeWidth="1"
            />
          );
        })}
        <rect x="40" y={18.5 + r * 8.5} width="7" height="5" rx="1.5" className="fill-surface2" />
      </g>
    ))}
  </svg>
);

const Chip = ({ children, tone = "muted" }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
      tone === "warn"
        ? "bg-warning/15 text-warning"
        : tone === "ok"
          ? "bg-success/12 text-success"
          : tone === "accent"
            ? "bg-accent2/12 text-accent2"
            : "bg-surface2 text-muted"
    }`}
  >
    {children}
  </span>
);

const Stat = ({ value, label }) => (
  <div>
    <p className="font-display text-2xl font-extrabold leading-none tabular-nums text-text">{value}</p>
    <p className="mt-1 text-xs font-medium text-muted">{label}</p>
  </div>
);

// One exam = one wide sheet row.
const ExamRow = ({ exam, staff, onOpen, onMove }) => {
  const ready = exam.questionCount > 0;
  const progress = exam.sheets && staff ? Math.min(100, Math.round((exam.sheets / Math.max(exam.sheets, 1)) * 100)) : 0;
  return (
    <li className="group relative overflow-hidden rounded-2xl border border-line bg-surface transition-all duration-200 ease-out-quint hover:-translate-y-0.5 hover:shadow-lift">
      {/* dashed spine, echoing the card's centre divider */}
      <span aria-hidden className="absolute inset-y-4 left-[86px] hidden w-px border-l border-dashed border-line sm:block" />
      {staff && exam.needsReview > 0 && (
        <span className="absolute right-0 top-0 rounded-bl-xl bg-accent2 px-2.5 py-1 text-[11px] font-bold text-white">
          {exam.needsReview} yoxlanmalı
        </span>
      )}
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
        <SheetThumb marked={exam.name.length} className="h-[68px] w-[54px] shrink-0 drop-shadow-sm" />

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold text-text">{exam.name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {exam.className && <Chip>{exam.className}</Chip>}
            <Chip tone={ready ? "ok" : "warn"}>{ready ? `${exam.questionCount} sual` : "Açar yoxdur"}</Chip>
            {exam.hidden && (
              <Chip>
                <FiEyeOff /> Gizli
              </Chip>
            )}
            {exam.paperSelfUpload && staff && (
              <Chip tone="accent">
                <FiUploadCloud /> Şagird yükləyə bilər
              </Chip>
            )}
            {(exam.startDate || exam.endDate) && (
              <Chip>
                <FiClock />
                {exam.endDate ? `son: ${formatDateTime(exam.endDate)}` : `başlama: ${formatDateTime(exam.startDate)}`}
              </Chip>
            )}
          </div>
        </div>

        {staff ? (
          <>
            <div className="flex shrink-0 items-center gap-5 sm:pr-2">
              <div className="text-center">
                <p className="font-display text-2xl font-extrabold leading-none tabular-nums text-text">{exam.sheets}</p>
                <p className="mt-0.5 text-[11px] text-muted">vərəq</p>
              </div>
              <div
                aria-hidden
                className="hidden h-10 w-px bg-line sm:block"
                style={{ opacity: progress ? 1 : 0.5 }}
              />
              <div className="text-center">
                <p className="font-display text-2xl font-extrabold leading-none tabular-nums text-accent2">
                  {exam.needsReview}
                </p>
                <p className="mt-0.5 text-[11px] text-muted">yoxlanmalı</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button to={`/exam/${exam._id}/paper`} size="sm">
                <FiCamera /> Vərəqləri yoxla
              </Button>
              <Button to={`/exam/${exam._id}/addQuestion`} variant="secondary" size="sm">
                <FiKey /> Açar
              </Button>
              <Button to={`/exam/${exam._id}/resultsByExam`} variant="secondary" size="sm">
                <FiBarChart2 /> Nəticələr
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onMove?.(exam)}>
                <FiFolder /> Sinif
              </Button>
            </div>
          </>
        ) : (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {exam.submitted ? (
              <>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                  <FiCheckCircle /> Təqdim edilib
                </span>
                <Button to={`/exam/${exam._id}/result`} variant="secondary" size="sm">
                  <FiBarChart2 /> Nəticəm
                </Button>
              </>
            ) : !exam.window?.open ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface2 px-3 py-2 text-sm font-semibold text-muted">
                <FiClock /> {exam.window?.message || "Bağlıdır"}
              </span>
            ) : (
              <Button to={`/exam/${exam._id}/paper/upload`} size="sm" onClick={onOpen}>
                <FiUploadCloud /> {exam.startedUpload ? "Davam et" : "Vərəqini yüklə"}
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
};

const PaperExams = () => {
  useRedirectLoggedOutUser("/login");
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const staff = user?.role === "admin" || user?.role === "teacher";

  const [exams, setExams] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [classes, setClasses] = useState([]);
  const [creating, setCreating] = useState(false);
  const [moving, setMoving] = useState(null); // exam whose class is being changed
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    classId: "",
    totalMarks: 100,
    passingMarks: 50,
    startDate: null,
    endDate: null,
    paperSelfUpload: true,
  });

  const load = useCallback(async () => {
    try {
      setExams(await fetchPaperExams());
      setError("");
    } catch (e) {
      setError(apiError(e, "Məlumat yüklənmədi"));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!staff) return;
    fetchMyClasses()
      .then((list) => {
        setClasses(list || []);
        setForm((f) => (f.classId ? f : { ...f, classId: list?.[0]?._id || "" }));
      })
      .catch(() => setClasses([]));
  }, [staff]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("İmtahan adını yazın");
    if (!form.classId) return toast.error("Sinif seçin");
    setSaving(true);
    try {
      const res = await createPaperExam({
        ...form,
        name: form.name.trim(),
        startDate: form.startDate ? toUtcIso(form.startDate) : null,
        endDate: form.endDate ? toUtcIso(form.endDate) : null,
      });
      toast.success("Kağız imtahanı yaradıldı — indi cavab açarını daxil edin");
      navigate(`/exam/${res.exam._id}/addQuestion`);
    } catch (err) {
      toast.error(apiError(err, "Yaradılmadı"));
    } finally {
      setSaving(false);
    }
  };

  const list = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("az");
    const all = exams || [];
    return q
      ? all.filter(
          (e) =>
            String(e.name || "").toLocaleLowerCase("az").includes(q) ||
            String(e.className || "").toLocaleLowerCase("az").includes(q)
        )
      : all;
  }, [exams, query]);

  const totals = useMemo(() => {
    const all = exams || [];
    return {
      exams: all.length,
      sheets: all.reduce((s, e) => s + (e.sheets || 0), 0),
      review: all.reduce((s, e) => s + (e.needsReview || 0), 0),
    };
  }, [exams]);

  return (
    <AccountLayout
      title="Kağız imtahanları"
      subtitle="Sinifdə cavab kartı ilə keçirilən imtahanlar — yaradın, vərəqləri oxudun, yoxlayın."
      actions={
        staff && (
          <Button onClick={() => setCreating((v) => !v)} size="lg">
            {creating ? <FiX /> : <FiPlus />} {creating ? "Bağla" : "Yeni kağız imtahanı"}
          </Button>
        )
      }
    >
      {/* Intro band with the card motif — sets this page apart from exam cards. */}
      <section className="mb-6 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-accent2/[0.07] via-surface to-surface shadow-soft">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent2/12 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-accent2">
              CAVAB KARTI
            </span>
            <h2 className="mt-3 font-display text-xl font-extrabold text-text sm:text-2xl">
              Vərəqi platforma oxuyur, siz təsdiqləyirsiniz
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              İmtahanı burada yaradın və cavab açarını daxil edin. Vərəqin şəklini siz və ya şagird yükləyir; qapalı
              suallar pulsuz oxunur, oxunmayan cavablar sizə göstərilir.
            </p>
            {staff && (
              <div className="mt-5 flex items-center gap-7">
                <Stat value={totals.exams} label="imtahan" />
                <Stat value={totals.sheets} label="yoxlanmış vərəq" />
                <Stat value={totals.review} label="yoxlanmalı" />
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <SheetThumb marked={2} className="h-28 w-[88px] rotate-[-4deg] drop-shadow-md" />
            <SheetThumb marked={4} className="hidden h-24 w-[76px] rotate-[5deg] opacity-80 drop-shadow sm:block" />
            {staff && (
              <a
                href="/cavab-karti.pdf"
                download="Cavab_Karti_A4.pdf"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-text transition-colors hover:bg-surface2"
              >
                <FiDownload /> Cavab kartı (A4)
              </a>
            )}
          </div>
        </div>
      </section>

      {/* One-step creation, inline — no class → exam → mode detour. */}
      {staff && creating && (
        <form
          onSubmit={submit}
          className="animate-fade-in mb-6 rounded-3xl border border-primary/30 bg-surface p-5 shadow-soft sm:p-6"
        >
          <p className="font-display text-lg font-bold text-text">Yeni kağız imtahanı</p>
          <p className="mt-1 text-sm text-muted">
            Yaratdıqdan sonra birbaşa cavab açarına keçirsiniz. Müddət və PDF lazım deyil.
          </p>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Field label="İmtahan adı" htmlFor="pe-name" required>
              <input
                id="pe-name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                className={inputClass}
                placeholder="Məsələn: Buraxılış sınağı #4"
              />
            </Field>
            <Field label="Sinif" htmlFor="pe-class" required hint="Şagirdlər vərəqi bu sinif üzərindən yükləyir">
              <Select
                id="pe-class"
                value={form.classId}
                onChange={(v) => setField("classId", v)}
                placeholder={classes.length ? "Sinif seç" : "Sinif yoxdur"}
                options={classes.map((c) => ({ value: String(c._id), label: c.name }))}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Ümumi bal" htmlFor="pe-total" required>
                <input
                  id="pe-total"
                  type="number"
                  value={form.totalMarks}
                  onChange={(e) => setField("totalMarks", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Keçid balı" htmlFor="pe-pass" required>
                <input
                  id="pe-pass"
                  type="number"
                  value={form.passingMarks}
                  onChange={(e) => setField("passingMarks", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Başlanma" htmlFor="pe-start" hint="İstəyə bağlı">
                <DateTimePicker id="pe-start" value={form.startDate || ""} onChange={(v) => setField("startDate", v)} />
              </Field>
              <Field label="Bitmə" htmlFor="pe-end" hint="Boş qalsa vaxt limiti yoxdur">
                <DateTimePicker
                  id="pe-end"
                  value={form.endDate || ""}
                  onChange={(v) => setField("endDate", v)}
                  align="right"
                />
              </Field>
            </div>
          </div>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface2/40 p-3.5">
            <input
              type="checkbox"
              checked={form.paperSelfUpload}
              onChange={(e) => setField("paperSelfUpload", e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--primary))]"
            />
            <span className="text-sm text-text">
              Şagird öz vərəqini yükləyə bilsin
              <span className="mt-0.5 block text-xs text-muted">
                Şagird şəkli çəkir, cavabları yoxlayıb bir dəfə təqdim edir; sizə “yoxlanmalı” kimi gəlir.
              </span>
            </span>
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
              Ləğv et
            </Button>
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? <Spinner size={16} /> : <FiPlus />} Yarat və açara keç
            </Button>
          </div>
        </form>
      )}

      {exams === null ? (
        <div className="flex justify-center py-24">
          <Spinner size={36} className="text-primary" />
        </div>
      ) : error ? (
        <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-8 text-center shadow-soft">
          <FiAlertTriangle className="mx-auto mb-3 text-3xl text-danger" />
          <p className="font-display text-lg font-bold text-text">{error}</p>
          <Button className="mt-5" onClick={load}>
            Yenidən cəhd et
          </Button>
        </div>
      ) : !exams.length ? (
        <div className="rounded-3xl border-2 border-dashed border-line bg-surface p-12 text-center sm:p-16">
          <SheetThumb marked={1} className="mx-auto h-24 w-20 rotate-[-3deg]" />
          <p className="mt-5 font-display text-xl font-bold text-text">
            {staff ? "Hələ kağız imtahanı yoxdur" : "Sənin üçün kağız imtahanı yoxdur"}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            {staff
              ? "Cavab kartını çap edin, imtahanı burada yaradın və cavab açarını daxil edin — sonra vərəqləri yükləyib yoxlayarsınız."
              : "Müəllimin kağız imtahanı təyin edəndə burada görünəcək və vərəqini buradan yükləyə biləcəksən."}
          </p>
          {staff && (
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <Button size="lg" onClick={() => setCreating(true)}>
                <FiPlus /> Yeni kağız imtahanı
              </Button>
              <a
                href="/cavab-karti.pdf"
                download="Cavab_Karti_A4.pdf"
                className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-text transition-colors hover:bg-surface2"
              >
                <FiDownload /> Cavab kartını yüklə
              </a>
            </div>
          )}
        </div>
      ) : (
        <>
          {exams.length > 4 && (
            <div className="relative mb-4 max-w-sm">
              <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="search"
                placeholder="İmtahan və ya sinif axtar…"
                className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-sm text-text outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-ring/25"
              />
            </div>
          )}
          <ol className="space-y-3">
            {list.map((exam) => (
              <ExamRow key={exam._id} exam={exam} staff={staff} onOpen={load} onMove={setMoving} />
            ))}
            {!list.length && (
              <li className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">
                “{query}” üçün nəticə yoxdur
              </li>
            )}
          </ol>
        </>
      )}

      <MoveExamDialog open={!!moving} exam={moving} onClose={() => setMoving(null)} onMoved={load} />
    </AccountLayout>
  );
};

export default PaperExams;
