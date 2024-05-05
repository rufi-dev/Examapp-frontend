import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import {
  reviewResult,
  addPhotoToResult,
} from "../../../redux/features/quiz/resultSlice";
import {
  getExamTagandClass,
  getPdfByExam,
  getQuestionByExam,
} from "../../../redux/features/quiz/quizSlice";
import Loader from "../../components/Loader";
import PdfOpener from "../../components/PdfOpener";
import QuestionType from "../../components/QuestionType";
import ResultCard from "../../components/ResultCard";
import YoutubeVideoEmbed from "../../components/YoutubeVideoEmbed";
import { AdminTeacherLink } from "../../components/protect/hiddenLink";
import { HiOutlinePhotograph } from "react-icons/hi";
import { toast } from "react-toastify";
import PDFPreview from "../../components/PDFPreview";

const cloud_name = import.meta.env.VITE_CLOUD_NAME;
const upload_preset = import.meta.env.VITE_UPLAD_PRESET;

const Review = () => {
  const dispatch = useDispatch();

  const { resultId } = useParams();
  const [imagePreview, setImagePreview] = useState(null);
  const [photo, setPhoto] = useState(null);
  const { review, isLoading } = useSelector((state) => state.result);
  const [pdfData, setPdfData] = useState(null);
  const { singleClass, singleTag, queue } = useSelector((state) => state.quiz);

  const handleImageChange = (e) => {
    setPhoto(e.target.files[0]);
    setImagePreview(URL.createObjectURL(e.target.files[0]));
  };
  const [answers, setAnswers] = useState(
    Array.from({ length: queue?.correctAnswers?.length || 25 }, () => ({
      answer: "",
      type: "",
    }))
  );

  useEffect(() => {
    dispatch(reviewResult(resultId));
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
        const image = new FormData();
        image.append("file", photo); // Use achivementImage here
        image.append("cloud_name", cloud_name);
        image.append("upload_preset", upload_preset);

        // Save image to cloudinary
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
          { method: "post", body: image }
        );

        const imgData = await response.json();
        imageUrl = imgData.url.toString();
      }
      const formData = {
        photo: imageUrl,
      };
      await dispatch(addPhotoToResult({ resultId, formData }));
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
      const updatedAnswers = review.correctAnswers.map((answer) => ({
        answer: answer.answer,
        type: "", // Assuming you need to set the type as well
      }));
      setAnswers(updatedAnswers);
    }
  }, [review]);

  useEffect(() => {
    const fetchData = async () => {
      // Ensure review and review.examId are not undefined
      if (review && review.examId && review.examId._id) {
        await dispatch(getExamTagandClass(review.examId._id));
        const getPdfAction = await dispatch(
          getPdfByExam({ examId: review.examId._id })
        );
        setPdfData(getPdfAction.payload.path);
        showPdf(getPdfAction.payload.path);
      }
    };

    fetchData();
  }, [dispatch, review]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="max-w-[1640px] w-full px-4 mx-auto py-10">
      <div className="mb-10">
        {review.length > 0 && <ResultCard result={review} />}
      </div>
      <div className="flex lg:flex-row flex-col justify-center gap-[50px]">
        <div>
        <PdfOpener pdfFile={pdfData} />
        {/* <PDFPreview pdfPath={pdfData} /> */}

        </div>

        <div className="w-full">
          <div>
            <QuestionType
              answers={answers}
              singleTag={singleTag}
              singleClass={singleClass}
              review={review}
              handleAnswerChange={() => {}}
            />
            {review.examId?.videoLink && (
              <YoutubeVideoEmbed videoLink={review.examId?.videoLink} />
            )}
            {review.photos &&
              review.photos.length > 0 &&
              review.photos.map((photo, index) => (
                <img key={index} src={photo} alt="" />
              ))}
            <AdminTeacherLink>
              <div className="w-full max-w-[1240px] bg-white p-8 shadow-md h-full">
                <form onSubmit={addPhoto}>
                  <div
                    className="rounded-lg max-h-[600px] cursor-pointer relative overflow-y-auto"
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <label
                      htmlFor="imageInput"
                      className="my-8 p-6   w-full h-full flex items-center justify-center rounded-lg border-2 border-dashed border-gray-400 hover:border-blue-500 cursor-pointer"
                    >
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full flex-col">
                          <div className="text-[40px] flex items-center justify-center text-gray-400">
                            <HiOutlinePhotograph />
                          </div>
                          <p className="flex items-center justify-center text-gray-400 font-semibold">
                            Click or drag and drop an image here
                          </p>
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

                  {isLoading ? (
                    <button
                      className="bg-[#6dabe4] w-[120px] flex justify-center text-white py-2 px-4 rounded-md text-sm"
                      disabled
                    >
                      <Spinner />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    >
                      Əlavə et
                    </button>
                  )}
                </form>
              </div>
            </AdminTeacherLink>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Review;
