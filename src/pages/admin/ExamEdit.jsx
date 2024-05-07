import React, { useEffect, useState } from "react";
import { HiUsers } from "react-icons/hi";
import { BiSolidUserCheck, BiUserMinus, BiUserX } from "react-icons/bi";
import { AiFillDelete } from "react-icons/ai";
import PageMenu from "../../components/PageMenu";
import Categories from "../../components/Categories";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { useDispatch, useSelector } from "react-redux";
import {
  getTags,
  addExam,
  getTag,
  getExam,
  editExam,
} from "../../../redux/features/quiz/quizSlice";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import { BsCheckLg } from "react-icons/bs";

const ExamEdit = () => {
  const dispatch = useDispatch();
  const cloud_name = import.meta.env.VITE_CLOUD_NAME;
  const upload_preset = import.meta.env.VITE_UPLAD_PRESET;
  const [pdf, setPdf] = useState(null);

  useRedirectLoggedOutUser("/login");
  const { tags, isLoading, isSuccess, isError, singleExam } = useSelector(
    (state) => state.quiz
  );
  const navigate = useNavigate();
  const { examId } = useParams();
  useEffect(() => {
    dispatch(getExam(examId));
    dispatch(getTags());
  }, [dispatch, examId]);

  const initialState = {
    name: "",
    duration: 0,
    pdfPath: null,
    price: 0,
    videoLink: null,
    pdfPath:null,
    totalMarks: 0,
    passingMarks: 0,
    startDate: null,
    endDate: null,
    // tag: { id: singleExam?.classes?.map((_class) => _class._id) },
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
  } = examForm;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setExamForm({ ...examForm, [name]: value });
  };
  useEffect(() => {
    if (singleExam) {
        console.log(singleExam)
      setExamForm({
        name: singleExam.name || "",
        duration: singleExam.duration || 0,
        price: singleExam.price || 0,
        videoLink: singleExam.videoLink || null,
        startDate: singleExam.startDate ? new Date(singleExam.startDate).toISOString().slice(0, 16) : null,
      endDate: singleExam.endDate ? new Date(singleExam.endDate).toISOString().slice(0, 16) : null,
        pdfPath: singleExam.pdf.path || null,
        totalMarks: singleExam.totalMarks || 0,
        passingMarks: singleExam.passingMarks || 0,
        // class: singleExam?.classes?.map((_class) => _class._id)[0] || null,
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
        pdfForm.append("cloud_name", cloud_name);
        pdfForm.append("upload_preset", upload_preset);

        // Save image to cloudinary
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
          { method: "post", body: pdfForm }
        );
        const pdfData = await response.json();
        pdfUrl = pdfData.secure_url.toString();
      }
      const examData = {
        name,
        duration,
        price,
        videoLink,
        startDate,
        endDate,
        passingMarks,
        totalMarks,
        pdfPath: pdfUrl || singleExam.pdf.path,
      };
      console.log(examData)
      if (name && duration && pdfPath && passingMarks && totalMarks) {
        console.log(examData);
        const editExamData = await dispatch(editExam({ examData, examId }));

        if (editExamData.type != "quiz/editExam/rejected") {
          navigate(-1);
        }
      } else {
        toast.error("All fields are required");
      }
    } catch (error) {
      toast.error(error.message);
      console.log(error);
    }
  };
  const handlePdfChange = (e) => {
    setPdf(e.target.files[0]);
  };
  return (
    <div className="bg-gray-50  flex justify-center py-[200px]">
      <div className="w-full max-w-[1240px] bg-white p-8 rounded-md shadow-md">
        <form onSubmit={editExamForm}>
          <div className="mb-4">
            <label
              className="block text-sm font-medium text-gray-700"
              htmlFor="pdf"
            >
              PDF File:
            </label>
            <input
              type="file"
              id="pdf"
              name="pdf"
              accept="application/pdf"
              onChange={handlePdfChange}
              className="mt-1 block w-full border-gray-300 outline-none border px-2 py-1 shadow-sm"
            />
          </div>
          <div className="mb-4">
            <label
              className="block text-sm font-medium text-gray-700"
              htmlFor="name"
            >
              Name:
            </label>
            <input
              value={name}
              onChange={handleInputChange}
              type="text"
              name="name"
              id="name"
              className="mt-1 block w-full border-gray-300 outline-none border px-2 py-1 shadow-sm"
            />
          </div>
          <div className="mb-4">
            <label
              className="block text-sm font-medium text-gray-700"
              htmlFor="duration"
            >
              Duration:
            </label>
            <input
              value={duration}
              onChange={handleInputChange}
              type="number"
              id="duration"
              name="duration"
              className="mt-1 block w-full border-gray-300 outline-none border px-2 py-1 shadow-sm"
            />
          </div>
          <div className="mb-4">
            <label
              className="block text-sm font-medium text-gray-700"
              htmlFor="price"
            >
              Price:
            </label>
            <input
              value={price}
              onChange={handleInputChange}
              type="number"
              id="price"
              name="price"
              className="mt-1 block w-full border-gray-300 outline-none border px-2 py-1 shadow-sm"
            />
          </div>
          {/* <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700" htmlFor="dedline">
                            Dedline:
                        </label>
                        <input
                            value={dedline}
                            onChange={handleInputChange}
                            type="date"
                            id="dedline"
                            name='dedline'
                            className="mt-1 block w-full border-gray-300 outline-none border px-2 py-1 shadow-sm"
                        />
                    </div> */}
          <div className="mb-4">
            <label
              className="block text-sm font-medium text-gray-700"
              htmlFor="startDate"
            >
              Başlama Vaxtı:
            </label>
            <input
              value={startDate}
              onChange={handleInputChange}
              type="datetime-local"
              id="startDate"
              name="startDate"
              className="mt-1 block w-full border-gray-300 outline-none border px-2 py-1 shadow-sm"
            />
          </div>
          <div className="mb-4">
            <label
              className="block text-sm font-medium text-gray-700"
              htmlFor="endDate"
            >
              Bitmə Vaxtı:
            </label>
            <input
              value={endDate}
              onChange={handleInputChange}
              type="datetime-local"
              name="endDate"
              id="endDate"
              className="mt-1 block w-full border-gray-300 outline-none border px-2 py-1 shadow-sm"
            />
          </div>
          <div className="mb-4">
            <label
              className="block text-sm font-medium text-gray-700"
              htmlFor="videoLink"
            >
              Video Linki:
            </label>
            <input
              value={videoLink}
              onChange={handleInputChange}
              type="url"
              name="videoLink"
              id="videoLink"
              className="mt-1 block w-full border-gray-300 outline-none border px-2 py-1 shadow-sm"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-200 focus:ring-opacity-50"
          >
            Edit Exam
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExamEdit;
