import { useEffect, useLayoutEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addExamToUser,
  deleteExam,
  getExamsByClass,
  getExamsByUser,
} from "../../redux/features/quiz/quizSlice";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageMenu from "./PageMenu";
import Loader from "./Loader";
import { MdOutlineModeEditOutline } from "react-icons/md";
import { AdminTeacherLink } from "./protect/hiddenLink";
import { AiFillDelete, AiOutlinePlus } from "react-icons/ai";
import Spinner from "./Spinner";
import { motion } from "framer-motion";
import { payExam } from "../../redux/features/stripe/stripeSlice";

const ExamList = ({ classId }) => {
  const dispatch = useDispatch();
  const { exams, myExams, isLoading, isSuccess } = useSelector(
    (state) => state.quiz
  );
  const { user } = useSelector((state) => state.auth);
  useEffect(() => {
    dispatch(getExamsByClass(classId));
    dispatch(getExamsByUser());
  }, [dispatch]);

  const handleDelete = async (examId) => {
    await dispatch(deleteExam(examId));
    await dispatch(getExamsByClass(classId));
  };
  const addExam = async (e, exam) => {
    e.preventDefault();
    await dispatch(payExam({ exam, userId: user._id }));
    await dispatch(addExamToUser(exam._id));
    // await dispatch(getExamsByTag(id))
  };

  if (isLoading) {
    return <Loader />;
  }
  return (
    <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-5">
      {exams &&
        exams.map((exam, index) => (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.2 }}
            key={exam._id}
            className="bg-white border px-4 py-5 rounded-lg shadow-lg"
          >
            <div className="flex justify-between">
              <h1 className="font-bold">{exam.name}</h1>
              <div className="flex gap-4 items-center">
                <AdminTeacherLink>
                  <Link
                    to={`/exam/${exam._id}/resultsByExam`}
                    className="text-[blue] text-[20px]"
                  >
                    N
                  </Link>
                  <Link
                    to={`/exam/${exam._id}/addQuestion`}
                    className="text-[orange] text-[20px]"
                  >
                    <AiOutlinePlus />
                  </Link>
                  <Link
                    to={`/exam/edit/${exam._id}`}
                    className="text-[orange] text-[20px]"
                  >
                    <MdOutlineModeEditOutline />
                  </Link>
                  <button
                    onClick={() => handleDelete(exam._id)}
                    className="text-[red] text-[20px]"
                  >
                    <AiFillDelete />
                  </button>
                </AdminTeacherLink>
              </div>
            </div>
            <div className="text-sm font-bold text-[#666] mt-2">
              <i className="fa-solid fa-hourglass"></i>
              <span className="ml-2">
                {" "}
                {`${Math.floor(exam.duration / 60)} dəqiqə ${
                  exam.duration % 60
                } saniyə`}
              </span>
            </div>
            <p className="font-bold text-sm mt-3">Ətraflı</p>

            <ul className="text-sm list-disc px-6">
              <li>{exam.questions.length} sual</li>
            </ul>
            <hr className="mt-3" />

            <div className="mt-3">
              <ul className="flex gap-2 text-sm flex-wrap text-white">
                {
                  <li
                    key={exam.class._id}
                    className="bg-[#1084da] rounded-full px-2"
                  >
                    {exam.class.level}
                  </li>
                }
              </ul>
            </div>
            {isLoading ? (
              <button
                className="bg-[#6dabe4] w-full mt-6 flex justify-center text-white py-3 px-9 rounded-md text-sm"
                disabled
              >
                <Spinner />
              </button>
            ) : (
              <>
                {myExams.length > 0 &&
                myExams.some((myExam) => myExam._id === exam._id) ? (
                  <Link
                    to={`/exam/details/${exam._id}`}
                    className="flex text-white w-full justify-center bg-[#1084da] rounded-lg py-2 mt-4"
                  >
                    İmtahana Bax
                  </Link>
                ) : (
                  <button
                    onClick={(e) => addExam(e, exam)}
                    className="flex text-white w-full justify-center bg-[#1084da] rounded-lg py-2 mt-4"
                  >
                    İmtahanı əldə et - {exam.price} AZN
                  </button>
                )}
              </>
            )}
          </motion.div>
        ))}
    </div>
  );
};

export default ExamList;
