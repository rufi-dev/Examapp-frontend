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
import ResultVisibility from "../../components/ui/ResultVisibility";
import PasswordField from "../../components/ui/PasswordField";
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
      examData.append("price", price);
      examData.append("videoLink", videoLink);
      examData.append("passingMarks", passingMarks);
      examData.append("totalMarks", totalMarks);
      examData.append("maxTry", maxTry);
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

  return (
    <AccountLayout title="İmtahan əlavə et" subtitle="Yeni sınaq imtahanı yarat.">
      <form
        onSubmit={addExamForm}
        className="rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="PDF fayl" htmlFor="pdf" className="md:col-span-2">
            <input
              type="file"
              id="pdf"
              name="pdf"
              accept="application/pdf"
              onChange={handlePdfChange}
              className={fileInputClass}
            />
          </Field>

          <Field label="İmtahan adı" htmlFor="name" className="md:col-span-2">
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

          <Field label="Müddət (saniyə)" htmlFor="duration">
            <input
              value={duration}
              onChange={handleInputChange}
              type="number"
              id="duration"
              name="duration"
              className={inputClass}
            />
          </Field>

          <Field label="Qiymət" htmlFor="price">
            <input
              value={price}
              onChange={handleInputChange}
              type="number"
              id="price"
              name="price"
              className={inputClass}
            />
          </Field>

          <Field label="Video link" htmlFor="videoLink" className="md:col-span-2">
            <input
              value={videoLink}
              onChange={handleInputChange}
              type="url"
              id="videoLink"
              name="videoLink"
              className={inputClass}
              placeholder="https://"
            />
          </Field>

          <Field label="Başlanma tarixi" htmlFor="startDate">
            <input
              value={startDate || ""}
              onChange={handleInputChange}
              type="datetime-local"
              id="startDate"
              name="startDate"
              className={inputClass}
            />
          </Field>

          <Field label="Bitmə tarixi" htmlFor="endDate">
            <input
              value={endDate || ""}
              onChange={handleInputChange}
              type="datetime-local"
              id="endDate"
              name="endDate"
              className={inputClass}
            />
          </Field>

          <Field label="Ümumi bal" htmlFor="totalMarks">
            <input
              value={totalMarks}
              onChange={handleInputChange}
              type="number"
              id="totalMarks"
              name="totalMarks"
              className={inputClass}
            />
          </Field>

          <Field label="Keçid balı" htmlFor="passingMarks">
            <input
              value={passingMarks}
              onChange={handleInputChange}
              type="number"
              name="passingMarks"
              id="passingMarks"
              className={inputClass}
            />
          </Field>

          <Field label="Maksimum cəhd sayı" htmlFor="maxTry" hint="0 = limitsiz">
            <input
              value={maxTry}
              onChange={handleInputChange}
              type="number"
              name="maxTry"
              id="maxTry"
              className={inputClass}
            />
          </Field>

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
        </div>

        <Button type="submit" className="mt-8">
          İmtahanı əlavə et
        </Button>
      </form>
    </AccountLayout>
  );
};

export default ExamAdd;
