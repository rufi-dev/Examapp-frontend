import { useState } from "react";
import AccountLayout from "../../components/AccountLayout";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { useDispatch, useSelector } from "react-redux";
import { addExam } from "../../../redux/features/quiz/quizSlice";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import Loader from "../../components/Loader";
import Button from "../../components/ui/Button";
import { Field, inputClass } from "../../components/ui/Field";
import { toUtcIso } from "../../helper/datetime";

const fileInputClass =
  "block w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-text file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:font-semibold file:text-primary-fg hover:file:bg-primary-hover";

const ExamAdd = () => {
  useRedirectLoggedOutUser("/login");
  const { isLoading } = useSelector((state) => state.quiz);
  const cloud_name = import.meta.env.VITE_CLOUD_NAME;
  const upload_preset = import.meta.env.VITE_UPLAD_PRESET;
  const [pdf, setPdf] = useState(null);

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
  } = examForm;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setExamForm({ ...examForm, [name]: value });
  };

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
        pdfForm.append("cloud_name", cloud_name);
        pdfForm.append("upload_preset", upload_preset);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
          { method: "post", body: pdfForm }
        );
        const pdfData = await response.json();
        pdfUrl = pdfData.secure_url?.toString();
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
      examData.append("pdf", pdfUrl);

      const addExamData = await dispatch(addExam({ examData, classId }));

      if (addExamData.type !== "quiz/addExam/rejected") {
        navigate("/exam/" + classId);
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
        </div>

        <Button type="submit" className="mt-8">
          İmtahanı əlavə et
        </Button>
      </form>
    </AccountLayout>
  );
};

export default ExamAdd;
