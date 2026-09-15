import { useState } from "react";
import axios from "axios";
import AccountLayout from "../../components/AccountLayout";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { useDispatch, useSelector } from "react-redux";
import { addExam } from "../../../redux/features/quiz/quizSlice";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import Loader from "../../components/Loader";
import Button from "../../components/ui/Button";
import { Field, inputClass } from "../../components/ui/Field";
import FormSection from "../../components/ui/FormSection";
import ResultVisibility from "../../components/ui/ResultVisibility";
import PasswordField from "../../components/ui/PasswordField";
import MaxTryField from "../../components/ui/MaxTryField";
import PriceField from "../../components/ui/PriceField";
import VideoLinkField from "../../components/ui/VideoLinkField";
import NegativeMarkingField from "../../components/ui/NegativeMarkingField";
import AntiCheatField from "../../components/ui/AntiCheatField";
import SolutionPhotosField from "../../components/ui/SolutionPhotosField";
import StructuredGradingFields from "../../components/ui/StructuredGradingFields";
import PaperSelfUploadField from "../../components/ui/PaperSelfUploadField";
import { toUtcIso } from "../../helper/datetime";
import { PRESETS, presetOptions } from "../../helper/examPresets";
import CoverImageField from "../../components/ui/CoverImageField";
import DateTimePicker from "../../components/ui/DateTimePicker";
import { FiClock } from "react-icons/fi";

const fileInputClass =
  "block w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-text file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:font-semibold file:text-primary-fg hover:file:bg-primary-hover";

// Common exam durations (minutes) for one-tap selection.
const QUICK_MIN = [30, 45, 60, 90, 120, 180];
// Input with a leading icon (icon sits in the left padding).
const iconInputClass = inputClass.replace("px-3.5", "pl-11 pr-3.5");
const IconInput = ({ icon: Icon, children }) => (
  <div className="relative">
    <Icon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
    {children}
  </div>
);

// Red outline for a field that failed validation.
const invalid = (cls, bad) =>
  bad ? `${cls.replace("border-line", "border-danger")} ring-4 ring-danger/15 focus:border-danger` : cls;
// Same outline around a control we can't restyle directly (the date picker).
const InvalidRing = ({ bad, children }) => (
  <div className={bad ? "rounded-xl ring-2 ring-danger ring-offset-1 ring-offset-surface" : ""}>{children}</div>
);

// Negative-marking defaults when a preset doesn't use it.
const NEG_DEFAULTS = { wrongPerPenalty: 3, correctPerPenalty: 1, negMarkUntil: 0 };

