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
import { toUtcIso } from "../../helper/datetime";

const fileInputClass =
  "block w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-text file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:font-semibold file:text-primary-fg hover:file:bg-primary-hover";

const ExamAdd = () => {
  useRedirectLoggedOutUser("/login");
  const { isLoading } = useSelector((state) => state.quiz);
  const cloud_name = import.meta.env.VITE_CLOUD_NAME;
  const upload_preset = import.meta.env.VITE_UPLAD_PRESET;
  const [pdf, setPdf] = useState(null);
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [maxTryEnabled, setMaxTryEnabled] = useState(false);
  const [priceEnabled, setPriceEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);

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
    password,
  } = examForm;

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
      examData.append("pdf", pdfUrl);

      const addExamData = await dispatch(addExam({ examData, classId }));

      if (addExamData.type !== "quiz/addExam/rejected") {
        // Jump straight into the question builder for the new exam so the
        // teacher can add questions + correct answers right away.
        const newExamId = addExamData.payload?.data?._id;
        navigate(newExamId ? `/exam/${newExamId}/addQuestion` : "/exam/" + classId);
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
      <form onSubmit={addExamForm} className="mx-auto max-w-3xl space-y-6">
        <FormSection title="İmtahan məlumatı">
          <div className="space-y-5">
            <Field label="İmtahan adı" htmlFor="name">
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
            <Field label="PDF fayl" htmlFor="pdf" hint="İmtahan sualları (PDF)">
              <input type="file" id="pdf" name="pdf" accept="application/pdf" onChange={handlePdfChange} className={fileInputClass} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Vaxt və müddət">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Müddət (saniyə)" htmlFor="duration" hint={minuteHint}>
              <input value={duration} onChange={handleInputChange} type="number" id="duration" name="duration" className={inputClass} />
            </Field>
            <div className="hidden sm:block" />
            <Field label="Başlanma tarixi" htmlFor="startDate">
              <input value={startDate || ""} onChange={handleInputChange} type="datetime-local" id="startDate" name="startDate" className={inputClass} />
            </Field>
            <Field label="Bitmə tarixi" htmlFor="endDate">
              <input value={endDate || ""} onChange={handleInputChange} type="datetime-local" id="endDate" name="endDate" className={inputClass} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Qiymətləndirmə">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Ümumi bal" htmlFor="totalMarks">
              <input value={totalMarks} onChange={handleInputChange} type="number" id="totalMarks" name="totalMarks" className={inputClass} />
            </Field>
            <Field label="Keçid balı" htmlFor="passingMarks">
              <input value={passingMarks} onChange={handleInputChange} type="number" name="passingMarks" id="passingMarks" className={inputClass} />
            </Field>
          </div>
        </FormSection>

        <VideoLinkField
          enabled={videoEnabled}
          value={videoLink}
          onToggle={setVideoEnabled}
          onChange={handleInputChange}
        />

        <PriceField
          enabled={priceEnabled}
          value={price}
          onToggle={setPriceEnabled}
          onChange={handleInputChange}
        />

        <MaxTryField
          enabled={maxTryEnabled}
          value={maxTry}
          onToggle={setMaxTryEnabled}
          onChange={handleInputChange}
        />

        <PasswordField
          enabled={passwordEnabled}
          value={password}
          onToggle={setPasswordEnabled}
          onChange={handleInputChange}
        />

        <ResultVisibility
          showScore={showScore}
          showCorrectAnswers={showCorrectAnswers}
          revealAfterEnd={revealAfterEnd}
          onChange={setField}
        />

        <div className="flex justify-end pb-2">
          <Button type="submit" size="lg">
            İmtahanı əlavə et
          </Button>
        </div>
      </form>
    </AccountLayout>
  );
};

export default ExamAdd;
