import { useEffect, useState } from "react";
import axios from "axios";
import AccountLayout from "../../components/AccountLayout";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { useDispatch, useSelector } from "react-redux";
import { getExam, editExam } from "../../../redux/features/quiz/quizSlice";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Spinner from "../../components/Spinner";
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
import { toLocalInput, toUtcIso } from "../../helper/datetime";
import { HiOutlinePhotograph } from "react-icons/hi";
import { FiX, FiFileText } from "react-icons/fi";

const fileInputClass =
  "block w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-text file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:font-semibold file:text-primary-fg hover:file:bg-primary-hover";

const ExamEdit = () => {
  const dispatch = useDispatch();
  const cloud_name = import.meta.env.VITE_CLOUD_NAME;
  const upload_preset = import.meta.env.VITE_UPLAD_PRESET;
  const [pdf, setPdf] = useState(null);
  const [uploadingSolution, setUploadingSolution] = useState(false);
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [maxTryEnabled, setMaxTryEnabled] = useState(false);
  const [priceEnabled, setPriceEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [negEnabled, setNegEnabled] = useState(false);
  const [antiEnabled, setAntiEnabled] = useState(false);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [partialEnabled, setPartialEnabled] = useState(false);
  const [solutionPhotosEnabled, setSolutionPhotosEnabled] = useState(false);

  useRedirectLoggedOutUser("/login");
  const { singleExam } = useSelector((state) => state.quiz);
  const isStructured = singleExam?.mode === "structured";
  const navigate = useNavigate();
  const { examId } = useParams();

  useEffect(() => {
    dispatch(getExam(examId));
  }, [dispatch, examId]);

  const initialState = {
    name: "",
    duration: 0,
    price: 0,
    videoLink: null,
    pdfPath: null,
    totalMarks: 0,
    passingMarks: 0,
    maxTry: 0,
    startDate: null,
    endDate: null,
    showScore: true,
    showCorrectAnswers: false,
    revealAfterEnd: false,
    solutionPhotos: [],
    password: "",
    wrongPerPenalty: 3,
    correctPerPenalty: 1,
  };
  const [examForm, setExamForm] = useState(initialState);
  const {
    name,
    duration,
    videoLink,
    price,
    startDate,
    endDate,
    pdfPath,
    passingMarks,
    totalMarks,
    maxTry,
    showScore,
    showCorrectAnswers,
    revealAfterEnd,
    solutionPhotos,
    password,
    wrongPerPenalty,
    correctPerPenalty,
  } = examForm;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setExamForm({ ...examForm, [name]: type === "checkbox" ? checked : value });
  };
  const setField = (name, value) => setExamForm((f) => ({ ...f, [name]: value }));

  useEffect(() => {
    if (singleExam) {
      setExamForm({
        name: singleExam.name || "",
        duration: singleExam.duration || 0,
        price: singleExam.price || 0,
        videoLink: singleExam.videoLink || "",
        startDate: toLocalInput(singleExam.startDate),
        endDate: toLocalInput(singleExam.endDate),
        pdfPath: singleExam.pdf?.path || null,
        totalMarks: singleExam.totalMarks || 0,
        passingMarks: singleExam.passingMarks || 0,
        maxTry: singleExam.maxTry || 0,
        showScore: singleExam.showScore ?? true,
        showCorrectAnswers: singleExam.showCorrectAnswers ?? false,
        revealAfterEnd: singleExam.revealAfterEnd ?? false,
        solutionPhotos: singleExam.solutionPhotos || [],
        password: singleExam.password || "",
        wrongPerPenalty: singleExam.wrongPerPenalty || 3,
        correctPerPenalty: singleExam.correctPerPenalty || 1,
      });
      setPasswordEnabled(!!singleExam.password);
      setMaxTryEnabled((singleExam.maxTry || 0) > 0);
      setPriceEnabled((singleExam.price || 0) > 0);
      setVideoEnabled(!!singleExam.videoLink);
      setNegEnabled(!!singleExam.negativeMarking);
      setAntiEnabled(!!singleExam.antiCheat);
      setShuffleEnabled(!!singleExam.shuffleOptions);
      setSolutionPhotosEnabled(!!singleExam.studentSolutionPhotos);
      setPartialEnabled(!!singleExam.partialCredit);
    }
  }, [singleExam]);

  // Upload one image to Cloudinary, return its hosted URL.
  const uploadToCloudinary = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("cloud_name", cloud_name);
    fd.append("upload_preset", upload_preset);
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
      { method: "post", body: fd }
    );
    const data = await res.json();
    return (data.secure_url || data.url)?.toString();
  };

  const handleSolutionUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // let the same file be picked again later
    if (!files.length) return;
    if (!cloud_name || !upload_preset) {
      return toast.error("Şəkil yükləmə konfiqurasiya olunmayıb (Cloudinary)");
    }
    const valid = files.filter((f) =>
      ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(f.type)
    );
    if (!valid.length) return toast.error("Yalnız şəkil faylı yükləyin");
    setUploadingSolution(true);
    try {
      const urls = [];
      for (const f of valid) {
        const url = await uploadToCloudinary(f);
        if (url) urls.push(url);
      }
      setExamForm((prev) => ({
        ...prev,
        solutionPhotos: [...(prev.solutionPhotos || []), ...urls],
      }));
    } catch {
      toast.error("Şəkil yüklənmədi");
    } finally {
      setUploadingSolution(false);
    }
  };

  const removeSolutionPhoto = (idx) =>
    setExamForm((prev) => ({
      ...prev,
      solutionPhotos: (prev.solutionPhotos || []).filter((_, i) => i !== idx),
    }));

  const editExamForm = async (e) => {
    e.preventDefault();
    let pdfUrl;
    try {
      if (pdf !== null && pdf.type === "application/pdf") {
        const pdfForm = new FormData();
        pdfForm.append("file", pdf);
        const upRes = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/quiz/uploadPdf`,
          pdfForm
        );
        pdfUrl = upRes.data?.url;
        if (!pdfUrl) return toast.error("PDF yüklənmədi");
      }
      const examData = {
        name,
        duration,
        // Off = free / no video.
        price: priceEnabled ? Number(price) || 0 : 0,
        videoLink: videoEnabled ? videoLink : "",
        startDate: toUtcIso(startDate),
        endDate: toUtcIso(endDate),
        passingMarks,
        totalMarks,
        // 0 = unlimited tries.
        maxTry: maxTryEnabled ? Number(maxTry) || 0 : 0,
        showScore,
        showCorrectAnswers,
        revealAfterEnd,
        solutionPhotos,
        // Empty string disables the password gate.
        password: passwordEnabled ? password : "",
        negativeMarking: negEnabled,
        wrongPerPenalty,
        correctPerPenalty,
        antiCheat: antiEnabled,
        partialCredit: partialEnabled,
        shuffleOptions: shuffleEnabled,
        studentSolutionPhotos: solutionPhotosEnabled,
        // Only send a path when a new PDF was uploaded (so the old file is
        // replaced/deleted, and untouched edits keep the existing PDF).
        pdfPath: pdfUrl,
      };
      // Structured exams have no PDF, so don't require one to save.
      const ready = name && duration && passingMarks && totalMarks && (isStructured || pdfPath);
      if (ready) {
        const editExamData = await dispatch(editExam({ examData, examId }));
        if (editExamData.type != "quiz/editExam/rejected") {
          navigate(-1);
        }
      } else {
        toast.error("Bütün xanaları doldurun");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handlePdfChange = (e) => setPdf(e.target.files[0]);

  const minuteHint = `≈ ${Math.round((Number(duration) || 0) / 60)} dəqiqə`;

  // Wait for THIS exam to load (not stale redux data) before showing the form,
  // so the fields don't flash empty/default values then snap to the real ones.
  if (!singleExam || String(singleExam._id) !== String(examId)) {
    return (
      <AccountLayout title="İmtahanı redaktə et" subtitle="İmtahan məlumatlarını yenilə.">
        <div className="flex justify-center py-24">
          <Spinner size={44} className="text-primary" />
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout title="İmtahanı redaktə et" subtitle="İmtahan məlumatlarını yenilə.">
      <form
        onSubmit={editExamForm}
        className="grid items-start gap-6 lg:grid-cols-2"
      >
        {/* Left: core exam data */}
        <div className="space-y-6">
          <FormSection title="İmtahan məlumatı">
            <div className="space-y-5">
              <Field label="İmtahan adı" htmlFor="name" required>
                <input value={name} onChange={handleInputChange} type="text" name="name" id="name" className={inputClass} />
              </Field>
              {isStructured ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface2/40 px-3.5 py-3 text-sm">
                  <span className="font-medium text-text">Variantlı (manual) imtahan</span>
                  <button
                    type="button"
                    onClick={() => navigate(`/exam/${examId}/build`)}
                    className="font-semibold text-primary hover:underline"
                  >
                    Sualları redaktə et →
                  </button>
                </div>
              ) : (
                <Field label="PDF fayl" htmlFor="pdf" hint="Dəyişmək üçün yeni fayl seçin">
                  <input type="file" id="pdf" name="pdf" accept="application/pdf" onChange={handlePdfChange} className={fileInputClass} />
                  {/* A file input can't be pre-filled by the browser, so show
                      what's already attached (or the freshly picked file). */}
                  {pdf ? (
                    <p className="mt-2 text-xs text-muted">
                      Yeni fayl: <span className="font-semibold text-text">{pdf.name}</span>
                    </p>
                  ) : pdfPath ? (
                    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      <FiFileText className="shrink-0 text-primary" /> Cari PDF:
                      <a
                        href={pdfPath}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-primary hover:underline"
                      >
                        {decodeURIComponent(pdfPath.split("/").pop().split("?")[0])}
                      </a>
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-warning">PDF seçilməyib</p>
                  )}
                </Field>
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

          <FormSection
            title="Həll (yazı işi) şəkilləri"
            description="Bir dəfə əlavə et — bütün şagirdlər nəticə səhifəsində görür."
          >
            <div className="rounded-2xl border border-dashed border-line p-4">
              {solutionPhotos?.length > 0 && (
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {solutionPhotos.map((src, i) => (
                    <div key={i} className="group relative overflow-hidden rounded-xl border border-line">
                      <img src={src} alt="" className="h-32 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeSolutionPhoto(i)}
                        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg bg-black/55 text-white transition-colors hover:bg-danger"
                        aria-label="Sil"
                      >
                        <FiX />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label
                htmlFor="solutionInput"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface2/40 px-4 py-3 text-sm font-semibold text-text transition-colors hover:border-primary/50"
              >
                {uploadingSolution ? (
                  <Spinner size={18} />
                ) : (
                  <>
                    <HiOutlinePhotograph className="text-lg" /> Şəkil əlavə et
                  </>
                )}
              </label>
              <input id="solutionInput" type="file" accept="image/*" multiple className="hidden" onChange={handleSolutionUpload} />
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
            onToggle={setNegEnabled}
            onChange={handleInputChange}
          />
          <AntiCheatField enabled={antiEnabled} onToggle={setAntiEnabled} />
          <SolutionPhotosField
            enabled={solutionPhotosEnabled}
            onToggle={setSolutionPhotosEnabled}
          />
          {isStructured && (
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
            Yadda saxla
          </Button>
        </div>
      </form>
    </AccountLayout>
  );
};

export default ExamEdit;