const ExamAdd = () => {
  useRedirectLoggedOutUser("/login");
  const { isLoading } = useSelector((state) => state.quiz);
  const [pdf, setPdf] = useState(null);
  // "pdf" = upload a question PDF (legacy). "structured" = write native
  // questions in the in-app builder after the exam is created.
  const [source, setSource] = useState("pdf");
  // Exam preset — seeds question structure + scoring + neg-mark. Buraxılış is
  // the default (its 100-pt scoring = the legacy behavior).
  const [preset, setPreset] = useState("buraxilis");
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [maxTryEnabled, setMaxTryEnabled] = useState(false);
  const [priceEnabled, setPriceEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [negEnabled, setNegEnabled] = useState(false);
  const [antiEnabled, setAntiEnabled] = useState(false);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [partialEnabled, setPartialEnabled] = useState(false);
  const [solutionPhotosEnabled, setSolutionPhotosEnabled] = useState(false);
  const [paperSelfUpload, setPaperSelfUpload] = useState(true);
  const [coverImage, setCoverImage] = useState("");
  // field id → message, for fields that failed validation on submit.
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();
  const { classId } = useParams();
  const initialState = {
    name: "",
    videoLink: "",
    duration: 3600,
    price: 0,
    startDate: null,
    endDate: null,
    dedline: null,
    totalMarks: 100,
    passingMarks: 50,
    maxTry: 0,
    showScore: true,
    showCorrectAnswers: false,
    revealAfterEnd: true,
    password: "",
    ...NEG_DEFAULTS,
    pdfPath: null,
  };
  const [examForm, setExamForm] = useState(initialState);
  const {
    name,
    duration,
    startDate,
    endDate,
    videoLink,
    price,
    passingMarks,
    totalMarks,
    maxTry,
    showScore,
    showCorrectAnswers,
    revealAfterEnd,
    wrongPerPenalty,
    correctPerPenalty,
    negMarkUntil,
    password,
  } = examForm;

  const clearError = (...keys) =>
    setErrors((prev) => {
      if (!keys.some((k) => prev[k])) return prev;
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });

  // A preset fully defines scoring: switching presets replaces total/passing
  // marks and negative marking with the new preset's values (turning negative
  // marking off when the new preset doesn't use it), never keeping the old ones.
  const applyPreset = (id) => {
    const p = PRESETS[id];
    if (!p) return;
    setPreset(id);
    const neg = p.negativeMarking?.enabled ? p.negativeMarking : null;
    setExamForm((f) => ({
      ...f,
      totalMarks: p.totalMarks,
      passingMarks: Math.round(p.totalMarks / 2),
      ...(neg
        ? {
            wrongPerPenalty: neg.wrongPerPenalty,
            correctPerPenalty: neg.correctPerPenalty,
            negMarkUntil: neg.untilQuestion,
          }
        : NEG_DEFAULTS),
    }));
    setNegEnabled(!!neg);
    clearError("totalMarks", "passingMarks");
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setExamForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    clearError(name);
  };
  const setField = (name, value) => {
    setExamForm((f) => ({ ...f, [name]: value }));
    clearError(name, name === "startDate" ? "endDate" : name);
  };

  const dispatch = useDispatch();

  const handlePdfChange = (e) => {
    setPdf(e.target.files[0]);
    clearError("pdf");
  };

  // Every problem at once, keyed by the field's element id (in page order).
  const validate = () => {
    const isPaper = source === "paper";
    const e = {};
    if (!String(name).trim()) e.name = "İmtahan adını yazın";
    if (source === "pdf" && (!pdf || pdf.type !== "application/pdf")) e.pdf = "PDF fayl seçin";
    if (!isPaper && !(Number(duration) > 0)) e.duration = "Müddəti daxil edin";
    if (startDate && endDate) {
      const startMs = new Date(startDate).getTime();
      const endMs = new Date(endDate).getTime();
      const durSec = Number(duration) || 0;
      if (endMs <= startMs) e.endDate = "Bitmə tarixi başlanmadan sonra olmalıdır";
      else if (!isPaper && durSec > 0 && endMs - startMs < durSec * 1000)
        e.endDate = `Pəncərə müddətdən (${Math.round(durSec / 60)} dəq) qısadır`;
    }
    const total = Number(totalMarks);
    const pass = Number(passingMarks);
    if (!(total > 0)) e.totalMarks = "Ümumi balı daxil edin";
    if (!(pass > 0)) e.passingMarks = "Keçid balını daxil edin";
    else if (total > 0 && pass > total) e.passingMarks = "Keçid balı ümumi baldan çox ola bilməz";
    return e;
  };

  const addExamForm = async (e) => {
    e.preventDefault();
    const isStructured = source === "structured";
    const isPaper = source === "paper";

    const found = validate();
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      const el = document.getElementById(first);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus?.({ preventScroll: true });
      return toast.error(found[first]);
    }

    let pdfUrl;
    try {
      if (source === "pdf") {
        const pdfForm = new FormData();
        pdfForm.append("file", pdf);
        const upRes = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/quiz/uploadPdf`,
          pdfForm
        );
        pdfUrl = upRes.data?.url;
        if (!pdfUrl) return toast.error("PDF yüklənmədi");
      }

      const examData = new FormData();
      examData.append("name", name.trim());
      // Paper exams have no online timer; the backend still expects a duration.
      examData.append("duration", isPaper ? Number(duration) || 3600 : duration);
      examData.append("price", !isPaper && priceEnabled ? Number(price) || 0 : 0);
      examData.append("videoLink", videoEnabled ? videoLink : "");
      examData.append("passingMarks", passingMarks);
      examData.append("totalMarks", totalMarks);
      examData.append("maxTry", !isPaper && maxTryEnabled ? Number(maxTry) || 0 : 0);
      // Dates are optional: leaving them out means no time limit.
      if (startDate) examData.append("startDate", toUtcIso(startDate));
      if (endDate) examData.append("endDate", toUtcIso(endDate));
      examData.append("showScore", showScore);
      examData.append("showCorrectAnswers", showCorrectAnswers);
      examData.append("revealAfterEnd", revealAfterEnd);
      examData.append("password", !isPaper && passwordEnabled ? password : "");
      examData.append("negativeMarking", negEnabled);
      examData.append("wrongPerPenalty", wrongPerPenalty);
      examData.append("correctPerPenalty", correctPerPenalty);
      examData.append("negMarkUntil", negEnabled ? Number(negMarkUntil) || 0 : 0);
      examData.append("preset", preset);
      examData.append("antiCheat", !isPaper && antiEnabled);
      examData.append("mode", isStructured ? "structured" : isPaper ? "paper" : "pdf");
      examData.append("shuffleOptions", isStructured && shuffleEnabled);
      examData.append("partialCredit", isStructured && partialEnabled);
      examData.append("studentSolutionPhotos", !isPaper && solutionPhotosEnabled);
      examData.append("coverImage", coverImage || "");
      if (isPaper) examData.append("paperSelfUpload", paperSelfUpload);
      if (source === "pdf") examData.append("pdf", pdfUrl);

      const addExamData = await dispatch(addExam({ examData, classId }));

      if (addExamData.type !== "quiz/addExam/rejected") {
        // Jump straight into the question builder for the new exam so the
        // teacher can add questions + correct answers right away. Structured
        // exams go to the native builder; PDF exams to the answer-key builder.
        const newExamId = addExamData.payload?.data?._id;
        if (!newExamId) return navigate("/exam/" + classId);
        navigate(isStructured ? `/exam/${newExamId}/build` : `/exam/${newExamId}/addQuestion`);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  // Duration is stored in SECONDS (backend), but the teacher enters MINUTES.
  const durationMin = Math.round((Number(duration) || 0) / 60);
  const setDurationMin = (min) => setField("duration", Math.max(0, Math.round(Number(min) || 0)) * 60);
  const paperMode = source === "paper";

  return (
    <AccountLayout title="İmtahan əlavə et" subtitle="Yeni sınaq imtahanı yarat.">
      <form onSubmit={addExamForm} noValidate className="grid items-start gap-6 lg:grid-cols-2">
        {/* Left: core exam data */}
        <div className="space-y-6">
          <FormSection title="İmtahan məlumatı">
            <div className="space-y-5">
              <Field label="İmtahan adı" htmlFor="name" required error={errors.name}>
                <input
                  value={name}
                  onChange={handleInputChange}
                  type="text"
                  name="name"
                  id="name"
                  aria-invalid={!!errors.name}
                  className={invalid(inputClass, errors.name)}
                  placeholder="Məsələn: Buraxılış sınağı #1"
                />
              </Field>

              <CoverImageField value={coverImage} onChange={setCoverImage} />

              <Field
                label="Sual mənbəyi"
                hint={
                  source === "pdf"
                    ? "Hazır PDF faylı yüklə"
                    : paperMode
                      ? "Şagirdlər kağız cavab vərəqində yazır; siz yalnız cavab açarını daxil edirsiniz"
                      : "Sualları özün yaz və ya AI ilə PDF-dən avtomatik çıxar"
                }
              >
                <div className="grid w-full grid-cols-3 gap-1 rounded-xl border border-line bg-surface p-1">
                  <button
                    type="button"
                    onClick={() => setSource("pdf")}
                    className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${
                      source === "pdf" ? "bg-primary text-primary-fg shadow-sm" : "text-muted hover:text-text"
                    }`}
                  >
                    PDF yüklə
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSource("structured");
                      clearError("pdf");
                    }}
                    className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${
                      source === "structured" ? "bg-primary text-primary-fg shadow-sm" : "text-muted hover:text-text"
                    }`}
                  >
                    Özüm yazım / AI
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSource("paper");
                      clearError("pdf", "duration", "endDate");
                      // Paper results are graded after class — show the answers right away.
                      setExamForm((f) => ({ ...f, showCorrectAnswers: true, revealAfterEnd: false }));
                    }}
                    className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${
                      paperMode ? "bg-primary text-primary-fg shadow-sm" : "text-muted hover:text-text"
                    }`}
                  >
                    Kağız imtahanı
                  </button>
                </div>
              </Field>

              <Field
                label="İmtahan presetı"
                hint="Bal və neqativ qiymətləndirməni avtomatik qurur; sual strukturunu hazırlayır"
              >
                <div className="flex flex-wrap gap-2">
                  {presetOptions.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => applyPreset(o.value)}
                      aria-pressed={preset === o.value}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                        preset === o.value
                          ? "border-primary bg-primary text-primary-fg shadow-sm"
                          : "border-line bg-surface text-text hover:border-primary/50"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </Field>

              {source === "pdf" ? (
                <Field label="PDF fayl" htmlFor="pdf" required hint="İmtahan sualları (PDF)" error={errors.pdf}>
                  <input
                    type="file"
                    id="pdf"
                    name="pdf"
                    accept="application/pdf"
                    onChange={handlePdfChange}
                    aria-invalid={!!errors.pdf}
                    className={invalid(fileInputClass, errors.pdf)}
                  />
                </Field>
              ) : paperMode ? (
                <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3.5 text-sm">
                  <p className="font-semibold text-text">Necə işləyir?</p>
                  <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-muted">
                    <li>Yaratdıqdan sonra hər sualın düzgün cavabını daxil edirsiniz.</li>
                    <li>Şagirdlər imtahanı sinifdə cavab vərəqində yazır.</li>
                    <li>
                      Vərəqin şəklini siz və ya şagirdin özü çəkir; AI cavabları oxuyur, yoxlanıb yadda saxlanılır.
                    </li>
                  </ol>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-line bg-surface px-4 py-3 text-sm text-muted">
                  İmtahanı yaratdıqdan sonra sualları əlavə etmək üçün avtomatik olaraq sual qurğusuna yönləndiriləcəksiniz.
                </p>
              )}
            </div>
          </FormSection>

          <FormSection title={paperMode ? "Tarix" : "Vaxt və müddət"}>
            <div className="space-y-5">
              {!paperMode && (
                <Field label="Müddət (dəqiqə)" htmlFor="duration" required error={errors.duration}>
                  <IconInput icon={FiClock}>
                    <input
                      value={durationMin || ""}
                      onChange={(e) => setDurationMin(e.target.value)}
                      type="number"
                      min="0"
                      id="duration"
                      name="duration"
                      aria-invalid={!!errors.duration}
                      className={invalid(iconInputClass, errors.duration)}
                      placeholder="60"
                    />
                  </IconInput>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {QUICK_MIN.map((m) => {
                      const active = durationMin === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setDurationMin(m)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                            active
                              ? "border-primary bg-primary text-primary-fg"
                              : "border-line bg-surface text-muted hover:border-primary/50 hover:text-text"
                          }`}
                        >
                          {m < 60 ? `${m} dəq` : `${m / 60} saat`}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Başlanma tarixi" htmlFor="startDate" hint="İstəyə bağlı">
                  <DateTimePicker id="startDate" value={startDate || ""} onChange={(v) => setField("startDate", v)} />
                </Field>
                <Field label="Bitmə tarixi" htmlFor="endDate" hint="İstəyə bağlı" error={errors.endDate}>
                  <InvalidRing bad={errors.endDate}>
                    <DateTimePicker
                      id="endDate"
                      value={endDate || ""}
                      onChange={(v) => setField("endDate", v)}
                      align="right"
                    />
                  </InvalidRing>
                </Field>
              </div>
              {!startDate && !endDate && (
                <p className="-mt-2 text-xs text-muted">
                  Tarix seçilməsə, imtahan vaxt məhdudiyyəti olmadan açıq qalır.
                </p>
              )}
            </div>
          </FormSection>

          <FormSection title="Qiymətləndirmə">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Ümumi bal" htmlFor="totalMarks" required error={errors.totalMarks}>
                <input
                  value={totalMarks}
                  onChange={handleInputChange}
                  type="number"
                  id="totalMarks"
                  name="totalMarks"
                  aria-invalid={!!errors.totalMarks}
                  className={invalid(inputClass, errors.totalMarks)}
                />
              </Field>
              <Field label="Keçid balı" htmlFor="passingMarks" required error={errors.passingMarks}>
                <input
                  value={passingMarks}
                  onChange={handleInputChange}
                  type="number"
                  name="passingMarks"
                  id="passingMarks"
                  aria-invalid={!!errors.passingMarks}
                  className={invalid(inputClass, errors.passingMarks)}
                />
              </Field>
            </div>
          </FormSection>
        </div>

        {/* Right: optional settings + result visibility */}
        <div className="space-y-6">
          {paperMode && <PaperSelfUploadField enabled={paperSelfUpload} onToggle={setPaperSelfUpload} />}
          <VideoLinkField enabled={videoEnabled} value={videoLink} onToggle={setVideoEnabled} onChange={handleInputChange} />
          {!paperMode && (
            <>
              <PriceField enabled={priceEnabled} value={price} onToggle={setPriceEnabled} onChange={handleInputChange} />
              <MaxTryField enabled={maxTryEnabled} value={maxTry} onToggle={setMaxTryEnabled} onChange={handleInputChange} />
              <PasswordField enabled={passwordEnabled} value={password} onToggle={setPasswordEnabled} onChange={handleInputChange} />
            </>
          )}
          <NegativeMarkingField
            enabled={negEnabled}
            wrong={wrongPerPenalty}
            correct={correctPerPenalty}
            until={negMarkUntil}
            onToggle={setNegEnabled}
            onChange={handleInputChange}
          />
          {!paperMode && (
            <>
              <AntiCheatField enabled={antiEnabled} onToggle={setAntiEnabled} />
              <SolutionPhotosField enabled={solutionPhotosEnabled} onToggle={setSolutionPhotosEnabled} />
            </>
          )}
          {source === "structured" && (
            <StructuredGradingFields
              shuffle={shuffleEnabled}
              partial={partialEnabled}
              onShuffle={setShuffleEnabled}
              onPartial={setPartialEnabled}
            />
          )}
          <ResultVisibility
            showScore={showScore}
            showCorrectAnswers={showCorrectAnswers}
            revealAfterEnd={revealAfterEnd}
            onChange={setField}
          />
        </div>

        <div className="flex justify-end pb-2 lg:col-span-2">
          <Button type="submit" size="lg">
            İmtahanı əlavə et
          </Button>
        </div>
      </form>
    </AccountLayout>
  );
};

export default ExamAdd;
