import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { reviewResult, addPhotoToResult } from "../../../redux/features/quiz/resultSlice";
import { getExamTagandClass, getPdfByExam } from "../../../redux/features/quiz/quizSlice";
import Loader from "../../components/Loader";
import Spinner from "../../components/Spinner";
import PdfOpener from "../../components/PdfOpener";
import QuestionType from "../../components/QuestionType";
import ResultCard from "../../components/ResultCard";
import YoutubeVideoEmbed from "../../components/YoutubeVideoEmbed";
import { AdminTeacherLink } from "../../components/protect/hiddenLink";
import { HiOutlinePhotograph } from "react-icons/hi";
import { toast } from "react-toastify";
import Container from "../../components/ui/Container";
import Button from "../../components/ui/Button";

const cloud_name = import.meta.env.VITE_CLOUD_NAME;
const upload_preset = import.meta.env.VITE_UPLAD_PRESET;

const Review = () => {
  const dispatch = useDispatch();
  const { resultId } = useParams();
  const [imagePreview, setImagePreview] = useState(null);
  const [photo, setPhoto] = useState(null);
  const { review, isLoading } = useSelector((state) => state.result);
  const [pdfData, setPdfData] = useState(null);
  const { singleClass, singleTag } = useSelector((state) => state.quiz);

  const [answers, setAnswers] = useState([]);

  const handleImageChange = (e) => {
    setPhoto(e.target.files[0]);
    setImagePreview(URL.createObjectURL(e.target.files[0]));
  };

  useEffect(() => {
    dispatch(reviewResult(resultId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const addPhoto = async (e) => {
    e.preventDefault();
    let imageUrl;
    try {
      if (
        photo !== null &&
        (photo.type === "image/jpeg" ||
          photo.type === "image/jpg" ||
          photo.type === "image/png")
      ) {
        if (!cloud_name || !upload_preset) {
          return toast.error("Şəkil yükləmə konfiqurasiya olunmayıb (Cloudinary)");
        }
        const image = new FormData();
        image.append("file", photo);
        image.append("cloud_name", cloud_name);
        image.append("upload_preset", upload_preset);
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
          { method: "post", body: image }
        );
        const imgData = await response.json();
        imageUrl = (imgData.secure_url || imgData.url)?.toString();
      }
      await dispatch(addPhotoToResult({ resultId, formData: { photo: imageUrl } }));
      await dispatch(reviewResult(review._id));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const imageFile = e.dataTransfer.files[0];
    if (
      imageFile &&
      (imageFile.type === "image/jpeg" ||
        imageFile.type === "image/jpg" ||
        imageFile.type === "image/png")
    ) {
      setPhoto(imageFile);
      setImagePreview(URL.createObjectURL(imageFile));
    }
  };

  useEffect(() => {
    if (review && review.correctAnswers) {
      setAnswers(review.correctAnswers.map((a) => ({ answer: a.answer, type: a.type || "" })));
    }
  }, [review]);

  useEffect(() => {
    const fetchData = async () => {
      if (review && review.examId && review.examId._id) {
        await dispatch(getExamTagandClass(review.examId._id));
        const getPdfAction = await dispatch(getPdfByExam({ examId: review.examId._id }));
        setPdfData(getPdfAction.payload.path);
      }
    };
    fetchData();
  }, [dispatch, review]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <section className="py-10">
      <Container>
        <h1 className="mb-6 font-display text-3xl font-bold text-text">Cavabların təhlili</h1>

        {review && review._id && (
          <div className="mb-8">
            <ResultCard result={review} />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex h-[80vh] min-w-0 flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-soft lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]">
            <div className="border-b border-line px-5 py-3 text-sm font-semibold text-muted">
              İmtahan sualları (PDF)
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
              <PdfOpener pdfFile={pdfData} />
            </div>
          </div>

          <div className="min-w-0">
            {review?.correctAnswers?.length ? (
              <div className="rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8">
                <QuestionType
                  answers={answers}
                  singleTag={singleTag}
                  singleClass={singleClass}
                  review={review}
                  questions={review?.correctAnswers?.map((q) => ({
                    type: q.type,
                    options: q.options,
                  }))}
                  handleAnswerChange={() => {}}
                />
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-line bg-surface p-8 text-center text-muted">
                Düzgün cavablar hələ açıqlanmayıb. Müəllim açıqladıqdan sonra burada görünəcək.
              </div>
            )}

            {review?.examId?.videoLink && (
              <div className="mt-6">
                <h2 className="mb-3 font-display text-lg font-bold text-text">Video həll</h2>
                <YoutubeVideoEmbed videoLink={review.examId?.videoLink} />
              </div>
            )}

            {review?.photos?.length > 0 && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {review.photos.map((p, i) => (
                  <img key={i} src={p} alt="" className="w-full rounded-2xl border border-line" />
                ))}
              </div>
            )}

            <AdminTeacherLink>
              <div className="mt-6 rounded-3xl border border-line bg-surface p-6 shadow-soft">
                <h2 className="mb-3 font-display text-lg font-bold text-text">Yazı işi əlavə et</h2>
                <form onSubmit={addPhoto}>
                  <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
                    <label
                      htmlFor="imageInput"
                      className="flex min-h-[180px] cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-line p-6 transition-colors hover:border-primary/50"
                    >
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt=""
                          className="max-h-[400px] w-full rounded-xl object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted">
                          <HiOutlinePhotograph className="text-4xl" />
                          <p className="font-medium">Şəkli bura sürüklə və ya kliklə</p>
                        </div>
                      )}
                    </label>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      id="imageInput"
                      name="image"
                      onChange={handleImageChange}
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="mt-4">
                    {isLoading ? <Spinner /> : "Əlavə et"}
                  </Button>
                </form>
              </div>
            </AdminTeacherLink>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Review;
