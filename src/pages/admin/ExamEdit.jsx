import { useEffect, useState } from "react";
import axios from "axios";
import AccountLayout from "../../components/AccountLayout";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { useDispatch, useSelector } from "react-redux";
import { getTags, getExam, editExam } from "../../../redux/features/quiz/quizSlice";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import { Field, inputClass } from "../../components/ui/Field";
import ResultVisibility from "../../components/ui/ResultVisibility";
import { toLocalInput, toUtcIso } from "../../helper/datetime";

const fileInputClass =
  "block w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-text file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:font-semibold file:text-primary-fg hover:file:bg-primary-hover";

const ExamEdit = () => {
  const dispatch = useDispatch();
  const cloud_name = import.meta.env.VITE_CLOUD_NAME;
  const upload_preset = import.meta.env.VITE_UPLAD_PRESET;
  const [pdf, setPdf] = useState(null);

  useRedirectLoggedOutUser("/login");
  const { singleExam } = useSelector((state) => state.quiz);
  const navigate = useNavigate();
  const { examId } = useParams();

  useEffect(() => {
    dispatch(getExam(examId));
    dispatch(getTags());
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
      });
    }
  }, [singleExam]);

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
        price,
        videoLink,
        startDate: toUtcIso(startDate),
        endDate: toUtcIso(endDate),
        passingMarks,
        totalMarks,
        maxTry,
        showScore,
        showCorrectAnswers,
        revealAfterEnd,
        pdfPath: pdfUrl || singleExam.pdf?.path,
      };
      if (name && duration && pdfPath && passingMarks && totalMarks) {
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

  return (
    <AccountLayout title="İmtahanı redaktə et" subtitle="İmtahan məlumatlarını yenilə.">
      <form
        onSubmit={editExamForm}
        className="rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="PDF fayl (dəyişmək üçün seç)" htmlFor="pdf" className="md:col-span-2">
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
            <input value={name} onChange={handleInputChange} type="text" name="name" id="name" className={inputClass} />
          </Field>
          <Field label="Müddət (saniyə)" htmlFor="duration">
            <input value={duration} onChange={handleInputChange} type="number" id="duration" name="duration" className={inputClass} />
          </Field>
          <Field label="Qiymət" htmlFor="price">
            <input value={price} onChange={handleInputChange} type="number" id="price" name="price" className={inputClass} />
          </Field>
          <Field label="Video link" htmlFor="videoLink" className="md:col-span-2">
            <input value={videoLink || ""} onChange={handleInputChange} type="url" id="videoLink" name="videoLink" className={inputClass} />
          </Field>
          <Field label="Başlanma tarixi" htmlFor="startDate">
            <input value={startDate || ""} onChange={handleInputChange} type="datetime-local" id="startDate" name="startDate" className={inputClass} />
          </Field>
          <Field label="Bitmə tarixi" htmlFor="endDate">
            <input value={endDate || ""} onChange={handleInputChange} type="datetime-local" id="endDate" name="endDate" className={inputClass} />
          </Field>
          <Field label="Ümumi bal" htmlFor="totalMarks">
            <input value={totalMarks} onChange={handleInputChange} type="number" id="totalMarks" name="totalMarks" className={inputClass} />
          </Field>
          <Field label="Keçid balı" htmlFor="passingMarks">
            <input value={passingMarks} onChange={handleInputChange} type="number" name="passingMarks" id="passingMarks" className={inputClass} />
          </Field>
          <Field label="Maksimum cəhd sayı" htmlFor="maxTry" hint="0 = limitsiz">
            <input value={maxTry} onChange={handleInputChange} type="number" name="maxTry" id="maxTry" className={inputClass} />
          </Field>

          <ResultVisibility
            showScore={showScore}
            showCorrectAnswers={showCorrectAnswers}
            revealAfterEnd={revealAfterEnd}
            onChange={setField}
          />
        </div>
        <Button type="submit" className="mt-8">
          Yadda saxla
        </Button>
      </form>
    </AccountLayout>
  );
};

export default ExamEdit;
