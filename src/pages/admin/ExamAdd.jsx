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
import { toUtcIso } from "../../helper/datetime";
import { PRESETS, presetOptions } from "../../helper/examPresets";

const fileInputClass =
  "block w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-text file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:font-semibold file:text-primary-fg hover:file:bg-primary-hover";

const ExamAdd = () => {
  useRedirectLoggedOutUser("/login");
  const { isLoading } = useSelector((state) => state.quiz);
  const cloud_name = import.meta.env.VITE_CLOUD_NAME;
  const upload_preset = import.meta.env.VITE_UPLAD_PRESET;
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
    wrongPerPenalty: 3,
    correctPerPenalty: 1,
    negMarkUntil: 0,
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

  // Selecting a preset pre-fills total marks + negative-marking from its config.
  const applyPreset = (id) => {
    setPreset(id);
    const p = PRESETS[id];
    if (!p) return;
    setExamForm((f) => ({
      ...f,
      totalMarks: p.totalMarks,
      ...(p.negativeMarking
        ? {
            wrongPerPenalty: p.negativeMarking.wrongPerPenalty,
            correctPerPenalty: p.negativeMarking.correctPerPenalty,
            negMarkUntil: p.negativeMarking.untilQuestion,
          }
        : {}),
    }));
    if (p.negativeMarking?.enabled) setNegEnabled(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setExamForm({ ...examForm, [name]: type === "checkbox" ? checked : value });
  };
  const setField = (name, value) => setExamForm((f) => ({ ...f, [name]: value }));

  const dispatch = useDispatch();

  const handlePdfChange = (e) => {
    setPdf(e.target.files[0]);
  };

  const addExamForm = async (e) => {
    e.preventDefault();
    const isStructured = source === "structured";
    let pdfUrl;

    try {
      if (!isStructured) {
        // PDF mode: a PDF is required.
        if (!pdf || pdf.type !== "application/pdf") {
          return toast.error("Zəhmət olmasa PDF fayl seçin");
        }
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
      examData.append("name", name);
      examData.append("duration", duration);
      examData.append("price", priceEnabled ? Number(price) || 0 : 0);
      examData.append("videoLink", videoEnabled ? videoLink : "");
      examData.append("passingMarks", passingMarks);
      examData.append("totalMarks", totalMarks);
      examData.append("maxTry", maxTryEnabled ? Number(maxTry) || 0 : 0);
      examData.append("startDate", toUtcIso(startDate));
      examData.append("endDate", toUtcIso(endDate));
      examData.append("showScore", showScore);
      examData.append("showCorrectAnswers", showCorrectAnswers);
      examData.append("revealAfterEnd", revealAfterEnd);
      examData.append("password", passwordEnabled ? password : "");
      examData.append("negativeMarking", negEnabled);
      examData.append("wrongPerPenalty", wrongPerPenalty);
      examData.append("correctPerPenalty", correctPerPenalty);
      examData.append("negMarkUntil", negEnabled ? Number(negMarkUntil) || 0 : 0);
      examData.append("preset", preset);
      examData.append("antiCheat", antiEnabled);
      examData.append("mode", isStructured ? "structured" : "pdf");
      examData.append("shuffleOptions", isStructured && shuffleEnabled);
      examData.append("partialCredit", isStructured && partialEnabled);
      examData.append("studentSolutionPhotos", solutionPhotosEnabled);
      if (!isStructured) examData.append("pdf", pdfUrl);

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

  const minuteHint = `≈ ${Math.round((Number(duration) || 0) / 60)} dəqiqə`;

  return (
    <AccountLayout title="İmtahan əlavə et" subtitle="Yeni sınaq imtahanı yarat.">
      <form onSubmit={addExamForm} className="grid items-start gap-6 lg:grid-cols-2">
        {/* Left: core exam data */}
        <div className="space-y-6">
          <FormSection title="İmtahan məlumatı">
            <div className="space-y-5">
              <Field label="İmtahan adı" htmlFor="name" required>
                <input
                  value={name}
                  onChange={handleInputChange}
                  type="text"
                  name="name"
                  id="name"
                  className={inputClass}
                  placeholder="Məsələn: Buraxılış sınağı #1"
                />
              </Field>

              <Field label="Sual mənbəyi" hint={source === "pdf" ? "Hazır PDF faylı yüklə" : "Sualları tətbiqdə özün yaz"}>
                <div className="inline-flex w-full rounded-xl border border-line bg-surface p-1">
                  <button
                    type="button"
                    onClick={() => setSource("pdf")}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      source === "pdf" ? "bg-primary text-primary-fg shadow-sm" : "text-muted hover:text-text"
                    }`}
                  >
                    PDF yüklə
                  </button>
                  <button
                    type="button"
                    onClick={() => setSource("structured")}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      source === "structured" ? "bg-primary text-primary-fg shadow-sm" : "text-muted hover:text-text"
                    }`}
                  >
                    Sualları özüm yazım
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
                <Field label="PDF fayl" htmlFor="pdf" required hint="İmtahan sualları (PDF)">
                  <input type="file" id="pdf" name="pdf" accept="application/pdf" onChange={handlePdfChange} className={fileInputClass} />
                </Field>
              ) : (
                <p className="rounded-xl border border-dashed border-line bg-surface px-4 py-3 text-sm text-muted">
                  İmtahanı yaratdıqdan sonra sualları əlavə etmək üçün avtomatik olaraq sual qurğusuna yönləndiriləcəksiniz.
                </p>
              )}
            </div>
          </FormSection>

          <FormSection title="Vaxt və müddət">
            <div className="space-y-5">
              <Field label="Müddət (saniyə)" htmlFor="duration" required hint={minuteHint}>
                <input value={duration} onChange={handleInputChange} type="number" id="duration" name="duration" className={inputClass} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Başlanma tarixi" htmlFor="startDate">
                  <input value={startDate || ""} onChange={handleInputChange} type="datetime-local" id="startDate" name="startDate" className={inputClass} />
                </Field>
                <Field label="Bitmə tarixi" htmlFor="endDate">
                  <input value={endDate || ""} onChange={handleInputChange} type="datetime-local" id="endDate" name="endDate" className={inputClass} />
                </Field>
              </div>
            </div>
          </FormSection>

          <FormSection title="Qiymətləndirmə">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Ümumi bal" htmlFor="totalMarks" required>
                <input value={totalMarks} onChange={handleInputChange} type="number" id="totalMarks" name="totalMarks" className={inputClass} />
              </Field>
              <Field label="Keçid balı" htmlFor="passingMarks" required>
                <input value={passingMarks} onChange={handleInputChange} type="number" name="passingMarks" id="passingMarks" className={inputClass} />
              </Field>
            </div>
          </FormSection>
        </div>

        {/* Right: optional settings + result visibility */}
        <div className="space-y-6">
          <VideoLinkField enabled={videoEnabled} value={videoLink} onToggle={setVideoEnabled} onChange={handleInputChange} />
          <PriceField enabled={priceEnabled} value={price} onToggle={setPriceEnabled} onChange={handleInputChange} />
          <MaxTryField enabled={maxTryEnabled} value={maxTry} onToggle={setMaxTryEnabled} onChange={handleInputChange} />
          <PasswordField enabled={passwordEnabled} value={password} onToggle={setPasswordEnabled} onChange={handleInputChange} />
          <NegativeMarkingField
            enabled={negEnabled}
            wrong={wrongPerPenalty}
            correct={correctPerPenalty}
            until={negMarkUntil}
            onToggle={setNegEnabled}
            onChange={handleInputChange}
          />
          <AntiCheatField enabled={antiEnabled} onToggle={setAntiEnabled} />
          <SolutionPhotosField
            enabled={solutionPhotosEnabled}
            onToggle={setSolutionPhotosEnabled}
          />
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
