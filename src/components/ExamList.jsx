import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getExamsByClass, getExamsByUser } from "../../redux/features/quiz/quizSlice";
import { getResultsByUser } from "../../redux/features/quiz/resultSlice";
import Loader from "./Loader";
import ExamCard from "./ExamCard";

const ExamList = ({ classId }) => {
  const dispatch = useDispatch();
  const { exams } = useSelector((state) => state.quiz);
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve(dispatch(getExamsByClass(classId))).finally(() => {
      if (active) setLoadedOnce(true);
    });
    dispatch(getExamsByUser());
    dispatch(getResultsByUser());
    return () => {
      active = false;
    };
  }, [dispatch, classId]);

  const hasExams = exams && exams.length > 0;
  if (!hasExams && !loadedOnce) return <Loader />;
  if (!hasExams) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center text-muted">
        Hələlik imtahan yoxdur.
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {exams.map((exam, index) => (
        <div
          key={exam._id}
          className="h-full animate-fade-in"
          style={{ animationDelay: `${Math.min(index * 60, 360)}ms` }}
        >
          <ExamCard exam={exam} onChanged={() => dispatch(getExamsByClass(classId))} />
        </div>
      ))}
    </div>
  );
};

export default ExamList;
